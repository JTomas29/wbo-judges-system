const { pool } = require('../config/db');

const Referee = {};

const SELECT_COLS = `
  id, first_name, last_name,
  first_name || ' ' || last_name AS full_name,
  license_number, federation, phone, active, created_at, updated_at
`;

Referee.create = async ({ first_name, last_name, license_number, federation, phone, active = true }) => {
  const { rows } = await pool.query(
    `INSERT INTO referees (first_name, last_name, license_number, federation, phone, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null, active]
  );
  return rows[0];
};

Referee.getAll = async () => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM referees
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

Referee.update = async (id, { first_name, last_name, license_number, federation, phone, active }) => {
  const { rows } = await pool.query(
    `UPDATE referees
     SET first_name = $1, last_name = $2, license_number = $3, federation = $4, phone = $5, active = $6
     WHERE id = $7
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null, active, id]
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

// ─── RANKING ────────────────────────────────────────────────────────────────

Referee.getRanking = async () => {
  const { rows } = await pool.query(`
    WITH eval_stats AS (
      SELECT
        re.referee_id,
        COUNT(*)::INTEGER AS total_fights,
        ROUND(AVG(re.score)::NUMERIC, 2) AS average_score,
        ROUND(AVG(re.point_deduction)::NUMERIC, 2) AS average_deduction,
        ROUND(AVG(re.final_score)::NUMERIC, 2) AS average_final_score,
        MAX(re.final_score) AS best_score,
        MIN(re.final_score) AS worst_score,
        MAX(re.created_at) AS last_evaluation_date
      FROM referee_evaluations re
      GROUP BY re.referee_id
    )
    SELECT
      r.id,
      r.first_name,
      r.last_name,
      r.license_number,
      r.federation,
      r.active,
      COALESCE(es.total_fights, 0) AS total_fights,
      COALESCE(es.average_score, 0) AS average_score,
      COALESCE(es.average_deduction, 0) AS average_deduction,
      COALESCE(es.average_final_score, 0) AS average_final_score,
      COALESCE(es.best_score, 0) AS best_score,
      COALESCE(es.worst_score, 0) AS worst_score,
      es.last_evaluation_date AS last_evaluation,
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(es.average_final_score, 0) DESC,
          COALESCE(es.total_fights, 0) DESC,
          r.last_name ASC,
          r.first_name ASC
      ) AS position
    FROM referees r
    LEFT JOIN eval_stats es ON es.referee_id = r.id
    ORDER BY position
  `);
  return rows.map((row) => ({
    ...row,
    total_fights: Number(row.total_fights),
    average_score: Number(row.average_score),
    average_deduction: Number(row.average_deduction),
    average_final_score: Number(row.average_final_score),
    best_score: Number(row.best_score),
    worst_score: Number(row.worst_score),
    position: Number(row.position),
  }));
};

// ─── PROFILE ────────────────────────────────────────────────────────────────

Referee.getProfile = async (id) => {
  const { rows } = await pool.query(`
    WITH eval_stats AS (
      SELECT
        re.referee_id,
        COUNT(*)::INTEGER AS total_fights,
        ROUND(AVG(re.score)::NUMERIC, 2) AS average_score,
        ROUND(AVG(re.point_deduction)::NUMERIC, 2) AS average_deduction,
        ROUND(AVG(re.final_score)::NUMERIC, 2) AS average_final_score,
        MAX(re.final_score) AS best_score,
        MIN(re.final_score) AS worst_score
      FROM referee_evaluations re
      GROUP BY re.referee_id
    )
    SELECT
      r.id,
      r.first_name,
      r.last_name,
      r.license_number,
      r.federation,
      r.phone,
      r.active,
      COALESCE(es.total_fights, 0) AS total_fights,
      COALESCE(es.average_score, 0) AS average_score,
      COALESCE(es.average_deduction, 0) AS average_deduction,
      COALESCE(es.average_final_score, 0) AS average_final_score,
      COALESCE(es.best_score, 0) AS best_score,
      COALESCE(es.worst_score, 0) AS worst_score
    FROM referees r
    LEFT JOIN eval_stats es ON es.referee_id = r.id
    WHERE r.id = $1
  `, [id]);
  if (!rows[0]) return null;
  const { ...profile } = rows[0];
  return {
    ...profile,
    total_fights: Number(profile.total_fights),
    average_score: Number(profile.average_score),
    average_deduction: Number(profile.average_deduction),
    average_final_score: Number(profile.average_final_score),
    best_score: Number(profile.best_score),
    worst_score: Number(profile.worst_score),
  };
};

Referee.getEvaluationHistory = async (refereeId) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at AS evaluation_date,
      f.event_name,
      f.scheduled_date AS fight_date,
      u.name AS supervisor_name
    FROM referee_evaluations re
    JOIN fights f ON f.id = re.fight_id
    JOIN users u ON u.id = re.supervisor_id
    WHERE re.referee_id = $1
    ORDER BY re.created_at DESC
  `, [refereeId]);
  return rows;
};

module.exports = Referee;