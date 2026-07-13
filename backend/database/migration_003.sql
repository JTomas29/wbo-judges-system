-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 003 — Refinamiento de esquema: referee, tarjeta
--                  única, tipo de asignación, metadata de pelea
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_003.sql
-- ============================================================

-- ============================================================
-- 1. ENUM: assignment_type — nuevo tipo
-- ============================================================
DO $$ BEGIN
    CREATE TYPE assignment_type AS ENUM ('evaluator', 'referee_evaluator');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE assignment_type IS
    'evaluator = evalúa el combate (puntúa rojo vs azul 10-9);
     referee_evaluator = evalúa al árbitro (puntaje 1-10 + notas por round)';

-- ============================================================
-- 2. ALTER TABLE: fights — nuevas columnas de metadata
-- ============================================================
ALTER TABLE fights
    ADD COLUMN IF NOT EXISTS venue       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS title       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS broadcaster VARCHAR(100);

COMMENT ON COLUMN fights.venue IS 'Lugar del evento (ej: Madison Square Garden, Luna Park)';
COMMENT ON COLUMN fights.title IS 'Título en juego (ej: Campeonato WBO Latino, Título Mundial WBO)';
COMMENT ON COLUMN fights.broadcaster IS 'Televisora o plataforma que cubre el evento';

-- ============================================================
-- 3. ALTER TABLE: fights — cambiar DEFAULT de min_judges_required
-- ============================================================
ALTER TABLE fights ALTER COLUMN min_judges_required SET DEFAULT 5;

COMMENT ON COLUMN fights.min_judges_required IS
    'Mínimo de jueces confirmados requeridos para activar la pelea (pending -> active). DEFAULT 5 por estándar WBO.';

-- ============================================================
-- 4. ALTER TABLE: fights — agregar referee_id (FK a users)
-- ============================================================
-- No existía columna referee VARCHAR en sesiones anteriores, se agrega directamente.
ALTER TABLE fights
    ADD COLUMN IF NOT EXISTS referee_id INTEGER
        REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fights_referee ON fights (referee_id);

COMMENT ON COLUMN fights.referee_id IS
    'Árbitro asignado a la pelea. FK a users con rol de referee (validado en backend).';

-- TODO: Validar en el backend que referee_id no esté también registrado como juez
-- evaluador (judge_assignments) para la misma pelea. No se implementa como
-- constraint SQL porque requeriría una subconsulta en CHECK (no permitida en PG
-- para FK a la misma tabla) y un trigger sería complejo de mantener sincronizado.
-- Validación recomendada: al asignar referee_id a una fight, verificar que el
-- usuario no tenga un judge_assignment activo (status IN ('pending','confirmed'))
-- para la misma fight. Análogamente, al crear un judge_assignment, verificar que
-- el usuario no sea referee_id de esa fight.

-- ============================================================
-- 5. ALTER TABLE: judge_assignments — agregar assignment_type
-- ============================================================
ALTER TABLE judge_assignments
    ADD COLUMN IF NOT EXISTS assignment_type assignment_type NOT NULL DEFAULT 'evaluator';

CREATE INDEX IF NOT EXISTS idx_assign_type ON judge_assignments (assignment_type);

COMMENT ON COLUMN judge_assignments.assignment_type IS
    'Tipo de asignación: evaluator (puntúa combate) o referee_evaluator (evalúa al árbitro)';

-- ============================================================
-- 6. ALTER TABLE: round_scores — agregar campos de evaluación
--     del árbitro
-- ============================================================
ALTER TABLE round_scores
    ADD COLUMN IF NOT EXISTS referee_score INTEGER
        CHECK (referee_score BETWEEN 1 AND 10),
    ADD COLUMN IF NOT EXISTS referee_notes TEXT;

COMMENT ON COLUMN round_scores.referee_score IS
    'Puntaje del árbitro en este round (1-10). Se llena cuando el evaluador tiene
     assignment_type = referee_evaluator.';
COMMENT ON COLUMN round_scores.referee_notes IS
    'Notas cualitativas del evaluador sobre la actuación del árbitro en este round.';

-- ============================================================
-- 7. ALTER TABLE: official_cards — simplificar a tarjeta única
--     por pelea
-- ============================================================
-- Primero eliminar la FK y constraints que dependen de card_number
ALTER TABLE official_cards
    DROP CONSTRAINT IF EXISTS uq_official_fight_card,
    DROP CONSTRAINT IF EXISTS chk_official_card_number;

-- Eliminar la columna card_number
ALTER TABLE official_cards
    DROP COLUMN IF EXISTS card_number;

