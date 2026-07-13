-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 004 — Rejection reason for judge assignments
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_004.sql
-- ============================================================

ALTER TABLE judge_assignments
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN judge_assignments.rejection_reason IS
    'Motivo por el cual el juez rechazó la designación. Solo se completa cuando status = rejected.';
