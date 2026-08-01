-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 010 — La pelea se activa con al menos 1 juez confirmado
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_010.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Antes, la pelea pasaba de 'pending' a 'active' únicamente cuando
-- confirmados >= min_judges_required, y min_judges_required se
-- sincronizaba con el TOTAL de jueces asignados (assignmentController).
-- Es decir: se esperaba que TODOS los jueces asignados confirmaran.
-- Incluso un solo 'rejected' dejaba la pelea trabada en pending para
-- siempre (los rechazados nunca llegan a 'confirmed').
--
-- NUEVA REGLA DE NEGOCIO
-- ----------------------
-- La pelea se activa con AL MENOS 1 juez confirmado (accepted >= 1).
-- No importa cuántos quedan 'pending' ni cuántos 'rejected'.
-- No depende del total de asignaciones.
--
-- El valor min_judges_required deja de ser el umbral de activación:
-- se mantiene solo como referencia/display del total asignado.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FUNCIÓN: fn_check_judge_confirmations (reemplazada)
--    Activa la pelea cuando hay al menos 1 confirmación.
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

        -- Regla de negocio: basta con 1 juez confirmado para activar.
        IF v_confirmations >= 1 AND v_current_status = 'pending' THEN
            UPDATE fights
            SET status = 'active'
            WHERE id = NEW.fight_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_check_judge_confirmations() IS
    'Cuando un juez confirma, si hay al menos 1 confirmación (accepted >= 1) y la pelea
     está pending, la activa. NO se espera la respuesta de todos los jueces asignados:
     los jueces pending/rejected no bloquean el inicio de la pelea.';

-- ============================================================
-- 2. DATA FIX: activar retroactivamente las peleas pending
--    que ya cumplen la nueva regla (al menos 1 confirmado).
-- ============================================================
UPDATE fights
SET status = 'active'
WHERE status = 'pending'
  AND EXISTS (
      SELECT 1
      FROM judge_assignments ja
      WHERE ja.fight_id = fights.id
        AND ja.status = 'confirmed'
  );

-- ============================================================
-- 3. COMENTARIO: min_judges_required ya no es umbral de activación
-- ============================================================
COMMENT ON COLUMN fights.min_judges_required IS
    'Referencia informativa: total de jueces asignados a la pelea.
     La activación (pending -> active) ya NO depende de este valor:
     con al menos 1 juez confirmado la pelea pasa a active.';

-- ============================================================
-- FIN DE MIGRACIÓN 010
-- ============================================================

COMMIT;