-- Agregar UNIQUE(fight_id) para garantizar una sola tarjeta oficial por pelea
ALTER TABLE official_cards
    ADD CONSTRAINT uq_official_fight UNIQUE (fight_id);

COMMENT ON TABLE official_cards IS
    'Una sola tarjeta oficial por pelea. La constraint UNIQUE (fight_id) lo garantiza.';
COMMENT ON COLUMN official_cards.total_score_red IS 'Puntaje total oficial del boxeador rojo';
COMMENT ON COLUMN official_cards.total_score_blue IS 'Puntaje total oficial del boxeador azul';

-- ============================================================
-- 8. VISTA: v_fight_summary — actualizar para tarjeta única
-- ============================================================
CREATE OR REPLACE VIEW v_fight_summary AS
SELECT
    f.id,
    f.event_name,
    f.boxer_red,
    f.boxer_blue,
    f.scheduled_date,
    f.total_rounds,
    f.status,
    u.name AS created_by_name,
    COUNT(DISTINCT ja.judge_id) FILTER (
        WHERE ja.status = 'confirmed'
    ) AS confirmed_judges,
    COUNT(DISTINCT ja.judge_id) FILTER (
        WHERE ja.status = 'pending'
    ) AS pending_judges,
    COUNT(DISTINCT sc.id) FILTER (
        WHERE sc.status = 'finalized'
    ) AS scorecards_submitted,
    COUNT(DISTINCT oc.id) AS official_cards_count,
    CASE
        WHEN COUNT(DISTINCT oc.id) >= 1 THEN 'Completo'
        ELSE 'Sin tarjetas'
    END AS analysis_status
FROM fights f
JOIN users u ON u.id = f.created_by
LEFT JOIN judge_assignments ja ON ja.fight_id = f.id
LEFT JOIN score_cards sc ON sc.fight_id = f.id
LEFT JOIN official_cards oc ON oc.fight_id = f.id
GROUP BY f.id, u.name;

COMMENT ON VIEW v_fight_summary IS
    'Vista de resumen que muestra el estado completo de cada pelea.
     Actualizada a modelo de tarjeta oficial única (migración 003).';

-- ============================================================
-- 9. FUNCIÓN: fn_calculate_analysis — actualizar para tarjeta
--     única (eliminar referencia a card_number)
-- ============================================================
-- La función conserva su firma (RETURNS TABLE incluye card_number
-- por compatibilidad con el backend, pero ahora retorna NULL).
-- Solo compara score_red y score_blue (combate), no referee_score.
-- TODO: Extender en el futuro para incluir referee_score en la
-- comparación cuando assignment_type = referee_evaluator.
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
        COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN rs.score_red <> ors.score_red OR rs.score_blue <> ors.score_blue THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END) * 100.0
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

COMMENT ON FUNCTION fn_calculate_analysis IS
    'Ejecuta el análisis completo de una pelea: compara cada juez contra la
     tarjeta oficial única round por round. Actualiza status a analyzed,
     calcula consistencia inter-jueces y niveles. No incluye referee_score
     (pendiente para extensión futura).';

-- ============================================================
-- 10. VISTA: v_judge_performance — actualizar para no usar
--      card_number (no lo usa, pero se reconstruye por seguridad)
-- ============================================================
CREATE OR REPLACE VIEW v_judge_performance AS
SELECT
    ar.fight_id,
    ar.judge_id,
    u.name AS judge_name,
    f.event_name,
    COUNT(ar.id) AS cards_compared,
    SUM(ar.matches) AS total_matches,
    SUM(ar.errors) AS total_errors,
    ROUND(AVG(ar.match_pct), 2) AS avg_match_pct,
    ROUND(
        AVG(ar.match_pct) FILTER (WHERE ar.match_pct >= 80), 2
    ) AS high_consistency_pct,
    ROW_NUMBER() OVER (
        PARTITION BY ar.fight_id
        ORDER BY AVG(ar.match_pct) DESC
    ) AS ranking
FROM analysis_results ar
JOIN users u ON u.id = ar.judge_id
JOIN fights f ON f.id = ar.fight_id
GROUP BY ar.fight_id, ar.judge_id, u.name, f.event_name;

COMMENT ON VIEW v_judge_performance IS
    'Vista que consolida el rendimiento de cada juez por pelea contra la
     tarjeta oficial única. Actualizada a modelo de migración 003.';

-- ============================================================
-- FIN DE MIGRACIÓN 003
-- ============================================================
