-- ============================================================
-- Migración 020: Tabla profile_observations
-- Observaciones persistentes asociadas a jueces o árbitros.
-- Usa judge_id y referee_id como FKs separadas con CHECK
-- para garantizar integridad referencial real.
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_observations (
    id            SERIAL PRIMARY KEY,
    entity_type   VARCHAR(20) NOT NULL CHECK (entity_type IN ('judge', 'referee')),
    judge_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    referee_id    INTEGER REFERENCES referees(id) ON DELETE CASCADE,
    fight_id      INTEGER NOT NULL REFERENCES fights(id) ON DELETE CASCADE,
    created_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    observation   TEXT NOT NULL CHECK (length(observation) > 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Garantiza que solo uno de judge_id o referee_id esté informado
    CHECK (
        (entity_type = 'judge'   AND judge_id IS NOT NULL AND referee_id IS NULL) OR
        (entity_type = 'referee' AND referee_id IS NOT NULL AND judge_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_profile_obs_judge ON profile_observations(judge_id) WHERE judge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profile_obs_referee ON profile_observations(referee_id) WHERE referee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profile_obs_fight ON profile_observations(fight_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION fn_profile_observations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_observations_updated_at ON profile_observations;
CREATE TRIGGER trg_profile_observations_updated_at
    BEFORE UPDATE ON profile_observations
    FOR EACH ROW
    EXECUTE FUNCTION fn_profile_observations_updated_at();
