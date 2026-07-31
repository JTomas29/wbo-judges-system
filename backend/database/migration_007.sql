-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 007 — Tabla de árbitros (referees)
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_007.sql
-- ============================================================
--
-- Entidad INDEPENDIENTE del módulo de jueces.
-- El árbitro NO es un usuario del sistema:
--   * No inicia sesión
--   * No tiene JWT
--   * No tiene email
--   * No tiene contraseña
--   * No tiene role
-- No se modifica nada del módulo de jueces.
-- ============================================================

-- ============================================================
-- 1. TABLA: referees
-- ============================================================
CREATE TABLE IF NOT EXISTS referees (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(150)     NOT NULL,
    last_name       VARCHAR(150)     NOT NULL,
    license_number  VARCHAR(100),
    federation      VARCHAR(150),
    phone           VARCHAR(30),
    active          BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_referees_names CHECK (
        char_length(trim(first_name)) > 0
        AND char_length(trim(last_name)) > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_referees_active ON referees (active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_referees_last_name ON referees (last_name);

-- ============================================================
-- 2. TRIGGER: actualizar updated_at automáticamente
-- ============================================================
CREATE TRIGGER trg_referees_updated_at
    BEFORE UPDATE ON referees
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 3. COMENTARIOS
-- ============================================================
COMMENT ON TABLE referees IS
    'Árbitros del sistema WBO. Entidad independiente del módulo de jueces: no es un usuario, no tiene login ni JWT.';
COMMENT ON COLUMN referees.first_name IS 'Nombre del árbitro';
COMMENT ON COLUMN referees.last_name IS 'Apellido del árbitro';
COMMENT ON COLUMN referees.license_number IS 'Número de licencia (opcional)';
COMMENT ON COLUMN referees.federation IS 'Federación a la que pertenece (opcional)';
COMMENT ON COLUMN referees.phone IS 'Teléfono de contacto (opcional)';
COMMENT ON COLUMN referees.active IS
    'Indica si el árbitro está activo. El borrado es lógico (active = FALSE).';

-- ============================================================
-- FIN DE MIGRACIÓN 007
-- ============================================================
