-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 002 — Auditoría de esquema: Prioridad Alta y Media
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_002.sql
-- ============================================================

-- ============================================================
-- 1. ENUM: fight_status — agregar 'analyzed'
-- ============================================================
-- PG 17 permite ADD VALUE dentro de transacciones, pero se separa por claridad.
ALTER TYPE fight_status ADD VALUE IF NOT EXISTS 'analyzed' AFTER 'completed';

-- ============================================================
-- 2. ENUM: judge_level — nuevo tipo
-- ============================================================
DO $$ BEGIN
    CREATE TYPE judge_level AS ENUM ('elite', 'senior', 'junior');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. TABLA: judge_consistency — nueva
-- ============================================================
CREATE TABLE IF NOT EXISTS judge_consistency (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    judge_a_id      INTEGER          NOT NULL,
    judge_b_id      INTEGER          NOT NULL,
    matching_rounds SMALLINT         NOT NULL DEFAULT 0,
    total_rounds    SMALLINT         NOT NULL DEFAULT 0,
    match_pct       NUMERIC(5,2)     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_jc_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id) ON DELETE CASCADE,
    CONSTRAINT fk_jc_judge_a FOREIGN KEY (judge_a_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_jc_judge_b FOREIGN KEY (judge_b_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT uq_jc_pair UNIQUE (fight_id, judge_a_id, judge_b_id),
    CONSTRAINT chk_jc_judge_order CHECK (judge_a_id < judge_b_id),
    CONSTRAINT chk_jc_values CHECK (
        matching_rounds >= 0 AND total_rounds >= 0
        AND match_pct BETWEEN 0 AND 100
    )
);

CREATE INDEX IF NOT EXISTS idx_jc_fight ON judge_consistency (fight_id);
CREATE INDEX IF NOT EXISTS idx_jc_judge_a ON judge_consistency (judge_a_id);
CREATE INDEX IF NOT EXISTS idx_jc_judge_b ON judge_consistency (judge_b_id);

COMMENT ON TABLE judge_consistency IS
    'Consistencia inter-jueces: compara cada par de jueces en una pelea,
     midiendo en cuántos rounds coinciden sus puntuaciones exactamente.';

-- ============================================================
-- 4. ALTER TABLE: fights — nuevas columnas
-- ============================================================
ALTER TABLE fights
    ADD COLUMN IF NOT EXISTS weight_class        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS min_judges_required INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS notes               TEXT;

COMMENT ON COLUMN fights.weight_class IS 'Categoría de peso (ej: Peso Pesado, Welter, Ligero)';
COMMENT ON COLUMN fights.min_judges_required IS
    'Mínimo de jueces confirmados requeridos para activar la pelea (pending → active)';
COMMENT ON COLUMN fights.notes IS 'Observaciones adicionales sobre la pelea';

-- ============================================================
-- 5. ALTER TABLE: users — nueva columna level
-- ============================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS level judge_level;

COMMENT ON COLUMN users.level IS
    'Nivel del juez calculado automáticamente: elite (≥90%), senior (≥80%), junior (<80%)';

CREATE INDEX IF NOT EXISTS idx_users_level ON users (level);

-- ============================================================
-- 6. FUNCIÓN: fn_calculate_winner — utilidad
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calculate_winner(
    p_score_red  SMALLINT,
    p_score_blue SMALLINT
) RETURNS TEXT
    IMMUTABLE
    LEAKPROOF
    LANGUAGE plpgsql AS $$
BEGIN
    IF p_score_red > p_score_blue THEN
        RETURN 'red';
    ELSIF p_score_blue > p_score_red THEN
        RETURN 'blue';
    ELSE
        RETURN 'draw';
    END IF;
END;
$$;

COMMENT ON FUNCTION fn_calculate_winner IS
    'Compara dos puntajes y retorna red, blue o draw.';

-- ============================================================
-- 7. FUNCIÓN TRIGGER: fn_update_score_card_totals (extendida con winner)
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
            SELECT COALESCE(SUM(score_red), 0)
            FROM round_scores
            WHERE score_card_id = v_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(score_blue), 0)
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
-- 8. FUNCIÓN TRIGGER: fn_update_official_card_totals (extendida con winner)
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
            SELECT COALESCE(SUM(score_red), 0)
            FROM official_round_scores
            WHERE official_card_id = v_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(score_blue), 0)
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
-- 9. TRIGGER: trg_judge_assignments_check_confirmations
--    (transición automática pending → active)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_judge_confirmations()
RETURNS TRIGGER AS $$
DECLARE
    v_confirmations INTEGER;
    v_min_required  INTEGER;
    v_current_status fight_status;
