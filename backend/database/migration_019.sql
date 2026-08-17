-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 019 — Include Official Judges in Fight Analysis
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_019.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- fn_calculate_analysis y fn_calculate_judge_consistency solo
-- procesaban score_cards (evaluation judges). Los official judges
-- (cuyas tarjetas de papel son ingresadas por el Supervisor en
-- official_judge_cards) quedaban excluidos del análisis.
--
-- Esta migración unifica ambas fuentes de datos mediante un CTE
-- para que TODOS los jueces asignados participen del análisis,
-- manteniendo la distinción entre:
--   - score_cards          → evaluation judges (app)
--   - official_judge_cards → official judges (paper, entered by supervisor)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. fn_calculate_analysis — incluye official_judge_cards
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

    -- Obtener la tarjeta oficial del Supervisor (única por pelea)
    SELECT id INTO v_official_card_id
    FROM official_cards
    WHERE fight_id = p_fight_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Último round efectivamente disputado
    SELECT COALESCE(NULLIF(f.result_round, 0), f.total_rounds)::SMALLINT
    INTO v_effective_rounds
    FROM fights f
    WHERE f.id = p_fight_id;

    -- -------------------------------------------------------
    -- CTE unificado: evaluation judges + official judges
    -- -------------------------------------------------------
    -- Evaluation judges: score_cards + round_scores
    -- Official judges:   official_judge_cards + official_judge_round_scores
    -- Ambos se comparan contra official_round_scores (supervisor reference)
    WITH all_judge_rounds AS (
        -- Evaluation judges: scores from the application
        SELECT
            sc.judge_id,
            rs.round_number,
            rs.final_score_red  AS score_red,
            rs.final_score_blue AS score_blue
        FROM score_cards sc
        JOIN round_scores rs ON rs.score_card_id = sc.id
        WHERE sc.fight_id = p_fight_id
          AND sc.status = 'finalized'
          AND rs.round_number <= v_effective_rounds

        UNION ALL

        -- Official judges: paper cards entered by the supervisor
        SELECT
            ojc.judge_id,
            ojrs.round_number,
            ojrs.final_score_red  AS score_red,
            ojrs.final_score_blue AS score_blue
        FROM official_judge_cards ojc
        JOIN official_judge_round_scores ojrs ON ojrs.official_judge_card_id = ojc.id
        WHERE ojc.fight_id = p_fight_id
          AND ojrs.round_number <= v_effective_rounds
    )
    INSERT INTO analysis_results (fight_id, judge_id, official_card_id, total_rounds, matches, errors, match_pct)
    SELECT
        p_fight_id,
        ajr.judge_id,
        v_official_card_id,
        COUNT(*)::SMALLINT,
        COUNT(CASE WHEN ajr.score_red = ors.final_score_red
                     AND ajr.score_blue = ors.final_score_blue
                THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN ajr.score_red <> ors.final_score_red
                     OR  ajr.score_blue <> ors.final_score_blue
                THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN ajr.score_red = ors.final_score_red
                         AND ajr.score_blue = ors.final_score_blue
                    THEN 1 END) * 100.0
            / NULLIF(COUNT(*), 0),
            2
        )
    FROM all_judge_rounds ajr
    JOIN official_round_scores ors
         ON ors.official_card_id = v_official_card_id
        AND ors.round_number = ajr.round_number
    GROUP BY ajr.judge_id, v_official_card_id
    ON CONFLICT (fight_id, judge_id, official_card_id)
    DO UPDATE SET
        total_rounds = EXCLUDED.total_rounds,
        matches      = EXCLUDED.matches,
        errors       = EXCLUDED.errors,
        match_pct    = EXCLUDED.match_pct;

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

    -- Retornar resultados
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

COMMENT ON FUNCTION fn_calculate_analysis IS
    'Analiza TODOS los jueces asignados (evaluation + official) contra la tarjeta oficial del Supervisor. Evaluation judges provienen de score_cards; official judges provienen de official_judge_cards.';

-- ============================================================
-- 2. fn_calculate_judge_consistency — incluye official judges
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

    -- CTE unificado: misma lógica que fn_calculate_analysis
    WITH all_judge_rounds AS (
        -- Evaluation judges
        SELECT
            sc.judge_id,
            rs.round_number,
            rs.score_red,
            rs.score_blue
        FROM score_cards sc
        JOIN round_scores rs ON rs.score_card_id = sc.id
        WHERE sc.fight_id = p_fight_id
          AND sc.status = 'finalized'
          AND rs.round_number <= v_effective_rounds

        UNION ALL

        -- Official judges
        SELECT
            ojc.judge_id,
            ojrs.round_number,
            ojrs.score_red,
            ojrs.score_blue
        FROM official_judge_cards ojc
        JOIN official_judge_round_scores ojrs ON ojrs.official_judge_card_id = ojc.id
        WHERE ojc.fight_id = p_fight_id
          AND ojrs.round_number <= v_effective_rounds
    )
    INSERT INTO judge_consistency (fight_id, judge_a_id, judge_b_id, matching_rounds, total_rounds, match_pct)
    SELECT
        p_fight_id,
        LEAST(a.judge_id, b.judge_id)  AS judge_a_id,
        GREATEST(a.judge_id, b.judge_id) AS judge_b_id,
        COUNT(CASE WHEN a.score_red = b.score_red
                     AND a.score_blue = b.score_blue
                THEN 1 END)::SMALLINT,
        COUNT(*)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN a.score_red = b.score_red
                         AND a.score_blue = b.score_blue
                    THEN 1 END) * 100.0
            / NULLIF(COUNT(*), 0),
            2
        )
    FROM all_judge_rounds a
    JOIN all_judge_rounds b
         ON b.round_number = a.round_number
        AND b.judge_id > a.judge_id
    GROUP BY LEAST(a.judge_id, b.judge_id), GREATEST(a.judge_id, b.judge_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_judge_consistency IS
    'Compara todos los pares de jueces (evaluation + official) round por round, usando score_red/score_blue de ambas fuentes.';

COMMIT;
