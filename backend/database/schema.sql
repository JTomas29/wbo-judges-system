-- ============================================================
-- WBO JUDGES EVALUATION SYSTEM
-- PostgreSQL Database Schema
-- Versión: 1.0
-- ============================================================

-- ============================================================
-- 1. ENUMERACIONES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'admin',       -- Superadministrador del sistema
    'supervisor',  -- Crea peleas, designa jueces, carga tarjetas oficiales
    'judge'        -- Juez que puntúa peleas
);

CREATE TYPE fight_status AS ENUM (
    'pending',    -- Programada, aún no comienza
    'active',     -- En curso
    'completed',  -- Finalizada
    'analyzed',   -- Analizada
    'cancelled'   -- Cancelada
);

CREATE TYPE assignment_status AS ENUM (
    'pending',    -- Designado, esperando respuesta
    'confirmed',  -- Juez aceptó la designación
    'rejected'    -- Juez rechazó la designación
);

CREATE TYPE card_status AS ENUM (
    'draft',      -- Borrador, aún no finalizado
    'finalized'   -- Finalizado, no se puede modificar
);

-- ============================================================
-- 2. TABLA: users
-- ============================================================
-- Propósito: Almacena todos los usuarios del sistema:
-- administradores, supervisores y jueces.
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150)     NOT NULL,
    email           VARCHAR(255)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)     NOT NULL,
    role            user_role        NOT NULL DEFAULT 'judge',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_name CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = TRUE;

-- ============================================================
-- 3. TABLA: fights
-- ============================================================
-- Propósito: Representa cada evento/pelea de boxeo.
-- El supervisor crea la pelea con los datos de los boxeadores,
-- la fecha y la cantidad de rounds.
-- ============================================================
CREATE TABLE fights (
    id              SERIAL PRIMARY KEY,
    event_name      VARCHAR(255)     NOT NULL,
    boxer_red       VARCHAR(150)     NOT NULL,
    boxer_blue      VARCHAR(150)     NOT NULL,
    scheduled_date  DATE             NOT NULL,
    total_rounds    SMALLINT         NOT NULL DEFAULT 12,
    status          fight_status     NOT NULL DEFAULT 'pending',
    created_by      INTEGER          NOT NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fights_creator FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_fights_rounds CHECK (
        total_rounds IN (4, 6, 8, 10, 12)
    ),
    CONSTRAINT chk_fights_dates CHECK (
        scheduled_date >= CURRENT_DATE
    ),
    CONSTRAINT chk_fights_boxers CHECK (
        boxer_red <> boxer_blue
    )
);

CREATE INDEX idx_fights_status ON fights (status);
CREATE INDEX idx_fights_date ON fights (scheduled_date);
CREATE INDEX idx_fights_creator ON fights (created_by);

COMMENT ON COLUMN fights.total_rounds IS 'Cantidad de rounds de la pelea (4, 6, 8, 10 o 12)';
COMMENT ON COLUMN fights.created_by IS 'ID del usuario (admin/supervisor) que creó la pelea';

