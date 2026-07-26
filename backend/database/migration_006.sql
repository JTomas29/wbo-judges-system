-- ============================================================
-- MIGRACIÓN 006: Archivado lógico de peleas
-- ============================================================

-- Agregar valor 'archived' al enum fight_status
ALTER TYPE fight_status ADD VALUE IF NOT EXISTS 'archived';

-- Agregar columna archived_at
ALTER TABLE fights ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN fights.archived_at IS 'Fecha en que la pelea fue archivada lógicamente (null si no está archivada)';