BEGIN
    -- Solo interesa cuando un juez acaba de confirmar
    IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
        SELECT
            COUNT(*) FILTER (WHERE ja.status = 'confirmed'),
            f.min_judges_required,
            f.status
        INTO v_confirmations, v_min_required, v_current_status
        FROM judge_assignments ja
        JOIN fights f ON f.id = ja.fight_id
        WHERE ja.fight_id = NEW.fight_id
        GROUP BY f.min_judges_required, f.status;

        IF v_confirmations >= v_min_required AND v_current_status = 'pending' THEN
            UPDATE fights
            SET status = 'active'
            WHERE id = NEW.fight_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_judge_assignments_check_confirmations ON judge_assignments;

CREATE TRIGGER trg_judge_assignments_check_confirmations
    AFTER UPDATE OF status ON judge_assignments
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed'))
    EXECUTE FUNCTION fn_check_judge_confirmations();

COMMENT ON TRIGGER trg_judge_assignments_check_confirmations ON judge_assignments IS
    'Cuando un juez confirma, cuenta las confirmaciones de la pelea.
     Si alcanza el mínimo requerido y la pelea está pending, la activa automáticamente.';

-- ============================================================
-- 10. FUNCIÓN: fn_calculate_judge_consistency
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calculate_judge_consistency(p_fight_id INTEGER)
RETURNS void AS $$
BEGIN
    DELETE FROM judge_consistency WHERE fight_id = p_fight_id;

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
    JOIN score_cards b ON b.fight_id = a.fight_id AND b.judge_id <> a.judge_id
    JOIN round_scores rs_a ON rs_a.score_card_id = a.id
    JOIN round_scores rs_b ON rs_b.score_card_id = b.id AND rs_b.round_number = rs_a.round_number
    WHERE a.fight_id = p_fight_id
      AND a.status = 'finalized'
      AND b.status = 'finalized'
    GROUP BY LEAST(a.judge_id, b.judge_id), GREATEST(a.judge_id, b.judge_id);

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_judge_consistency IS
    'Compara cada par de jueces finalizados en una pelea, round por round,
     y almacena el % de rounds donde coinciden exactamente.';

-- ============================================================
-- 11. FUNCIÓN: fn_update_judge_level
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_judge_level(p_judge_id INTEGER)
RETURNS void AS $$
DECLARE
    v_avg NUMERIC(5,2);
BEGIN
    SELECT COALESCE(AVG(match_pct), 0) INTO v_avg
    FROM analysis_results
    WHERE judge_id = p_judge_id;

    UPDATE users
    SET level = CASE
        WHEN v_avg >= 90 THEN 'elite'::judge_level
        WHEN v_avg >= 80 THEN 'senior'::judge_level
        ELSE 'junior'::judge_level
    END
    WHERE id = p_judge_id AND role = 'judge';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_judge_level IS
    'Calcula el promedio histórico del juez desde analysis_results
     y asigna su nivel: elite (≥90%), senior (≥80%), junior (<80%).';

