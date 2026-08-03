-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 012 — Simplificación de la tarjeta del juez
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_012.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- La tarjeta del juez se reduce a su responsabilidad real: puntuar
-- cada round (score_red, score_blue) y agregar observaciones del
-- round. Se eliminan del flujo de tarjetas:
--   1) referee_score: evaluación del árbitro round por round.
--      Los jueces NO evalúan al árbitro; esa evaluación pertenece
--      únicamente al Supervisor (tabla referee_evaluations).
--   2) knockdown_red/blue y point_deduction_red/blue: eventos del
--      round que no forman parte de la tarjeta del juez.
-- referee_notes se renombra a notes (observaciones del round).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Eliminar constraint que referencia point_deduction_*
-- ============================================================
ALTER TABLE round_scores
    DROP CONSTRAINT IF EXISTS chk_round_point_deductions;

-- ============================================================
-- 2. Eliminar columnas no pertenecientes a la tarjeta del juez
-- ============================================================
ALTER TABLE round_scores
    DROP COLUMN IF EXISTS referee_score,
    DROP COLUMN IF EXISTS knockdown_red,
    DROP COLUMN IF EXISTS knockdown_blue,
    DROP COLUMN IF EXISTS point_deduction_red,
    DROP COLUMN IF EXISTS point_deduction_blue;

-- ============================================================
-- 3. Renombrar referee_notes -> notes
-- ============================================================
ALTER TABLE round_scores
    RENAME COLUMN referee_notes TO notes;

COMMENT ON COLUMN round_scores.notes IS
    'Observaciones del juez sobre el round. No incluye evaluación del árbitro.';

-- ============================================================
-- FIN DE MIGRACIÓN 012
-- ============================================================

COMMIT;
