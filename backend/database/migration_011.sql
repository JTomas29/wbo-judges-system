-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 011 — Eventos de pelea en tarjetas y resultado oficial
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_011.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Se incorporan eventos reales de boxeo a la carga de tarjetas:
--   1) Knockdowns (por boxeador y por round) en round_scores.
--   2) Descuentos de puntos (por boxeador y por round) en round_scores.
--   3) Resultado oficial de la pelea (Decisión, KO, TKO, RTD, DQ, NC)
--      registrado EXCLUSIVAMENTE por el rol Supervisor en la tabla fights.
--
-- Para finalización anticipada (KO/TKO/RTD/DQ/NC) la pelea pasa
-- automáticamente a 'completed' y solo se consideran los rounds
-- efectivamente disputados (result_round).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENUM: fight_result_type — nuevo tipo
-- ============================================================
DO $$ BEGIN
    CREATE TYPE fight_result_type AS ENUM ('decision', 'ko', 'tko', 'rtd', 'dq', 'nc');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE fight_result_type IS
    'Tipo de resultado oficial de la pelea:
     decision = Decisión (va a la distancia),
     ko = Nocaut, tko = Nocaut técnico, rtd = Abandono en esquina,
     dq = Descalificación, nc = Sin decisión (no contest)';

-- ============================================================
-- 2. ALTER TABLE: fights — columnas de resultado oficial
-- ============================================================
ALTER TABLE fights
    ADD COLUMN IF NOT EXISTS result_type           fight_result_type,
    ADD COLUMN IF NOT EXISTS result_winner         VARCHAR(150),
    ADD COLUMN IF NOT EXISTS result_round          SMALLINT,
    ADD COLUMN IF NOT EXISTS result_time           VARCHAR(10),
    ADD COLUMN IF NOT EXISTS result_registered_by  INTEGER
        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS result_registered_at  TIMESTAMPTZ;

-- result_round: acotado al máximo de rounds permitido por chk_fights_rounds (12).
ALTER TABLE fights
    ADD CONSTRAINT chk_fights_result_round CHECK (
        result_round IS NULL OR result_round BETWEEN 1 AND 12
    );

-- result_time: formato m:ss (ej: 2:35). Solo aplica a finalización anticipada.
ALTER TABLE fights
    ADD CONSTRAINT chk_fights_result_time CHECK (
        result_time IS NULL OR result_time ~ '^[0-9]{1,2}:[0-5][0-9]$'
    );

CREATE INDEX IF NOT EXISTS idx_fights_result_type ON fights (result_type);

COMMENT ON COLUMN fights.result_type IS
    'Tipo de resultado oficial. Solo el rol supervisor puede registrarlo (validado en backend).';
COMMENT ON COLUMN fights.result_winner IS
    'Nombre del boxeador ganador. NULL cuando no corresponde (p.ej. NC / sin decisión).';
COMMENT ON COLUMN fights.result_round IS
    'Round en que finalizó la pelea. Solo para finalización anticipada (KO/TKO/RTD/DQ/NC).';
COMMENT ON COLUMN fights.result_time IS
    'Tiempo de finalización en formato m:ss (ej: 2:35). Solo para finalización anticipada.';
COMMENT ON COLUMN fights.result_registered_by IS
    'Usuario supervisor que registró el resultado oficial.';
COMMENT ON COLUMN fights.result_registered_at IS
    'Momento en que se registró el resultado oficial.';

-- ============================================================
-- 3. ALTER TABLE: round_scores — eventos del round
-- ============================================================
ALTER TABLE round_scores
    ADD COLUMN IF NOT EXISTS knockdown_red        BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS knockdown_blue       BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS point_deduction_red  SMALLINT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS point_deduction_blue SMALLINT  NOT NULL DEFAULT 0;

ALTER TABLE round_scores
    ADD CONSTRAINT chk_round_point_deductions CHECK (
        point_deduction_red BETWEEN 0 AND 5
        AND point_deduction_blue BETWEEN 0 AND 5
    );

COMMENT ON COLUMN round_scores.knockdown_red IS
    'El boxeador rojo derribó al azul (knockdown) en este round.';
COMMENT ON COLUMN round_scores.knockdown_blue IS
    'El boxeador azul derribó al rojo (knockdown) en este round.';
COMMENT ON COLUMN round_scores.point_deduction_red IS
    'Descuento de puntos aplicado al boxeador rojo en este round (0-5).';
COMMENT ON COLUMN round_scores.point_deduction_blue IS
    'Descuento de puntos aplicado al boxeador azul en este round (0-5).';

-- ============================================================
-- FIN DE MIGRACIÓN 011
-- ============================================================

COMMIT;