-- ============================================================
-- 4. TABLA: judge_assignments
-- ============================================================
-- Propósito: Relaciona muchos-a-muchos entre jueces y peleas.
-- El supervisor designa jueces a una pelea, y cada juez
-- debe confirmar o rechazar la designación.
-- ============================================================
CREATE TABLE judge_assignments (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    judge_id        INTEGER          NOT NULL,
    status          assignment_status NOT NULL DEFAULT 'pending',
    assigned_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    responded_at    TIMESTAMPTZ,

    CONSTRAINT fk_assign_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assign_judge FOREIGN KEY (judge_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_assign_fight_judge UNIQUE (fight_id, judge_id),
    -- Nota: la validación del rol de juez se hace en la capa de aplicación
    CONSTRAINT chk_assign_response CHECK (
        (status = 'pending' AND responded_at IS NULL)
        OR (status IN ('confirmed', 'rejected') AND responded_at IS NOT NULL)
    )
);

CREATE INDEX idx_assign_fight ON judge_assignments (fight_id);
CREATE INDEX idx_assign_judge ON judge_assignments (judge_id);
CREATE INDEX idx_assign_status ON judge_assignments (status);

COMMENT ON COLUMN judge_assignments.assigned_at IS 'Momento en que el supervisor designó al juez';
COMMENT ON COLUMN judge_assignments.responded_at IS 'Momento en que el juez respondió (aceptó/rechazó)';

-- ============================================================
-- 5. TABLA: score_cards
-- ============================================================
-- Propósito: Tarjeta de puntuación general de UN juez para UNA pelea.
-- Contiene los totales por boxeador y el ganador según ese juez.
-- Solo puede haber UNA tarjeta finalizada por juez por pelea.
-- ============================================================
CREATE TABLE score_cards (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    judge_id        INTEGER          NOT NULL,
    status          card_status      NOT NULL DEFAULT 'draft',
    total_score_red SMALLINT         NOT NULL DEFAULT 0,
    total_score_blue SMALLINT        NOT NULL DEFAULT 0,
    winner          VARCHAR(150),       -- Nombre del boxeador que ganó según el juez
    submitted_at    TIMESTAMPTZ,

    CONSTRAINT fk_score_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_score_judge FOREIGN KEY (judge_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_score_fight_judge UNIQUE (fight_id, judge_id),
    CONSTRAINT chk_score_scores CHECK (
        total_score_red >= 0 AND total_score_blue >= 0
    ),
    CONSTRAINT chk_score_status_submit CHECK (
        (status = 'draft' AND submitted_at IS NULL)
        OR (status = 'finalized' AND submitted_at IS NOT NULL)
    )
);

CREATE INDEX idx_score_fight ON score_cards (fight_id);
CREATE INDEX idx_score_judge ON score_cards (judge_id);

COMMENT ON TABLE score_cards IS 'Cada juez tiene una sola tarjeta por pelea. La constraint UNIQUE (fight_id, judge_id) lo garantiza.';
COMMENT ON COLUMN score_cards.winner IS 'Nombre del boxeador ganador según el criterio de este juez';

-- ============================================================
-- 6. TABLA: round_scores
-- ============================================================
-- Propósito: Detalle de cada asalto dentro de una tarjeta de juez.
-- Registra la puntuación de cada boxeador round por round.
-- ============================================================
CREATE TABLE round_scores (
    id              SERIAL PRIMARY KEY,
    score_card_id   INTEGER          NOT NULL,
    round_number    SMALLINT         NOT NULL,
    score_red       SMALLINT         NOT NULL,
    score_blue      SMALLINT         NOT NULL,

    CONSTRAINT fk_round_score_card FOREIGN KEY (score_card_id)
        REFERENCES score_cards (id)
        ON DELETE CASCADE,

    CONSTRAINT uq_round_card_number UNIQUE (score_card_id, round_number),
    CONSTRAINT chk_round_scores CHECK (
        score_red BETWEEN 1 AND 10
        AND score_blue BETWEEN 1 AND 10
    ),
    CONSTRAINT chk_round_number CHECK (
        round_number BETWEEN 1 AND 12
    )
);

CREATE INDEX idx_round_score_card ON round_scores (score_card_id);

COMMENT ON TABLE round_scores IS 'Puntuaciones de cada asalto. La puntuación válida en boxeo es 1-10 (escala obligatoria).';

-- ============================================================
-- 7. TABLA: official_cards
-- ============================================================
-- Propósito: Tarjetas oficiales cargadas por el supervisor
-- al finalizar la pelea. Siempre son 3 por pelea.
-- ============================================================
CREATE TABLE official_cards (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    card_number     SMALLINT         NOT NULL,  -- 1, 2 o 3
    total_score_red SMALLINT         NOT NULL DEFAULT 0,
    total_score_blue SMALLINT        NOT NULL DEFAULT 0,
    winner          VARCHAR(150),       -- Ganador oficial según esta tarjeta
    created_by      INTEGER          NOT NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_official_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_official_creator FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_official_fight_card UNIQUE (fight_id, card_number),
    CONSTRAINT chk_official_card_number CHECK (
        card_number BETWEEN 1 AND 3
    ),
    CONSTRAINT chk_official_scores CHECK (
        total_score_red >= 0 AND total_score_blue >= 0
    )
);

CREATE INDEX idx_official_fight ON official_cards (fight_id);
CREATE INDEX idx_official_creator ON official_cards (created_by);

COMMENT ON TABLE official_cards IS 'Exactamente 3 tarjetas oficiales por pelea, validadas por la constraint UNIQUE (fight_id, card_number).';
COMMENT ON COLUMN official_cards.card_number IS 'Número de tarjeta oficial: 1, 2 o 3';

-- ============================================================
-- 8. TABLA: official_round_scores
-- ============================================================
-- Propósito: Detalle de cada asalto dentro de una tarjeta oficial.
-- ============================================================
CREATE TABLE official_round_scores (
    id              SERIAL PRIMARY KEY,
    official_card_id INTEGER         NOT NULL,
    round_number    SMALLINT         NOT NULL,
    score_red       SMALLINT         NOT NULL,
    score_blue      SMALLINT         NOT NULL,

    CONSTRAINT fk_official_round_card FOREIGN KEY (official_card_id)
        REFERENCES official_cards (id)
        ON DELETE CASCADE,

    CONSTRAINT uq_official_round_card_number UNIQUE (official_card_id, round_number),
    CONSTRAINT chk_official_round_scores CHECK (
        score_red BETWEEN 1 AND 10
        AND score_blue BETWEEN 1 AND 10
    ),
    CONSTRAINT chk_official_round_number CHECK (
        round_number BETWEEN 1 AND 12
    )
);

CREATE INDEX idx_official_round_card ON official_round_scores (official_card_id);

-- ============================================================
-- 9. TABLA: analysis_results
-- ============================================================
-- Propósito: Almacena los resultados de la comparación entre
-- las tarjetas de los jueces y las tarjetas oficiales.
-- Se calcula cuando el supervisor ejecuta el análisis.
-- Cada fila compara UN juez contra UNA tarjeta oficial.
-- ============================================================
CREATE TABLE analysis_results (
    id              SERIAL PRIMARY KEY,
    fight_id        INTEGER          NOT NULL,
    judge_id        INTEGER          NOT NULL,
    official_card_id INTEGER         NOT NULL,
    total_rounds    SMALLINT         NOT NULL,  -- Total de rounds comparados
    matches         SMALLINT         NOT NULL DEFAULT 0,  -- Rounds donde coincidió
    errors          SMALLINT         NOT NULL DEFAULT 0,  -- Rounds donde difirió
    match_pct       NUMERIC(5,2)     NOT NULL DEFAULT 0,  -- Porcentaje de acierto
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_analysis_fight FOREIGN KEY (fight_id)
        REFERENCES fights (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_analysis_judge FOREIGN KEY (judge_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_analysis_official_card FOREIGN KEY (official_card_id)
        REFERENCES official_cards (id)
        ON DELETE CASCADE,

    CONSTRAINT uq_analysis UNIQUE (fight_id, judge_id, official_card_id),
    CONSTRAINT chk_analysis_values CHECK (
        matches >= 0 AND errors >= 0
        AND (matches + errors) = total_rounds
        AND match_pct BETWEEN 0 AND 100
    )
);

CREATE INDEX idx_analysis_fight ON analysis_results (fight_id);
CREATE INDEX idx_analysis_judge ON analysis_results (judge_id);

COMMENT ON TABLE analysis_results IS 'Resultados del análisis que compara cada juez contra cada tarjeta oficial. Se regenera cada vez que se ejecuta el análisis.';

-- ============================================================
-- 10. TABLA: referee_evaluations
-- ============================================================
-- Propósito: Almacena la evaluación del árbitro realizada por
-- el supervisor al finalizar una pelea analizada.
-- Solo puede existir UNA evaluación por pelea.
-- ============================================================
CREATE TABLE referee_evaluations (
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

CREATE INDEX idx_ref_eval_fight ON referee_evaluations (fight_id);
CREATE INDEX idx_ref_eval_referee ON referee_evaluations (referee_id);
CREATE INDEX idx_ref_eval_supervisor ON referee_evaluations (supervisor_id);

COMMENT ON TABLE referee_evaluations IS 'Evaluación del árbitro por pelea. Solo una por pelea (UNIQUE fight_id).';
COMMENT ON COLUMN referee_evaluations.score IS 'Calificación del árbitro (0-100)';
COMMENT ON COLUMN referee_evaluations.point_deduction IS 'Descuento por penalizaciones (0-5)';
COMMENT ON COLUMN referee_evaluations.final_score IS 'Puntaje final = score - point_deduction';

-- ============================================================
-- 11. VISTA: v_judge_performance
-- ============================================================
-- Propósito: Vista consolidada del rendimiento de cada juez
-- por pelea, promediando las 3 tarjetas oficiales.
-- ============================================================
CREATE OR REPLACE VIEW v_judge_performance AS
SELECT
    ar.fight_id,
    ar.judge_id,
    u.name AS judge_name,
    f.event_name,
    COUNT(ar.id) AS cards_compared,
    SUM(ar.matches) AS total_matches,
    SUM(ar.errors) AS total_errors,
    ROUND(AVG(ar.match_pct), 2) AS avg_match_pct,
    ROUND(
        AVG(ar.match_pct) FILTER (WHERE ar.match_pct >= 80), 2
    ) AS high_consistency_pct,
    ROW_NUMBER() OVER (
        PARTITION BY ar.fight_id
        ORDER BY AVG(ar.match_pct) DESC
    ) AS ranking
FROM analysis_results ar
JOIN users u ON u.id = ar.judge_id
JOIN fights f ON f.id = ar.fight_id
GROUP BY ar.fight_id, ar.judge_id, u.name, f.event_name;

COMMENT ON VIEW v_judge_performance IS 'Vista que consolida el rendimiento de cada juez por pelea, promediando las 3 comparaciones contra tarjetas oficiales.';

-- ============================================================
-- 12. VISTA: v_fight_summary
-- ============================================================
-- Propósito: Resumen de cada pelea con indicadores clave.
-- ============================================================
CREATE OR REPLACE VIEW v_fight_summary AS
SELECT
    f.id,
    f.event_name,
    f.boxer_red,
    f.boxer_blue,
    f.scheduled_date,
    f.total_rounds,
    f.status,
    u.name AS created_by_name,
    COUNT(DISTINCT ja.judge_id) FILTER (
        WHERE ja.status = 'confirmed'
    ) AS confirmed_judges,
    COUNT(DISTINCT ja.judge_id) FILTER (
        WHERE ja.status = 'pending'
    ) AS pending_judges,
    COUNT(DISTINCT sc.id) FILTER (
        WHERE sc.status = 'finalized'
    ) AS scorecards_submitted,
    COUNT(DISTINCT oc.id) AS official_cards_count,
    CASE
        WHEN COUNT(DISTINCT oc.id) = 3 THEN 'Completo'
        WHEN COUNT(DISTINCT oc.id) > 0 THEN 'Parcial'
        ELSE 'Sin tarjetas'
    END AS analysis_status
FROM fights f
JOIN users u ON u.id = f.created_by
LEFT JOIN judge_assignments ja ON ja.fight_id = f.id
LEFT JOIN score_cards sc ON sc.fight_id = f.id
LEFT JOIN official_cards oc ON oc.fight_id = f.id
GROUP BY f.id, u.name;

COMMENT ON VIEW v_fight_summary IS 'Vista de resumen que muestra el estado completo de cada pelea';

-- ============================================================
-- 13. FUNCIÓN: fn_calculate_analysis
-- ============================================================
-- Propósito: Función que ejecuta el análisis completo de una
-- pelea. Compara cada tarjeta de juez contra cada tarjeta
-- oficial y almacena los resultados en analysis_results.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calculate_analysis(p_fight_id INTEGER)
RETURNS TABLE (
    judge_name      VARCHAR,
    card_number     SMALLINT,
    total_rounds    SMALLINT,
    matches         SMALLINT,
    errors          SMALLINT,
    match_pct       NUMERIC(5,2)
) AS $$
BEGIN
    -- Limpiar resultados previos para esta pelea
    DELETE FROM analysis_results WHERE fight_id = p_fight_id;

    -- Insertar nuevos resultados
    INSERT INTO analysis_results (fight_id, judge_id, official_card_id, total_rounds, matches, errors, match_pct)
    SELECT
        p_fight_id,
        sc.judge_id,
        oc.id,
        COUNT(rs.id)::SMALLINT,
        COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END)::SMALLINT,
        COUNT(CASE WHEN rs.score_red <> ors.score_red OR rs.score_blue <> ors.score_blue THEN 1 END)::SMALLINT,
        ROUND(
            COUNT(CASE WHEN rs.score_red = ors.score_red AND rs.score_blue = ors.score_blue THEN 1 END) * 100.0
            / NULLIF(COUNT(rs.id), 0),
            2
        )
    FROM score_cards sc
    JOIN round_scores rs ON rs.score_card_id = sc.id
    CROSS JOIN official_cards oc
    JOIN official_round_scores ors ON ors.official_card_id = oc.id AND ors.round_number = rs.round_number
    WHERE sc.fight_id = p_fight_id
      AND sc.status = 'finalized'
      AND oc.fight_id = p_fight_id
    GROUP BY sc.judge_id, oc.id
    ON CONFLICT (fight_id, judge_id, official_card_id)
    DO UPDATE SET
        matches = EXCLUDED.matches,
        errors = EXCLUDED.errors,
        match_pct = EXCLUDED.match_pct;

    -- Retornar resultados
    RETURN QUERY
    SELECT
        u.name,
        oc.card_number,
        ar.total_rounds,
        ar.matches,
        ar.errors,
        ar.match_pct
    FROM analysis_results ar
    JOIN users u ON u.id = ar.judge_id
    JOIN official_cards oc ON oc.id = ar.official_card_id
    WHERE ar.fight_id = p_fight_id
    ORDER BY u.name, oc.card_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_analysis IS 'Ejecuta el análisis completo de una pelea: compara cada juez vs cada tarjeta oficial round por round.';

-- ============================================================
-- 14. TRIGGER: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_fights_updated_at
    BEFORE UPDATE ON fights
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_referee_evaluations_updated_at
    BEFORE UPDATE ON referee_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 15. TRIGGER: actualizar totales en score_cards
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_score_card_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE score_cards
    SET
        total_score_red = (
            SELECT COALESCE(SUM(score_red), 0)
            FROM round_scores
            WHERE score_card_id = NEW.score_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(score_blue), 0)
            FROM round_scores
            WHERE score_card_id = NEW.score_card_id
        )
    WHERE id = NEW.score_card_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_round_scores_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON round_scores
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_score_card_totals();

-- ============================================================
-- 16. TRIGGER: actualizar totales en official_cards
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_official_card_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE official_cards
    SET
        total_score_red = (
            SELECT COALESCE(SUM(score_red), 0)
            FROM official_round_scores
            WHERE official_card_id = NEW.official_card_id
        ),
        total_score_blue = (
            SELECT COALESCE(SUM(score_blue), 0)
            FROM official_round_scores
            WHERE official_card_id = NEW.official_card_id
        )
    WHERE id = NEW.official_card_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_official_round_scores_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON official_round_scores
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_official_card_totals();

-- ============================================================
-- 17. SEED DATA (opcional — solo para desarrollo)
-- ============================================================
-- Password: "password" con bcrypt (hash generado)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin WBO',      'admin@wbo.com',      '$2a$10$dummyhashadmin001', 'admin'),
    ('Supervisor WBO', 'supervisor@wbo.com', '$2a$10$dummyhashsuperv01', 'supervisor'),
    ('Ricardo Méndez', 'rmendez@wbo.com',    '$2a$10$dummyhashjuez0011', 'judge'),
    ('Ana Flores',     'aflores@wbo.com',    '$2a$10$dummyhashjuez0022', 'judge'),
    ('Laura Vega',     'lvega@wbo.com',      '$2a$10$dummyhashjuez0033', 'judge');

INSERT INTO fights (event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, status, created_by)
VALUES ('Velada del Año', 'Juan Pérez', 'Carlos López', CURRENT_DATE + 30, 12, 'pending', 2);

INSERT INTO judge_assignments (fight_id, judge_id, status, responded_at)
VALUES
    (1, 3, 'confirmed', NOW()),
    (1, 4, 'pending',   NULL),
    (1, 5, 'rejected',  NOW());