-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 013 — La pelea se activa con AL MENOS 3 jueces confirmados
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_013.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Migration 010 activaba la pelea con al menos 1 juez confirmado
-- (v_confirmations >= 1). Eso era incorrecto: con 1 sola confirmación
-- la pelea pasaba a 'active' y los jueces restantes quedaban pendientes
-- de responder sobre una pelea ya activa.
--
-- NUEVA REGLA DE NEGOCIO
-- ----------------------
-- La pelea pasa de 'pending' a 'active' recién cuando existen al menos
-- 3 jueces confirmados (accepted >= 3). Nunca antes.
--
-- La aceptación/rechazo de designaciones ya no depende del estado de la
-- pelea mientras esta esté 'pending' o 'active' (validado en
-- assignmentController.js). Solo se bloquea en completed/analyzed/
-- archived/cancelled.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FUNCIÓN: fn_check_judge_confirmations (reemplazada)
--    Activa la pelea solo cuando hay al menos 3 confirmaciones.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_judge_confirmations()
RETURNS TRIGGER AS $$
DECLARE
    v_confirmations INTEGER;
    v_current_status fight_status;
BEGIN
    -- Solo interesa cuando un juez acaba de confirmar
    IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
        SELECT
            COUNT(*) FILTER (WHERE ja.status = 'confirmed'),
            f.status
        INTO v_confirmations, v_current_status
        FROM judge_assignments ja
        JOIN fights f ON f.id = ja.fight_id
        WHERE ja.fight_id = NEW.fight_id
        GROUP BY f.status;

        -- Regla de negocio: se necesitan al menos 3 jueces confirmados.
        IF v_confirmations >= 3 AND v_current_status = 'pending' THEN
            UPDATE fights
            SET status = 'active'
            WHERE id = NEW.fight_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_check_judge_confirmations() IS
    'Cuando un juez confirma, si hay al menos 3 confirmaciones (accepted >= 3) y la pelea
     está pending, la activa. Con menos de 3 confirmaciones la pelea permanece pending.';

-- ============================================================
-- 2. DATA FIX: revertir a 'pending' las peleas activas
--    que aún no tienen 3 jueces confirmados.
--    Se excluyen las peleas con fecha ya pasada porque el CHECK
--    chk_fights_dates (scheduled_date >= CURRENT_DATE) impide
--    cualquier UPDATE sobre ellas (issue preexistente, no se toca).
-- ============================================================
UPDATE fights
SET status = 'pending'
WHERE status = 'active'
  AND scheduled_date >= CURRENT_DATE
  AND (
      SELECT COUNT(*)
      FROM judge_assignments ja
      WHERE ja.fight_id = fights.id
        AND ja.status = 'confirmed'
  ) < 3;

-- ============================================================
-- FIN DE MIGRACIÓN 013
-- ============================================================

COMMIT;
