-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 004 — Ajuste de min_judges_required a 3 (mínimo)
--                  y documentación de rango válido [3, 10]
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_004.sql
-- ============================================================

-- ============================================================
-- 1. ALTER TABLE: fights — DEFAULT vuelve a 3
-- ============================================================
-- La migración 003 cambió el DEFAULT a 5. Ahora el mínimo
-- requerido es 3 y el máximo es 10. El valor se sincroniza
-- dinámicamente desde Node.js (assignmentController) para
-- que min_judges_required = total de jueces asignados.
-- El DEFAULT de 3 es solo para nuevas filas sin asignaciones.
ALTER TABLE fights ALTER COLUMN min_judges_required SET DEFAULT 3;

COMMENT ON COLUMN fights.min_judges_required IS
    'Mínimo de jueces confirmados requeridos para activar la pelea (pending -> active).
     Se sincroniza dinámicamente con el total de jueces asignados.
     Rango válido: 3 (mínimo) a 10 (máximo). DEFAULT 3.';

-- ============================================================
-- FIN DE MIGRACIÓN 004
-- ============================================================
