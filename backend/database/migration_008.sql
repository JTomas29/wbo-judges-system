-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- Migration 008 — Corregir FK de fights.referee_id
-- PostgreSQL 17+
-- ============================================================
-- Aplicar con: docker exec -i wbo-postgres psql -U postgres -d wbo_judges < migration_008.sql
-- ============================================================
--
-- CONTEXTO / DIAGNÓSTICO
-- ----------------------
-- La migración 003 creó fights.referee_id apuntando a users(id),
-- cuando el "árbitro" era un usuario del sistema.
-- La migración 007 introdujo la entidad INDEPENDIENTE referees
-- (sin login, sin email, sin JWT) y todo el stack (modelo Fight,
-- fightController, frontend) pasó a tratar referee_id como
-- referencia a referees(id). La FK nunca se actualizó.
--
-- CONSECUENCIA: al crear una pelea con referee_id de la tabla
-- referees (ej. id=2), PostgreSQL rechazaba el INSERT con
-- "Referencia inválida: el registro relacionado no existe",
-- porque exigía que ese id existiera en users(id).
--
-- SOLUCIÓN
-- --------
-- 1) Limpiar referee_id de todas las peleas existentes (los valores
--    actuales son ids de USUARIOS/jueces, no de referees, y el módulo
--    de árbitros se acaba de incorporar — no son datos a conservar).
-- 2) Eliminar la FK incorrecta.
-- 3) Crear la FK correcta hacia referees(id) ON DELETE SET NULL:
--    la relación es opcional en el historial y si algún día se
--    desactiva/elimina un árbitro, la pelea no queda con una
--    referencia inválida (política más segura que CASCADE).
-- 4) No se modifica ninguna otra columna de la tabla fights.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Limpiar valores legacy de referee_id
--    (ids que apuntan a users, no a referees)
-- ============================================================
UPDATE fights
SET referee_id = NULL
WHERE referee_id IS NOT NULL;

-- ============================================================
-- 2. Eliminar la FK incorrecta hacia users(id)
-- ============================================================
ALTER TABLE fights
    DROP CONSTRAINT IF EXISTS fights_referee_id_fkey;

-- ============================================================
-- 3. Crear la FK correcta hacia referees(id)
-- ============================================================
ALTER TABLE fights
    ADD CONSTRAINT fk_fights_referee
    FOREIGN KEY (referee_id)
    REFERENCES referees (id)
    ON DELETE SET NULL;

-- ============================================================
-- 4. Comentario actualizado sobre la columna
-- ============================================================
COMMENT ON COLUMN fights.referee_id IS
    'Árbitro asignado a la pelea. FK a referees(id). NULL si no se asignó árbitro o el árbitro fue desactivado/eliminado (ON DELETE SET NULL).';

-- ============================================================
-- FIN DE MIGRACIÓN 008
-- ============================================================

COMMIT;
