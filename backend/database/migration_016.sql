-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 016 — Descuentos 0/1/2 puntos en tarjeta del juez y oficial
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_016.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Migration 015 introdujo descuentos booleanos (1 punto) en la tarjeta del
-- juez. Esta migración los reemplaza por un selector de 0, 1 o 2 puntos:
--
--   * round_scores.deduction_red / deduction_blue : BOOLEAN -> SMALLINT 0/1/2
--   * final_score_red / final_score_blue          : score - deduction
--   * official_round_scores recibe las mismas columnas (deducción + final)
--     para que la Tarjeta Oficial del administrador use la misma lógica.
--   * fn_update_official_card_totals()  pasa a sumar los puntajes FINALES.
--   * fn_calculate_analysis()           compara puntajes FINALES del juez
--     contra los puntajes FINALES de la tarjeta oficial.
--
-- Los puntajes finales nunca pueden quedar por debajo de 1.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. round_scores: deducciones booleanas -> SMALLINT 0/1/2
-- ============================================================

-- La constraint depende de las columnas generadas, se recrea al final.
ALTER TABLE round_scores
    DROP CONSTRAINT IF EXISTS chk_round_final_scores_min;

-- Se quitan las columnas generadas (dependen de deduction_*) para
-- recrearlas con la nueva expresión score - deduction.
ALTER TABLE round_scores
    DROP COLUMN IF EXISTS final_score_red,
    DROP COLUMN IF EXISTS final_score_blue;

-- Conversión: true -> 1, false -> 0
-- Se quitan los defaults booleanos primero (no se castean a SMALLINT).
ALTER TABLE round_scores
    ALTER COLUMN deduction_red  DROP DEFAULT,
    ALTER COLUMN deduction_blue DROP DEFAULT;

ALTER TABLE round_scores
    ALTER COLUMN deduction_red  TYPE SMALLINT USING (CASE WHEN deduction_red  THEN 1 ELSE 0 END),
    ALTER COLUMN deduction_blue TYPE SMALLINT USING (CASE WHEN deduction_blue THEN 1 ELSE 0 END);

ALTER TABLE round_scores
    ALTER COLUMN deduction_red  SET DEFAULT 0,
    ALTER COLUMN deduction_blue SET DEFAULT 0;

ALTER TABLE round_scores
    ADD CONSTRAINT chk_round_deductions
    CHECK (deduction_red IN (0, 1, 2) AND deduction_blue IN (0, 1, 2));

-- Columnas generadas: final = score - deduction
ALTER TABLE round_scores
    ADD COLUMN final_score_red  SMALLINT GENERATED ALWAYS AS (score_red  - deduction_red)  STORED,
    ADD COLUMN final_score_blue SMALLINT GENERATED ALWAYS AS (score_blue - deduction_blue) STORED;

ALTER TABLE round_scores
    ADD CONSTRAINT chk_round_final_scores_min
    CHECK (final_score_red >= 1 AND final_score_blue >= 1);

-- ============================================================
-- 2. official_round_scores: deducciones y puntajes finales
-- ============================================================
ALTER TABLE official_round_scores
    ADD COLUMN deduction_red  SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN deduction_blue SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE official_round_scores
    ADD CONSTRAINT chk_official_round_deductions
    CHECK (deduction_red IN (0, 1, 2) AND deduction_blue IN (0, 1, 2));

ALTER TABLE official_round_scores
    ADD COLUMN final_score_red  SMALLINT GENERATED ALWAYS AS (score_red  - deduction_red)  STORED,
    ADD COLUMN final_score_blue SMALLINT GENERATED ALWAYS AS (score_blue - deduction_blue) STORED;

ALTER TABLE official_round_scores
    ADD CONSTRAINT chk_official_round_final_scores_min
    CHECK (final_score_red >= 1 AND final_score_blue >= 1);

-- ============================================================
-- 3. TRIGGER DE TOTALES OFICIALES: sumar puntajes finales
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_official_card_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_card_id INTEGER;
BEGIN
    v_card_id := COALESCE(NEW.official_card_id, OLD.official_card_id);

    UPDATE official_cards
    SET
        total_score_red = (
            SELECT COALESCE(SUM(final_score_red), 0)
            FROM official_round_scores
            WHERE official_card_id = v_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(final_score_blue), 0)
            FROM official_round_scores
            WHERE official_card_id = v_card_id
        )
    WHERE id = v_card_id;

    -- Asignar ganador automáticamente según los totales recalculados
    UPDATE official_cards oc
    SET winner = CASE fn_calculate_winner(oc.total_score_red, oc.total_score_blue)
        WHEN 'red'  THEN f.boxer_red
        WHEN 'blue' THEN f.boxer_blue
        ELSE NULL
    END
    FROM fights f
    WHERE oc.id = v_card_id AND f.id = oc.fight_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. ANÁLISIS: comparar puntajes finales del juez vs oficial
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

-- ============================================================
-- 5. RECÁLCULO DEFENSIVO de totales existentes
-- ============================================================
UPDATE score_cards sc
SET
    total_score_red = (
        SELECT COALESCE(SUM(final_score_red), 0)
        FROM round_scores rs WHERE rs.score_card_id = sc.id
    ),
    total_score_blue = (
        SELECT COALESCE(SUM(final_score_blue), 0)
        FROM round_scores rs WHERE rs.score_card_id = sc.id
    );

UPDATE official_cards oc
SET
    total_score_red = (
        SELECT COALESCE(SUM(final_score_red), 0)
        FROM official_round_scores ors WHERE ors.official_card_id = oc.id
    ),
    total_score_blue = (
        SELECT COALESCE(SUM(final_score_blue), 0)
        FROM official_round_scores ors WHERE ors.official_card_id = oc.id
    );

COMMIT;
