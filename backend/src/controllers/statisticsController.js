const { pool } = require('../config/db');

const getAllStatistics = async (req, res, next) => {
  try {
    const { role, id } = req.user;

    let query;
    let params;

    if (role === 'judge') {
      query = `
        SELECT judge_id, judge_name, level, total_fights,
               total_rounds_judged, avg_match_pct, last_5_avg_pct
        FROM v_judge_history
        WHERE judge_id = $1
        ORDER BY avg_match_pct DESC NULLS LAST
      `;
      params = [id];
    } else {
      query = `
        SELECT judge_id, judge_name, level, total_fights,
               total_rounds_judged, avg_match_pct, last_5_avg_pct
        FROM v_judge_history
        ORDER BY avg_match_pct DESC NULLS LAST
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    res.json(result.rows.map((r) => ({
      id: r.judge_id,
      name: r.judge_name,
      level: r.level,
      total_fights: Number(r.total_fights),
      total_rounds: Number(r.total_rounds_judged),
      avg_match_pct: Number(r.avg_match_pct),
      last_5_avg: Number(r.last_5_avg_pct),
    })));
  } catch (err) {
    next(err);
  }
};

const getJudgeStatistics = async (req, res, next) => {
  try {
    const judgeId = parseInt(req.params.judgeId, 10);
    const { role, id } = req.user;

    if (role === 'judge' && id !== judgeId) {
      return res.status(403).json({ message: 'No puedes consultar estadísticas de otro juez' });
    }

    const generalResult = await pool.query(`
      SELECT judge_id, judge_name, level, total_fights,
             total_rounds_judged, avg_match_pct, last_5_avg_pct
      FROM v_judge_history
      WHERE judge_id = $1
    `, [judgeId]);

    if (generalResult.rows.length === 0) {
      const userCheck = await pool.query(
        'SELECT id, name FROM users WHERE id = $1 AND role = $2',
        [judgeId, 'judge']
      );
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Juez no encontrado' });
      }
      return res.json({
        id: judgeId,
        name: userCheck.rows[0].name,
        level: null,
        total_fights: 0,
        total_rounds: 0,
        avg_match_pct: 0,
        last_5_avg: 0,
        history: [],
      });
    }

    const g = generalResult.rows[0];

    const historyResult = await pool.query(`
      SELECT
        ar.fight_id,
        f.event_name,
        f.scheduled_date,
        ar.match_pct,
        ar.matches,
        ar.errors,
        u.level
      FROM analysis_results ar
      JOIN fights f ON f.id = ar.fight_id
      JOIN users u ON u.id = ar.judge_id
      WHERE ar.judge_id = $1
      ORDER BY f.scheduled_date DESC
    `, [judgeId]);

    res.json({
      id: g.judge_id,
      name: g.judge_name,
      level: g.level,
      total_fights: Number(g.total_fights),
      total_rounds: Number(g.total_rounds_judged),
      avg_match_pct: Number(g.avg_match_pct),
      last_5_avg: Number(g.last_5_avg_pct),
      history: historyResult.rows.map((h) => ({
        fight_id: h.fight_id,
        event_name: h.event_name,
        scheduled_date: h.scheduled_date,
        match_pct: Number(h.match_pct),
        matches: Number(h.matches),
        errors: Number(h.errors),
        level: h.level,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllStatistics, getJudgeStatistics };
