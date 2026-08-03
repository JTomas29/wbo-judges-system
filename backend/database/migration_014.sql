-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 014 — Eliminación del flujo de confirmación/rechazo
-- de designaciones de jueces
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_014.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Las asignaciones de jueces pasan a ser una relación simple
-- pelea ↔ juez. Ya no existe confirmación/rechazo:
--   * La existencia del registro en judge_assignments significa
--     "juez designado".
--   * La activación de la pelea (pending → active) la realiza el
--     admin/supervisor manualmente con un botón explícito, desde
--     la capa de aplicación (POST /fights/:id/activate).
--   * Cada juez recibe una única notificación y puede puntuar sin
--     aceptar nada.
--
-- Por lo tanto se eliminan:
--   * El trigger trg_judge_assignments_check_confirmations y la
--     función fn_check_judge_confirmations() (activación automática).
--   * Las columnas status, responded_at y rejection_reason de
--     judge_assignments.
--   * El constraint chk_assign_response, el índice idx_assign_status
--     y el tipo ENUM assignment_status (sin usos restantes).
--   * La vista v_fight_summary se recrea sin depender de status
--     (los conteos pasan a ser de asignaciones).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TRIGGER + FUNCIÓN (activación automática)
-- ============================================================
DROP TRIGGER IF EXISTS trg_judge_assignments_check_confirmations ON judge_assignments;
DROP FUNCTION IF EXISTS fn_check_judge_confirmations();

-- ============================================================
-- 1b. VISTA: v_fight_summary — se recrea SIN depender de la
--     columna status de judge_assignments, para poder eliminarla.
--     Los conteos "confirmed_judges"/"pending_judges" se reemplazan
--     por "assigned_judges" (toda asignación es una designación).
--     (Se usa DROP/CREATE porque CREATE OR REPLACE no puede quitar
--     columnas existentes.)
-- ============================================================
DROP VIEW v_fight_summary;

CREATE VIEW v_fight_summary AS
SELECT
    f.id,
    f.event_name,
    f.boxer_red,
    f.boxer_blue,
    f.scheduled_date,
    f.total_rounds,
    f.status,
    u.name AS created_by_name,
    COUNT(DISTINCT ja.judge_id) AS assigned_judges,
    COUNT(DISTINCT sc.id) FILTER (
        WHERE sc.status = 'finalized'::card_status
    ) AS scorecards_submitted,
    COUNT(DISTINCT oc.id) AS official_cards_count,
    CASE
        WHEN COUNT(DISTINCT oc.id) >= 1 THEN 'Completo'::text
        ELSE 'Sin tarjetas'::text
    END AS analysis_status
FROM fights f
JOIN users u ON u.id = f.created_by
LEFT JOIN judge_assignments ja ON ja.fight_id = f.id
LEFT JOIN score_cards sc ON sc.fight_id = f.id
LEFT JOIN official_cards oc ON oc.fight_id = f.id
GROUP BY f.id, u.name;

COMMENT ON VIEW v_fight_summary IS 'Vista de resumen que muestra el estado completo de cada pelea (jueces designados, tarjetas y análisis)';

-- ============================================================
-- 2. CONSTRAINT e ÍNDICE dependientes de status
-- ============================================================
ALTER TABLE judge_assignments DROP CONSTRAINT IF EXISTS chk_assign_response;
DROP INDEX IF EXISTS idx_assign_status;

-- ============================================================
-- 3. COLUMNAS del flujo de confirmación
-- ============================================================
ALTER TABLE judge_assignments DROP COLUMN IF EXISTS status;
ALTER TABLE judge_assignments DROP COLUMN IF EXISTS responded_at;
ALTER TABLE judge_assignments DROP COLUMN IF EXISTS rejection_reason;

-- ============================================================
-- 4. TIPO ENUM sin usos restantes
-- ============================================================
DROP TYPE IF EXISTS assignment_status;

-- ============================================================
-- 5. DATA FIX: mantener la regla de negocio.
--    Las peleas activadas previamente (por el trigger de 3
--    confirmaciones) quedan como están: activas. No se revierten,
--    porque el admin las puede desactivar/archivar normalmente.
--    (No se ejecuta ningún UPDATE sobre fights para evitar chocar
--    con el CHECK chk_fights_dates.)
-- ============================================================

-- ============================================================
-- FIN DE MIGRACIÓN 014
-- ============================================================

COMMIT;
