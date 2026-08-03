const { pool } = require('../config/db');

const getDashboard = async (req, res, next) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'archived')::INTEGER AS total_fights,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_fights,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_fights
      FROM fights
    `);
    const judgesResult = await pool.query(`
      SELECT COUNT(*)::INTEGER AS total_judges
      FROM users
      WHERE role = 'judge' AND is_active = TRUE
    `);

    const recentFightsResult = await pool.query(`
      SELECT
        f.id,
        f.event_name,
        f.boxer_red,
        f.boxer_blue,
        f.scheduled_date,
        f.status::text,
        f.total_rounds,
        COALESCE(ja.confirmed_count, 0)::INTEGER AS confirmed_judges
      FROM fights f
      LEFT JOIN (
        SELECT fight_id, COUNT(*) AS confirmed_count
        FROM judge_assignments
        GROUP BY fight_id
      ) ja ON ja.fight_id = f.id
      WHERE f.status != 'archived'
      ORDER BY f.created_at DESC
      LIMIT 4
    `);

    const activeJudgesResult = await pool.query(`
      WITH judge_stats AS (
        SELECT
          judge_id,
          judge_name,
          ROUND(AVG(avg_match_pct), 2) AS overall_avg_pct,
          SUM(cards_compared) AS total_cards,
          SUM(total_matches) AS total_matches,
          SUM(total_errors) AS total_errors
        FROM v_judge_performance
        GROUP BY judge_id, judge_name
      )
      SELECT
        js.judge_id,
        js.judge_name,
        js.overall_avg_pct,
        js.total_cards,
        js.total_matches,
        js.total_errors,
        u.email
      FROM judge_stats js
      JOIN users u ON u.id = js.judge_id
      WHERE u.is_active = TRUE
      ORDER BY js.overall_avg_pct DESC NULLS LAST
      LIMIT 5
    `);

    const isJudge = req.user.role === 'judge';

    res.json({
      stats: {
        total_fights: statsResult.rows[0].total_fights,
        active_fights: statsResult.rows[0].active_fights,
        completed_fights: statsResult.rows[0].completed_fights,
        total_judges: judgesResult.rows[0].total_judges,
      },
      recent_fights: recentFightsResult.rows,
      active_judges: isJudge ? [] : activeJudgesResult.rows.map(j => ({
        id: j.judge_id,
        name: j.judge_name,
        email: j.email,
        avg_match_pct: j.overall_avg_pct !== null ? Number(j.overall_avg_pct) : null,
        total_analyzed: Number(j.total_cards),
        total_matches: Number(j.total_matches),
        total_errors: Number(j.total_errors),
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