-- ============================================================
-- 12. FUNCIÓN: fn_calculate_analysis (extendida)
--     Agrega al final: status → analyzed, consistencia, niveles
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
BEGIN
    -- Limpiar resultados previos para esta pelea
    DELETE FROM analysis_results WHERE fight_id = p_fight_id;

    -- Insertar nuevos resultados
    INSERT INTO analysis_results (fight_id, judge_id, official_card_id, total_rounds, matches, errors, match_pct)
    SELECT
        p_fight_id,
        sc.judge_id,
        oc.id,
        COUNT(rs.id)::SMALLINT,
        COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN rs.score_red <> ors.score_red OR rs.score_blue <> ors.score_blue THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END) * 100.0
            / NULLIF(COUNT(rs.id), 0),
            2
        )
    FROM score_cards sc
    JOIN round_scores rs ON rs.score_card_id = sc.id
    CROSS JOIN official_cards oc
    JOIN official_round_scores ors ON ors.official_card_id = oc.id AND ors.round_number = rs.round_number
    WHERE sc.fight_id = p_fight_id
      AND sc.status = 'finalized'
      AND oc.fight_id = p_fight_id
    GROUP BY sc.judge_id, oc.id
    ON CONFLICT (fight_id, judge_id, official_card_id)
    DO UPDATE SET
        matches = EXCLUDED.matches,
        errors = EXCLUDED.errors,
        match_pct = EXCLUDED.match_pct;

    -- [NUEVO] Actualizar estado de la pelea a 'analyzed'
    UPDATE fights SET status = 'analyzed' WHERE id = p_fight_id;

    -- [NUEVO] Calcular consistencia inter-jueces
    PERFORM fn_calculate_judge_consistency(p_fight_id);

    -- [NUEVO] Actualizar nivel de cada juez que participó en esta pelea
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
        oc.card_number,
        ar.total_rounds,
        ar.matches,
        ar.errors,
        ar.match_pct
    FROM analysis_results ar
    JOIN users u ON u.id = ar.judge_id
    JOIN official_cards oc ON oc.id = ar.official_card_id
    WHERE ar.fight_id = p_fight_id
    ORDER BY u.name, oc.card_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. VISTA: v_judge_history
-- ============================================================
CREATE OR REPLACE VIEW v_judge_history AS
SELECT
    u.id AS judge_id,
    u.name AS judge_name,
    u.level,
    COALESCE(stats.total_fights, 0)::INTEGER AS total_fights,
    COALESCE(stats.total_rounds_judged, 0)::INTEGER AS total_rounds_judged,
    COALESCE(stats.avg_match_pct, 0) AS avg_match_pct,
    COALESCE(stats.last_5_avg_pct, 0) AS last_5_avg_pct
FROM users u
LEFT JOIN (
    SELECT
        ar.judge_id,
        COUNT(DISTINCT ar.fight_id) AS total_fights,
        SUM(ar.total_rounds) AS total_rounds_judged,
        ROUND(AVG(ar.match_pct), 2) AS avg_match_pct,
        ROUND(
            (SELECT AVG(l5.avg_pct) FROM (
                SELECT AVG(ar3.match_pct) AS avg_pct
                FROM analysis_results ar3
                WHERE ar3.judge_id = ar.judge_id
                GROUP BY ar3.fight_id
                ORDER BY MAX(ar3.created_at) DESC
                LIMIT 5
            ) l5),
        2) AS last_5_avg_pct
    FROM analysis_results ar
    GROUP BY ar.judge_id
) stats ON stats.judge_id = u.id
WHERE u.role = 'judge'
ORDER BY stats.avg_match_pct DESC NULLS LAST;

COMMENT ON VIEW v_judge_history IS
    'Historial consolidado por juez: total de peleas, rounds juzgados,
     promedio global de acierto, y promedio de las últimas 5 peleas (tendencia).';

-- ============================================================
-- 14. RECALCULAR winners en datos existentes (si los hay)
-- ============================================================
UPDATE score_cards sc
SET winner = CASE fn_calculate_winner(sc.total_score_red, sc.total_score_blue)
    WHEN 'red'  THEN f.boxer_red
    WHEN 'blue' THEN f.boxer_blue
    ELSE NULL
END
FROM fights f
WHERE sc.winner IS NULL AND f.id = sc.fight_id;

UPDATE official_cards oc
SET winner = CASE fn_calculate_winner(oc.total_score_red, oc.total_score_blue)
    WHEN 'red'  THEN f.boxer_red
    WHEN 'blue' THEN f.boxer_blue
    ELSE NULL
END
FROM fights f
WHERE oc.winner IS NULL AND f.id = oc.fight_id;

-- ============================================================
-- FIN DE MIGRACIÓN 002
-- ============================================================
