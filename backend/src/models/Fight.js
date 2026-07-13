const { pool } = require('../config/db');

const Fight = {};

Fight.getAll = async () => {
  const { rows } = await pool.query(`
    SELECT
      f.id,
      f.event_name,
      f.boxer_red,
      f.boxer_blue,
      f.scheduled_date,
      f.weight_class,
      f.venue,
      f.title,
      f.broadcaster,
      f.referee_id,
<<<<<<< HEAD
      COALESCE(u_ref.name, NULL) AS referee_name,
=======
      u_ref.name AS referee_name,
>>>>>>> feature/fase1-fight-detail
      f.status::text,
      f.min_judges_required,
      f.total_rounds,
      f.created_at,
      COALESCE(ja_stats.confirmed_count, 0)::INTEGER AS confirmed_judges
    FROM fights f
    LEFT JOIN users u_ref ON u_ref.id = f.referee_id
    LEFT JOIN (
      SELECT fight_id, COUNT(*) AS confirmed_count
      FROM judge_assignments
      WHERE status = 'confirmed'
      GROUP BY fight_id
    ) ja_stats ON ja_stats.fight_id = f.id
    ORDER BY f.scheduled_date ASC
  `);
  return rows;
};
<<<<<<< HEAD
=======

Fight.getById = async (id) => {
  const { rows } = await pool.query(`
    SELECT
      f.id,
      f.event_name,
      f.boxer_red,
      f.boxer_blue,
      f.scheduled_date,
      f.total_rounds,
      f.weight_class,
      f.venue,
      f.title,
      f.broadcaster,
      f.notes,
      f.status::text,
      f.referee_id,
      u_ref.name AS referee_name,
      f.min_judges_required,
      f.created_at
    FROM fights f
    LEFT JOIN users u_ref ON u_ref.id = f.referee_id
    WHERE f.id = $1
  `, [id]);
  return rows[0] || null;
};

Fight.getAssignedJudges = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.level::text AS level,
      ja.assignment_type::text,
      ja.status::text
    FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_id
    WHERE ja.fight_id = $1
    ORDER BY u.name
  `, [fightId]);
  return rows;
};

Fight.getOfficialCard = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT id, total_score_red, total_score_blue, winner, created_at
    FROM official_cards
    WHERE fight_id = $1
  `, [fightId]);
  return rows[0] || null;
};

Fight.getAnalysisSummary = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      ar.judge_id,
      u.name AS judge_name,
      ar.matches,
      ar.errors,
      ar.match_pct
    FROM analysis_results ar
    JOIN users u ON u.id = ar.judge_id
    WHERE ar.fight_id = $1
    ORDER BY u.name
  `, [fightId]);
  return rows;
};
>>>>>>> feature/fase1-fight-detail

module.exports = Fight;
