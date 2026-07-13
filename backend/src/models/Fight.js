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
      COALESCE(u_ref.name, NULL) AS referee_name,
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

module.exports = Fight;
