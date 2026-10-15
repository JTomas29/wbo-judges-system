-- ============================================================
-- Migración 022: Sistema de niveles de jueces en 3 categorías
-- PostgreSQL 17+
-- Aplicar con: psql -U postgres -d wbo_judges -f migration_022.sql
-- ============================================================
-- OBJETIVO
-- -------
-- Dejar el sistema de niveles cerrado en exactamente 3 categorías con la
-- progresión JUNIOR → SENIOR → ELITE:
--
--     0%   – 79.99…  →  junior
--    80%   – 89.99…  →  senior
--    90%   – 100%    →  elite
--
-- IMPORTANTE — el nivel NO es la posición del ranking. Son conceptos
-- independientes: un juez puede estar en el puesto #3 del ranking y ser
-- Senior. Esta migración no toca el ranking en absoluto.
--
-- QUÉ CORRIGE
-- -----------
-- 1. NIVEL INICIAL: `users.level` era NULLABLE y SIN DEFAULT, así que todo juez
--    creado por `POST /api/auth/register` quedaba con level = NULL (nivel
--    inexistente, sin badge en el frontend). Se fija DEFAULT 'junior' más una
--    constraint que exige nivel a todo juez, de modo que sea imposible un
--    estado inválido. El nivel real se recalcula después, cuando existan
--    análisis válidos (§5 del requerimiento).
--
-- 2. ERROR DE REDONDEO: fn_update_judge_level guardaba el promedio en una
--    variable NUMERIC(5,2), que redondea a 2 decimales ANTES de comparar. Con un
--    promedio real de 89.995 el redondeo producía 90.00 y el juez quedaba
--    clasificado como 'elite' cuando corresponde 'senior'. Se usa NUMERIC sin
--    restricción de escala para comparar siempre el valor real.
--
-- 3. NIVELES NULOS EXISTENTES: 3 jueces quedaron con level = NULL. Se rellenan
--    con 'junior' (su nivel inicial por definición), sin tocar sus métricas.
--
-- QUÉ NO TOCA
-- -----------
-- NO se modifica ningún porcentaje histórico ni ninguna tabla de datos:
-- analysis_results, score_cards, round_scores, official_cards, official_*,
-- resultados de peleas ni el ranking. Tampoco se recalcula el nivel de los
-- jueces que ya lo tienen: sólo se rellenan los NULL (§8 del requerimiento).
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Nivel inicial obligatorio = Junior
-- ────────────────────────────────────────────────────────────────────────────
-- Los NULL heredados se completan con el nivel inicial por definición.
UPDATE users
SET level = 'junior'::judge_level
WHERE role = 'judge'
  AND level IS NULL;

-- El default cubre cualquier INSERT futuro (p. ej. POST /api/auth/register),
-- de modo que no hace falta duplicar la regla en el código de aplicación.
ALTER TABLE users ALTER COLUMN level SET DEFAULT 'junior'::judge_level;

-- Garantía de integridad: todo juez DEBE tener nivel. No se aplica NOT NULL a la
-- columna completa porque los roles 'admin' y 'supervisor' legítimamente no
-- tienen nivel (el nivel es un atributo exclusivo de los jueces).
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_judge_level;
ALTER TABLE users ADD CONSTRAINT chk_users_judge_level
    CHECK (role <> 'judge' OR level IS NOT NULL);

COMMENT ON CONSTRAINT chk_users_judge_level ON users IS
    'Todo juez debe tener nivel (junior|senior|elite). Admin/supervisor pueden dejarlo NULL.';

COMMENT ON COLUMN users.level IS
    'Nivel del juez: junior | senior | elite (ENUM judge_level). '
    'Inicia en ''junior'' por default y lo recalcula fn_update_judge_level() '
    'tras cada análisis. Es independiente de la posición en el ranking.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Rangos exactos sin error de redondeo
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_judge_level(p_judge_id INTEGER)
RETURNS void AS $$
DECLARE
    -- NUMERIC sin precisión/escala: conserva TODOS los decimales del promedio.
    -- NUMERIC(5,2) redondeaba a 2 decimales y convertía 89.995 en 90.00,
    -- promocionando de 'senior' a 'elite' de forma incorrecta.
    v_avg NUMERIC;
BEGIN
    -- Métrica OFICIAL e INALTERADA: promedio de analysis_results.match_pct
    -- (precisión contra la tarjeta oficial del supervisor). No se usa la
    -- posición del ranking, ni cantidad de peleas o rounds, ni winner/exact pct.
    -- Sin análisis => 0 => 'junior' (aún no hay datos suficientes).
    SELECT COALESCE(AVG(match_pct), 0) INTO v_avg
    FROM analysis_results
    WHERE judge_id = p_judge_id;

    -- Comparación sobre el valor real, nunca sobre el porcentaje redondeado
    -- que se muestra en pantalla (89.995 sigue siendo 'senior').
    UPDATE users
    SET level = CASE
        WHEN v_avg >= 90 THEN 'elite'::judge_level
        WHEN v_avg >= 80 THEN 'senior'::judge_level
        ELSE 'junior'::judge_level
    END
    WHERE id = p_judge_id AND role = 'judge';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_judge_level IS
    'Calcula el promedio histórico de match_pct desde analysis_results (valor '
    'real, sin redondeo) y asigna el nivel: elite (>=90%), senior (>=80%), '
    'junior (<80% o sin análisis). No usa la posición del ranking.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Verificación defensiva
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_invalidos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_invalidos
    FROM users
    WHERE (role = 'judge' AND level IS NULL)
       OR level NOT IN ('junior', 'senior', 'elite');

    IF v_invalidos > 0 THEN
        RAISE EXCEPTION
            'Migración 022 abortada: % usuario(s) con nivel NULL (juez) o fuera de {junior,senior,elite}.',
            v_invalidos;
    END IF;
END $$;

COMMIT;
