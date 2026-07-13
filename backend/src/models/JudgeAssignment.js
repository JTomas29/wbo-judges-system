const { pool } = require('../config/db');

const JudgeAssignment = {};

JudgeAssignment.create = async (fightId, judgeId, assignmentType) => {
  const { rows } = await pool.query(`
    INSERT INTO judge_assignments (fight_id, judge_id, assignment_type)
    VALUES ($1, $2, $3)
    RETURNING id, fight_id, judge_id, assignment_type::text, status::text, assigned_at
  `, [fightId, judgeId, assignmentType]);
  return rows[0];
};

JudgeAssignment.findOne = async (fightId, judgeId) => {
  const { rows } = await pool.query(`
    SELECT id, fight_id, judge_id, assignment_type::text, status::text, assigned_at, responded_at
    FROM judge_assignments
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);
  return rows[0] || null;
};

JudgeAssignment.getByFight = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      ja.judge_id,
      u.name,
      u.email,
      u.level::text AS level,
      ja.assignment_type::text,
      ja.status::text,
      ja.assigned_at,
      ja.responded_at
    FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_id
    WHERE ja.fight_id = $1
    ORDER BY ja.status, u.name
  `, [fightId]);
  return rows;
};

JudgeAssignment.getCount = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::INTEGER AS total
    FROM judge_assignments
    WHERE fight_id = $1
  `, [fightId]);
  return rows[0].total;
};

JudgeAssignment.delete = async (fightId, judgeId) => {
  const { rowCount } = await pool.query(`
    DELETE FROM judge_assignments
    WHERE fight_id = $1 AND judge_id = $2 AND status = 'pending'
  `, [fightId, judgeId]);
  return rowCount;
};

JudgeAssignment.respond = async (fightId, judgeId, response) => {
  const { rows } = await pool.query(`
    UPDATE judge_assignments
    SET status = $3, responded_at = NOW()
    WHERE fight_id = $1 AND judge_id = $2
    RETURNING id, fight_id, judge_id, assignment_type::text, status::text, assigned_at, responded_at
  `, [fightId, judgeId, response]);
  return rows[0] || null;
};

JudgeAssignment.getByJudgeId = async (judgeId) => {
  const { rows } = await pool.query(`
    SELECT
      ja.fight_id,
      f.event_name,
      f.scheduled_date,
      f.venue,
      f.boxer_red,
      f.boxer_blue,
      ja.assignment_type::text,
      ja.status::text AS assignment_status,
      f.status::text AS fight_status,
      ja.responded_at
    FROM judge_assignments ja
    JOIN fights f ON f.id = ja.fight_id
    WHERE ja.judge_id = $1
    ORDER BY f.scheduled_date ASC
  `, [judgeId]);
  return rows;
};

module.exports = JudgeAssignment;
