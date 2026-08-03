const { pool } = require('../config/db');

const RefereeEvaluation = {};

RefereeEvaluation.create = async ({ fight_id, referee_id, supervisor_id, score, point_deduction, comments }) => {
  const finalScore = Math.max(0, score - point_deduction);
  const { rows } = await pool.query(`
    INSERT INTO referee_evaluations (fight_id, referee_id, supervisor_id, score, point_deduction, final_score, comments)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [fight_id, referee_id, supervisor_id, score, point_deduction, finalScore, comments || null]);
  return rows[0];
};

RefereeEvaluation.update = async (id, { score, point_deduction, comments }) => {
  const finalScore = Math.max(0, score - point_deduction);
  const { rows } = await pool.query(`
    UPDATE referee_evaluations
    SET score = $1, point_deduction = $2, final_score = $3, comments = $4
    WHERE id = $5
    RETURNING *
  `, [score, point_deduction, finalScore, comments || null, id]);
  return rows[0] || null;
};

RefereeEvaluation.findByFight = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.referee_id,
      re.supervisor_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at,
      re.updated_at,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      u.name AS supervisor_name
    FROM referee_evaluations re
    LEFT JOIN referees r ON r.id = re.referee_id
    LEFT JOIN users u ON u.id = re.supervisor_id
    WHERE re.fight_id = $1
  `, [fightId]);
  return rows[0] || null;
};

RefereeEvaluation.getById = async (id) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.referee_id,
      re.supervisor_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at,
      re.updated_at,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      u.name AS supervisor_name
    FROM referee_evaluations re
    LEFT JOIN referees r ON r.id = re.referee_id
    LEFT JOIN users u ON u.id = re.supervisor_id
    WHERE re.id = $1
  `, [id]);
  return rows[0] || null;
};

RefereeEvaluation.deleteById = async (id) => {
  const { rows } = await pool.query(`
    DELETE FROM referee_evaluations
    WHERE id = $1
    RETURNING id
  `, [id]);
  return rows[0] || null;
};

module.exports = RefereeEvaluation;
