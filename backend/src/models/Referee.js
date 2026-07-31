const { pool } = require('../config/db');

const Referee = {};

const SELECT_COLS = `
  id, first_name, last_name,
  first_name || ' ' || last_name AS full_name,
  license_number, federation, phone, active, created_at, updated_at
`;

Referee.create = async ({ first_name, last_name, license_number, federation, phone }) => {
  const { rows } = await pool.query(
    `INSERT INTO referees (first_name, last_name, license_number, federation, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null]
  );
  return rows[0];
};

Referee.getAll = async () => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM referees
     WHERE active = TRUE
     ORDER BY last_name, first_name`
  );
  return rows;
};

Referee.getById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM referees
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

Referee.update = async (id, { first_name, last_name, license_number, federation, phone }) => {
  const { rows } = await pool.query(
    `UPDATE referees
     SET first_name = $1, last_name = $2, license_number = $3, federation = $4, phone = $5
     WHERE id = $6
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null, id]
  );
  return rows[0] || null;
};

Referee.deactivate = async (id) => {
  const { rows } = await pool.query(
    `UPDATE referees
     SET active = FALSE
     WHERE id = $1
     RETURNING ${SELECT_COLS}`,
    [id]
  );
  return rows[0] || null;
};

module.exports = Referee;
