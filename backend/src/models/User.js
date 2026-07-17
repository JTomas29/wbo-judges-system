const { pool } = require('../config/db');

const User = {};

User.findByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, level::text AS level, is_active, created_at, password_hash
     FROM users WHERE email = $1 AND is_active = TRUE`,
    [email]
  );
  return rows[0] || null;
};

User.findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, level::text AS level, is_active, created_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
};

User.updateJudge = async (id, data) => {
  let query, params;
  if (data.password_hash) {
    query = `UPDATE users SET name = $1, email = $2, level = $3::judge_level, is_active = $4, password_hash = $5 WHERE id = $6 AND role = 'judge'
      RETURNING id, name, email, role, level::text AS level, is_active, created_at`;
    params = [data.name, data.email, data.level, data.is_active, data.password_hash, id];
  } else {
    query = `UPDATE users SET name = $1, email = $2, level = $3::judge_level, is_active = $4 WHERE id = $5 AND role = 'judge'
      RETURNING id, name, email, role, level::text AS level, is_active, created_at`;
    params = [data.name, data.email, data.level, data.is_active, id];
  }
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
};

User.create = async ({ name, email, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, passwordHash, role]
  );
  return rows[0];
};

User.deleteJudge = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 AND role = 'judge' RETURNING id, name, email`,
    [id]
  );
  return rows[0] || null;
};

User.getAllJudges = async () => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, level::text AS level, is_active FROM users WHERE role = 'judge' ORDER BY name"
  );
  return rows;
};

module.exports = User;
