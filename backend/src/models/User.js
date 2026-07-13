const { pool } = require('../config/db');

const User = {};

User.findByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );
  return rows[0] || null;
};

User.findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
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

User.getAllJudges = async () => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, level::text AS level, is_active FROM users WHERE role = 'judge' AND is_active = TRUE ORDER BY name"
  );
  return rows;
};

module.exports = User;
