-- ============================================================
-- Migration 002: Remove Gustavo Tomas from users (judge) and add as referee
-- ============================================================
-- Ejecutar solo si existe el usuario Gustavo Tomas en la base de datos.
-- Reemplazar 'gtomas@wbo.com' con el email real del usuario si es diferente.

DO $$
DECLARE
    v_user_id INTEGER;
    v_user_email VARCHAR(255);
BEGIN
    -- Buscar al usuario por nombre (aproximación)
    SELECT id, email INTO v_user_id, v_user_email
    FROM users
    WHERE LOWER(name) LIKE '%gustavo%' AND LOWER(name) LIKE '%tomas%'
    LIMIT 1;

    -- Si no se encuentra exactamente, buscar por "Gustavo"
    IF v_user_id IS NULL THEN
        SELECT id, email INTO v_user_id, v_user_email
        FROM users
        WHERE LOWER(name) LIKE '%gustavo%'
        LIMIT 1;
    END IF;

    -- Si se encontró el usuario
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Usuario encontrado: ID=%, Email=%', v_user_id, v_user_email;

        -- Insertar como árbitro
        INSERT INTO referees (first_name, last_name, license_number, federation, phone, active)
        VALUES (
            'Gustavo',
            'Tomas',
            'LIC-GT-001',
            'Federación Argentina de Boxeo',
            NULL,
            TRUE
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Árbitro Gustavo Tomas creado correctamente';

        -- Eliminar asignaciones de juez (si existen)
        DELETE FROM judge_assignments WHERE judge_id = v_user_id;
        RAISE NOTICE 'Asignaciones de juez eliminadas';

        -- Eliminar tarjetas de puntuación del juez (si existen)
        DELETE FROM round_scores WHERE score_card_id IN (
            SELECT id FROM score_cards WHERE judge_id = v_user_id
        );
        DELETE FROM score_cards WHERE judge_id = v_user_id;
        RAISE NOTICE 'Tarjetas de puntuación eliminadas';

        -- Eliminar análisis del juez (si existen)
        DELETE FROM analysis_results WHERE judge_id = v_user_id;
        RAISE NOTICE 'Análisis eliminados';

        -- Finalmente, eliminar el usuario
        DELETE FROM users WHERE id = v_user_id;
        RAISE NOTICE 'Usuario Gustavo Tomas eliminado de la tabla users';

    ELSE
        RAISE WARNING 'No se encontró ningún usuario "Gustavo Tomas" en la base de datos';
    END IF;
END $$;