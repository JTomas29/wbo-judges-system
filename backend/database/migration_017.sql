-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 017 — Elimina chk_fights_dates (bloqueaba registrar
--                resultados y finalizar peleas con fecha pasada)
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_017.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- La constraint de tabla `chk_fights_dates (scheduled_date >= CURRENT_DATE)`
-- se revalida sobre la fila COMPLETA en cada UPDATE de PostgreSQL. Como el
-- resultado oficial de una pelea se registra DESPUÉS de disputarse (mismo día
-- o días posteriores), una vez que scheduled_date queda en el pasado, el
-- UPDATE de `registerResult` (y también `complete`/`activate`) fallaba con
-- violación de la constraint, impidiendo cargar el Resultado Oficial
-- (Decisión, KO, TKO, RTD, DQ, NC) con su round de finalización.
--
-- La validación de "la fecha debe ser hoy o posterior" ya está aplicada a
-- nivel de aplicación en fightController (create y update), por lo que esta
-- restricción de base de datos era redundante y contraproducente para el
-- flujo real de resultados.
-- ============================================================

BEGIN;

ALTER TABLE fights
    DROP CONSTRAINT IF EXISTS chk_fights_dates;

COMMIT;

-- ============================================================
-- 2. fn_calculate_analysis — cap por rounds efectivamente disputados
-- ============================================================
-- CONTEXTO
-- --------
-- Cuando una pelea termina de forma anticipada (KO, TKO, RTD, DQ, NC), el
-- resultado oficial queda en fights.result_round (p.ej. KO round 6 de 10).
-- El análisis SOLO debe comparar los rounds efectivamente disputados
-- (1..result_round). Sin el cap, si un juez hubiera puntuado rounds
-- posteriores al de finalización, esos rounds extra entrarían en el conteo
-- de matches/errors y falsearían el match_pct.
--
-- CÓMO SE DETERMINA EL ÚLTIMO ROUND VÁLIDO:
--   effective_rounds = COALESCE(NULLIF(f.result_round, 0), f.total_rounds)
--     - result_round es NULL/0 para DECISIÓN → se analizan los total_rounds.
--     - result_round está definido para finalizaciones anticipadas → se
--       analizan solo los rounds 1..result_round.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calculate_analysis(p_fight_id INTEGER)
RETURNS TABLE (
    judge_name      VARCHAR,
    card_number     SMALLINT,
    total_rounds    SMALLINT,
    matches         SMALLINT,
    errors          SMALLINT,
    match_pct       NUMERIC(5,2)
) AS $$
DECLARE
    rec RECORD;
    v_official_card_id INTEGER;
    v_effective_rounds SMALLINT;
