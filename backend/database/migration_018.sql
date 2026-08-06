-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 018 — Official Judges (3 per fight, paper scorecards
--                entered by the Supervisor) + assignment_type rename
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_018.sql
-- ============================================================
--
-- CONTEXTO
-- --------
-- Cada pelea pasa a tener dos tipos de jueces:
--
--   * Jueces Oficiales (exactamente 3): puntúan en papel durante la
--     pelea. NUNCA ingresan al sistema para cargar su tarjeta; el
--     Supervisor la carga manualmente después del combate. Estas
--     tarjetas son informativas/históricas y NO se usan en el análisis
--     ni en el ranking (que compara solo a los jueces evaluadores
--     contra la Tarjeta Oficial del Supervisor).
--   * Jueces Evaluadores (N): puntúan dentro de la app y alimentan el
--     análisis, ranking y estadísticas.
--
-- Cambios:
--   1. assignment_type: 'evaluator' se renombra a 'evaluation' y se
--      agrega el nuevo valor 'official'. Se actualiza el DEFAULT y los
--      comentarios.
--   2. Nueva tabla official_judge_cards: tarjetas en papel de los
--      jueces oficiales. Una por (fight_id, judge_id).
--   3. Nueva tabla official_judge_round_scores: rounds de esas tarjetas.
--   4. Trigger que garantiza que un juez debe estar designado como
--      'official' en judge_assignments para tener tarjeta oficial.
--
-- official_cards se mantiene INTACTA: sigue siendo la Tarjeta Oficial
-- única del Supervisor, referencia del análisis.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENUM: assignment_type — rename evaluator -> evaluation + official
-- ============================================================
ALTER TYPE assignment_type RENAME VALUE 'evaluator' TO 'evaluation';

ALTER TYPE assignment_type ADD VALUE 'official';

-- Los registros existentes quedan con el valor renombrado. Se fija el
-- DEFAULT explícito al nuevo nombre (el rename ya lo mantiene apuntando
-- al mismo valor, se reafirma por claridad).
ALTER TABLE judge_assignments
    ALTER COLUMN assignment_type SET DEFAULT 'evaluation';

COMMENT ON TYPE assignment_type IS
    'evaluation = puntúa el combate dentro de la app (alimenta análisis y ranking);
     official = juez oficial que puntúa en papel (el Supervisor carga su tarjeta);
     referee_evaluator = evalúa al árbitro (puntaje 1-10 + notas por round)';

COMMENT ON COLUMN judge_assignments.assignment_type IS
    'Tipo de asignación: evaluation (puntúa combate en la app), official (puntúa en papel, tarjeta cargada por el Supervisor) o referee_evaluator (evalúa al árbitro)';

-- ============================================================
-- 2. TABLA: official_judge_cards — tarjetas en papel de los jueces oficiales
-- ============================================================
CREATE TABLE official_judge_cards (
    id          SERIAL PRIMARY KEY,
    fight_id    INTEGER NOT NULL REFERENCES fights (id) ON DELETE CASCADE,
    judge_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_by  INTEGER NOT NULL REFERENCES users (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_official_judge_card UNIQUE (fight_id, judge_id)
);

COMMENT ON TABLE official_judge_cards IS
    'Tarjetas en papel de los Jueces Oficiales (3 por pelea), cargadas manualmente por el Supervisor. NO se usan en el análisis ni en el ranking.';

COMMENT ON COLUMN official_judge_cards.fight_id IS 'Pelea a la que corresponde la tarjeta';
COMMENT ON COLUMN official_judge_cards.judge_id IS 'Juez Oficial designado para la pelea (assignment_type = official)';
COMMENT ON COLUMN official_judge_cards.created_by IS 'Supervisor que cargó la tarjeta en papel';
COMMENT ON COLUMN official_judge_cards.created_at IS 'Fecha de carga de la tarjeta';
COMMENT ON COLUMN official_judge_cards.updated_at IS 'Fecha de la última modificación';

-- ============================================================
-- 3. TABLA: official_judge_round_scores — rounds de tarjetas oficiales
-- ============================================================
CREATE TABLE official_judge_round_scores (
    id                    SERIAL PRIMARY KEY,
    official_judge_card_id INTEGER NOT NULL REFERENCES official_judge_cards (id) ON DELETE CASCADE,
    round_number          SMALLINT NOT NULL CHECK (round_number >= 1),
    score_red             SMALLINT NOT NULL CHECK (score_red BETWEEN 1 AND 10),
    score_blue            SMALLINT NOT NULL CHECK (score_blue BETWEEN 1 AND 10),
    point_deduction_red   SMALLINT NOT NULL DEFAULT 0 CHECK (point_deduction_red IN (0, 1, 2)),
    point_deduction_blue  SMALLINT NOT NULL DEFAULT 0 CHECK (point_deduction_blue IN (0, 1, 2)),
    final_score_red       SMALLINT GENERATED ALWAYS AS (score_red - point_deduction_red) STORED,
    final_score_blue      SMALLINT GENERATED ALWAYS AS (score_blue - point_deduction_blue) STORED,
    winner                VARCHAR(10) GENERATED ALWAYS AS (
        CASE
            WHEN score_red  - point_deduction_red  > score_blue - point_deduction_blue THEN 'red'
            WHEN score_blue - point_deduction_blue > score_red  - point_deduction_red  THEN 'blue'
            ELSE NULL
        END
    ) STORED,
    CONSTRAINT uq_official_judge_round UNIQUE (official_judge_card_id, round_number),
    CONSTRAINT chk_official_judge_round_final_min
        CHECK (score_red - point_deduction_red >= 1 AND score_blue - point_deduction_blue >= 1)
);

COMMENT ON TABLE official_judge_round_scores IS
    'Rounds de las tarjetas en papel de los Jueces Oficiales (misma lógica de descuentos 0/1/2 y puntajes finales que la Tarjeta Oficial).';

COMMENT ON COLUMN official_judge_round_scores.winner IS
    'Ganador del round según los puntajes finales (red/blue; NULL si hay empate). Calculado automáticamente.';

-- ============================================================
-- 4. TRIGGER: el juez debe estar designado como official
-- ============================================================
-- Garantiza la regla "una tarjeta por cada Juez Oficial designado":
-- solo se puede cargar una tarjeta para un juez que tenga una
-- designación con assignment_type = official en esa pelea.
-- (Se compara con ::text para evitar el uso directo del valor de enum
-- dentro de la misma transacción de migración.)
CREATE OR REPLACE FUNCTION fn_check_official_judge_card()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM judge_assignments ja
        WHERE ja.fight_id = NEW.fight_id
          AND ja.judge_id = NEW.judge_id
          AND ja.assignment_type::text = 'official'
    ) THEN
        RAISE EXCEPTION 'El juez % no está designado como oficial para la pelea %',
            NEW.judge_id, NEW.fight_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_official_judge_card_check ON official_judge_cards;
CREATE TRIGGER trg_official_judge_card_check
BEFORE INSERT OR UPDATE OF fight_id, judge_id ON official_judge_cards
FOR EACH ROW EXECUTE FUNCTION fn_check_official_judge_card();

COMMENT ON FUNCTION fn_check_official_judge_card IS
    'Valida que el juez tenga una designación official en judge_assignments antes de insertar su tarjeta en papel.';

-- ============================================================
-- 5. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_official_judge_cards_fight ON official_judge_cards (fight_id);
CREATE INDEX IF NOT EXISTS idx_official_judge_rounds_card ON official_judge_round_scores (official_judge_card_id);

COMMIT;
