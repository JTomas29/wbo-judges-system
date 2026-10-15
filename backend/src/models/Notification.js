// ─── Notification.js — Modelo de notificaciones de la plataforma.
// ─── Mensajes por usuario asociados opcionalmente a una entidad (referencia
// ─── type + id). Incluye creación (con deduplicación), consulta, marcado como
// ─── leída, borrado y limpieza por antigüedad ───
const { pool } = require('../config/db');

const Notification = {};

// Crea una notificación para un usuario. Regla de negocio clave: cuando se pasa
// `referenceType` y `referenceId`, primero consulta si ya existe una notificación
// idéntica (mismo usuario, tipo y referencia) y, de existir, la devuelve sin
// insertar duplicado (patrón idempotente para eventos repetidos, p. ej. varias
// asignaciones seguidas sobre la misma pelea).
Notification.create = async ({ userId, type, title, message, referenceType = null, referenceId = null }) => {
  if (referenceType && referenceId) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM notifications
       WHERE user_id = $1 AND type = $2 AND reference_type = $3 AND reference_id = $4`,
      [userId, type, referenceType, referenceId]
    );
    if (existing.length > 0) return existing[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, type, title, message, reference_type, reference_id, is_read, created_at`,
    [userId, type, title, message, referenceType, referenceId]
  );
  return rows[0];
};

// Notificaciones de un usuario con paginación (LIMIT/OFFSET), las más recientes
// primero. `limit` y `offset` tienen defaults para consumo directo desde rutas.
Notification.getByUser = async (userId, { limit = 20, offset = 0 } = {}) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, reference_type, reference_id, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
};

// Cuenta las notificaciones no leídas de un usuario. Se usa para el contador
// del panel de navegación (badge).
Notification.getUnreadCount = async (userId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rows[0].count;
};

// Marca una notificación como leída, validando además que pertenezca al usuario
// (`id` + `user_id`): evita que un usuario marque/lea la notificación de otro,
// pues la consulta no encuentra fila y devuelve null (cuando ya estaba leída o
// no le pertenece, el UPDATE no afecta filas).
Notification.markAsRead = async (id, userId) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, title, message, reference_type, reference_id, is_read, created_at`,
    [id, userId]
  );
  return rows[0] || null;
};

// Marca como leídas todas las notificaciones pendientes de un usuario,
// acotado a las no leídas (`is_read = FALSE`) para no re-escribir filas.
// Devuelve el número de notificaciones actualizadas.
Notification.markAllAsRead = async (userId) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
};

// Elimina una notificación validando propiedad (id + user_id), con la misma
// guarda que `markAsRead`: devuelve la fila borrada o null si no la encontró.
Notification.deleteById = async (id, userId) => {
  const { rows } = await pool.query(
    `DELETE FROM notifications
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );
  return rows[0] || null;
};

// Purga todas las notificaciones de un usuario (p. ej. al eliminar su cuenta).
// Devuelve la cantidad de filas eliminadas.
Notification.deleteAllByUser = async (userId) => {
  const { rowCount } = await pool.query(
    'DELETE FROM notifications WHERE user_id = $1',
    [userId]
  );
  return rowCount;
};

// Tarea de mantenimiento: borra notificaciones más antiguas que `days` días
// (default 20) usando `NOW() - INTERVAL '1 day' * $1`. Devuelve el total borrado.
Notification.deleteExpired = async (days = 20) => {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
    [days]
  );
  return rowCount;
};

module.exports = Notification;
