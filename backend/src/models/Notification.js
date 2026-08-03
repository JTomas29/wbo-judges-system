const { pool } = require('../config/db');

const Notification = {};

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

Notification.getUnreadCount = async (userId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rows[0].count;
};

Notification.markAsRead = async (id, userId) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, title, message, reference_type, reference_id, is_read, created_at`,
    [id, userId]
  );
  return rows[0] || null;
};

Notification.markAllAsRead = async (userId) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
};

Notification.deleteById = async (id, userId) => {
  const { rows } = await pool.query(
    `DELETE FROM notifications
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );
  return rows[0] || null;
};

Notification.getAdminIds = async () => {
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE"
  );
  return rows.map((r) => r.id);
};

Notification.createForUsers = async (userIds, data) => {
  if (!userIds || userIds.length === 0) return;
  await Promise.all(
    userIds.map((userId) => Notification.create({ ...data, userId }))
  );
};

Notification.deleteAllByUser = async (userId) => {
  const { rowCount } = await pool.query(
    'DELETE FROM notifications WHERE user_id = $1',
    [userId]
  );
  return rowCount;
};

Notification.deleteExpired = async (days = 20) => {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
    [days]
  );
  return rowCount;
};

module.exports = Notification;
