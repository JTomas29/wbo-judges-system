-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 015 — Descuentos de puntos en la tarjeta del juez
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_015.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- El juez puede aplicar descuentos de puntos por round sobre los
-- puntajes brutos que ya carga (score_red / score_blue). Cada
-- descuento resta exactamente 1 punto al boxeador correspondiente.
--
--   * deduction_red / deduction_blue : BOOLEAN, "se descuenta 1 punto"
--   * final_score_red / final_score_blue : puntaje final del round,
--     calculado SIEMPRE por el servidor (columna generada):
--         final = score - (deduction ? 1 : 0)
--
-- Regla de selección: pueden marcarse 0, 1 o ambos descuentos en un
-- mismo round (el reglamento permite penalizar a ambos boxeadores).
-- El puntaje final de un round nunca puede quedar por debajo de 1.
--
-- Además:
--   * fn_update_score_card_totals() pasa a sumar los puntajes FINALES,
--     por lo que los totales de la tarjeta y el ganador reflejan los
--     descuentos aplicados por el juez.
--   * fn_calculate_analysis() compara los puntajes FINALES del juez
--     contra la tarjeta oficial (el análisis usa los puntajes finales).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COLUMNAS NUEVAS EN round_scores
-- ============================================================
ALTER TABLE round_scores
    ADD COLUMN deduction_red    BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN deduction_blue   BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN final_score_red  SMALLINT GENERATED ALWAYS AS (score_red  - (CASE WHEN deduction_red  THEN 1 ELSE 0 END)) STORED,
    ADD COLUMN final_score_blue SMALLINT GENERATED ALWAYS AS (score_blue - (CASE WHEN deduction_blue THEN 1 ELSE 0 END)) STORED;

-- Los puntajes finales se mantienen dentro del rango mínimo de boxeo
ALTER TABLE round_scores
    ADD CONSTRAINT chk_round_final_scores_min
    CHECK (final_score_red >= 1 AND final_score_blue >= 1);

-- ============================================================
-- 2. TRIGGER DE TOTALES: sumar puntajes finales
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_score_card_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_card_id INTEGER;
BEGIN
    v_card_id := COALESCE(NEW.score_card_id, OLD.score_card_id);

    UPDATE score_cards
    SET
        total_score_red = (
            SELECT COALESCE(SUM(final_score_red), 0)
            FROM round_scores
            WHERE score_card_id = v_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(final_score_blue), 0)
            FROM round_scores
            WHERE score_card_id = v_card_id
        )
    WHERE id = v_card_id;

    -- Asignar ganador automáticamente según los totales recalculados
    UPDATE score_cards sc
    SET winner = CASE fn_calculate_winner(sc.total_score_red, sc.total_score_blue)
        WHEN 'red'  THEN f.boxer_red
        WHEN 'blue' THEN f.boxer_blue
        ELSE NULL
    END
    FROM fights f
    WHERE sc.id = v_card_id AND f.id = sc.fight_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. ANÁLISIS: comparar usando puntajes finales
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

    -- Insertar resultados comparando cada juez contra la tarjeta oficial
    INSERT INTO analysis_results (fight_id, judge_id, official_card_id, total_rounds, matches, errors, match_pct)
    SELECT
        p_fight_id,
        sc.judge_id,
        v_official_card_id,
        COUNT(rs.id)::SMALLINT,
        COUNT(CASE WHEN rs.final_score_red = ors.score_red AND rs.final_score_blue = ors.score_blue THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN rs.final_score_red <> ors.score_red OR rs.final_score_blue <> ors.score_blue THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs.final_score_red = ors.score_red AND rs.final_score_blue = ors.score_blue THEN 1 END) * 100.0
            / NULLIF(COUNT(rs.id), 0),
            2
        )
    FROM score_cards sc
    JOIN round_scores rs ON rs.score_card_id = sc.id
    JOIN official_round_scores ors ON ors.official_card_id = v_official_card_id AND ors.round_number = rs.round_number
    WHERE sc.fight_id = p_fight_id
      AND sc.status = 'finalized'
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

COMMIT;
