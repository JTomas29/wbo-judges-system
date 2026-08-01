-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 009 — Tabla referee_evaluations
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_009.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- La tabla referee_evaluations estaba definida únicamente en schema.sql,
-- que no se aplica completo en el flujo actual (las tablas se crean vía
-- migraciones). Existían los modelos/controladores que la usan
-- (RefereeEvaluation.js, Referee.js getRanking/getProfile, 
-- refereeEvaluationController.js), pero la tabla no existía en la DB:
-- cualquier consulta a esos endpoints fallaba con "relation does not exist".
--
-- Esta migración crea la tabla EXACTAMENTE con la estructura que
-- consumen los modelos existentes (no se modifica ningún modelo):
--
--   RefereeEvaluation.js  -> INSERT (fight_id, referee_id, supervisor_id,
--                            score, point_deduction, final_score, comments);
--                            UPDATE por id; SELECT con created_at, updated_at
--                            y joins a referees y users.
--   refereeEvaluationController.js -> validaciones: score 0-100,
--                            point_deduction 0-5, comments <= 500,
--                            UNA evaluación por pelea (409 si ya existe).
--   Referee.js (ranking/perfil) -> usa referee_id, score, point_deduction,
--                            final_score, created_at; joins a fights y users.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLA: referee_evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS referee_evaluations (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    referee_id      INTEGER          NOT NULL,
    supervisor_id   INTEGER          NOT NULL,
    score           SMALLINT         NOT NULL DEFAULT 0,
    point_deduction SMALLINT         NOT NULL DEFAULT 0,
    final_score     SMALLINT         NOT NULL DEFAULT 0,
    comments        TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ref_eval_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ref_eval_referee FOREIGN KEY (referee_id)
        REFERENCES referees (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ref_eval_supervisor FOREIGN KEY (supervisor_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_ref_eval_fight UNIQUE (fight_id),
    CONSTRAINT chk_ref_eval_score CHECK (
        score BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_ref_eval_deduction CHECK (
        point_deduction BETWEEN 0 AND 5
    ),
    CONSTRAINT chk_ref_eval_final_score CHECK (
        final_score >= 0
    ),
    CONSTRAINT chk_ref_eval_comments CHECK (
        char_length(comments) <= 500
    )
);

CREATE INDEX IF NOT EXISTS idx_ref_eval_fight ON referee_evaluations (fight_id);
CREATE INDEX IF NOT EXISTS idx_ref_eval_referee ON referee_evaluations (referee_id);
CREATE INDEX IF NOT EXISTS idx_ref_eval_supervisor ON referee_evaluations (supervisor_id);

-- ============================================================
-- 2. TRIGGER: actualizar updated_at automáticamente
-- ============================================================
DROP TRIGGER IF EXISTS trg_referee_evaluations_updated_at ON referee_evaluations;

CREATE TRIGGER trg_referee_evaluations_updated_at
    BEFORE UPDATE ON referee_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 3. COMENTARIOS
-- ============================================================
COMMENT ON TABLE referee_evaluations IS
    'Evaluación del árbitro por pelea. Una sola por pelea (UNIQUE fight_id).';
COMMENT ON COLUMN referee_evaluations.score IS 'Calificación del árbitro (0-100)';
COMMENT ON COLUMN referee_evaluations.point_deduction IS 'Descuento por penalizaciones (0-5)';
COMMENT ON COLUMN referee_evaluations.final_score IS 'Puntaje final = score - point_deduction';
COMMENT ON COLUMN referee_evaluations.referee_id IS 'FK a referees(id). El árbitro evaluado.';
COMMENT ON COLUMN referee_evaluations.supervisor_id IS 'FK a users(id). Supervisor que realizó la evaluación.';

-- ============================================================
-- FIN DE MIGRACIÓN 009
-- ============================================================

COMMIT;
