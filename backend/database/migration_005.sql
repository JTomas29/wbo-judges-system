-- ============================================================
-- MIGRACIÓN 005: Tabla de notificaciones por usuario
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER          NOT NULL,
    type            VARCHAR(50)      NOT NULL,
    title           VARCHAR(255)     NOT NULL,
    message         TEXT             NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    INTEGER,
    is_read         BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notif_type CHECK (
        type IN ('assignment', 'status_change', 'reminder', 'system')
    )
);

CREATE INDEX idx_notif_user_id ON notifications (user_id);
CREATE INDEX idx_notif_is_read ON notifications (is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created_at ON notifications (created_at DESC);

COMMENT ON TABLE notifications IS 'Notificaciones individuales por usuario del sistema WBO.';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación: assignment, status_change, reminder, system';
COMMENT ON COLUMN notifications.reference_type IS 'Tipo de entidad referenciada (fight, assignment, etc.)';
COMMENT ON COLUMN notifications.reference_id IS 'ID de la entidad referenciada';