BEGIN
    -- Limpiar resultados previos para esta pelea
    DELETE FROM analysis_results WHERE fight_id = p_fight_id;

    -- Obtener la tarjeta oficial (única por pelea)
    SELECT id INTO v_official_card_id
    FROM official_cards
    WHERE fight_id = p_fight_id;

    -- Si no hay tarjeta oficial, retornar vacío
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Último round efectivamente disputado (cap por result_round)
    SELECT COALESCE(NULLIF(f.result_round, 0), f.total_rounds)::SMALLINT
    INTO v_effective_rounds
    FROM fights f
    WHERE f.id = p_fight_id;

    -- Insertar resultados comparando cada juez contra la tarjeta oficial,
    -- limitando el análisis a los rounds efectivamente disputados
    INSERT INTO analysis_results (fight_id, judge_id, official_card_id, total_rounds, matches, errors, match_pct)
    SELECT
        p_fight_id,
        sc.judge_id,
        v_official_card_id,
        COUNT(rs.id)::SMALLINT,
        COUNT(CASE WHEN rs.final_score_red = ors.final_score_red AND rs.final_score_blue = ors.final_score_blue THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN rs.final_score_red <> ors.final_score_red OR rs.final_score_blue <> ors.final_score_blue THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs.final_score_red = ors.final_score_red AND rs.final_score_blue = ors.final_score_blue THEN 1 END) * 100.0
            / NULLIF(COUNT(rs.id), 0),
            2
        )
    FROM score_cards sc
    JOIN round_scores rs ON rs.score_card_id = sc.id
    JOIN official_round_scores ors ON ors.official_card_id = v_official_card_id AND ors.round_number = rs.round_number
    WHERE sc.fight_id = p_fight_id
      AND sc.status = 'finalized'
      AND rs.round_number <= v_effective_rounds
    GROUP BY sc.judge_id, v_official_card_id
    ON CONFLICT (fight_id, judge_id, official_card_id)
    DO UPDATE SET
        matches = EXCLUDED.matches,
        errors = EXCLUDED.errors,
        match_pct = EXCLUDED.match_pct;

    -- Actualizar estado de la pelea a 'analyzed'
    UPDATE fights SET status = 'analyzed' WHERE id = p_fight_id;

    -- Calcular consistencia inter-jueces
    PERFORM fn_calculate_judge_consistency(p_fight_id);

    -- Actualizar nivel de cada juez que participó en esta pelea
    FOR rec IN
        SELECT DISTINCT ar.judge_id
        FROM analysis_results ar
        WHERE ar.fight_id = p_fight_id
    LOOP
        PERFORM fn_update_judge_level(rec.judge_id);
    END LOOP;

    -- Retornar resultados (card_number es NULL por compatibilidad con modelo anterior)
    RETURN QUERY
    SELECT
        u.name,
        NULL::SMALLINT,
        ar.total_rounds,
        ar.matches,
        ar.errors,
        ar.match_pct
    FROM analysis_results ar
    JOIN users u ON u.id = ar.judge_id
    WHERE ar.fight_id = p_fight_id
    ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_analysis IS 'Analiza cada juez contra la tarjeta oficial limitado a los rounds efectivamente disputados (fights.result_round para finalizaciones anticipadas; total_rounds para decisión).';

-- ============================================================
-- 3. fn_calculate_judge_consistency — cap por rounds disputados
-- ============================================================
-- Compara cada par de jueces SOLO en los rounds efectivamente disputados,
-- aplicando el mismo criterio de último round válido
-- (COALESCE(NULLIF(result_round,0), total_rounds)).
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calculate_judge_consistency(p_fight_id INTEGER)
RETURNS void AS $$
DECLARE
    v_effective_rounds SMALLINT;
BEGIN
    DELETE FROM judge_consistency WHERE fight_id = p_fight_id;

    SELECT COALESCE(NULLIF(f.result_round, 0), f.total_rounds)::SMALLINT
    INTO v_effective_rounds
    FROM fights f
    WHERE f.id = p_fight_id;

    INSERT INTO judge_consistency (fight_id, judge_a_id, judge_b_id, matching_rounds, total_rounds, match_pct)
    SELECT
        p_fight_id,
        LEAST(a.judge_id, b.judge_id) AS judge_a_id,
        GREATEST(a.judge_id, b.judge_id) AS judge_b_id,
        COUNT(CASE WHEN rs_a.score_red = rs_b.score_red
                        AND rs_a.score_blue = rs_b.score_blue
                   THEN 1 END)::SMALLINT,
        COUNT(*)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs_a.score_red = rs_b.score_red
                            AND rs_a.score_blue = rs_b.score_blue
                       THEN 1 END) * 100.0
            / NULLIF(COUNT(*), 0),
            2
        )
    FROM score_cards a
    JOIN score_cards b ON b.fight_id = a.fight_id AND b.judge_id > a.judge_id
    JOIN round_scores rs_a ON rs_a.score_card_id = a.id
    JOIN round_scores rs_b ON rs_b.score_card_id = b.id AND rs_b.round_number = rs_a.round_number
    WHERE a.fight_id = p_fight_id
      AND a.status = 'finalized'
      AND b.status = 'finalized'
      AND rs_a.round_number <= v_effective_rounds
    GROUP BY LEAST(a.judge_id, b.judge_id), GREATEST(a.judge_id, b.judge_id);

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_judge_consistency IS
    'Compara cada par de jueces finalizados en una pelea, round por round,
     limitado a los rounds efectivamente disputados (result_round), y
     almacena el % de rounds donde coinciden exactamente.';
