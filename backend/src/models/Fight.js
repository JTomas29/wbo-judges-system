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
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      f.status::text,
      f.min_judges_required,
      f.total_rounds,
      f.result_type::text AS result_type,
      f.result_winner,
      f.result_round,
      f.result_time,
      f.result_registered_at,
      f.created_at,
      COALESCE(ja_stats.assigned_count, 0)::INTEGER AS confirmed_judges
    FROM fights f
    LEFT JOIN referees r ON r.id = f.referee_id
    LEFT JOIN (
      SELECT fight_id, COUNT(*) AS assigned_count
      FROM judge_assignments
      GROUP BY fight_id
    ) ja_stats ON ja_stats.fight_id = f.id
    WHERE f.status != 'archived'
    ORDER BY f.scheduled_date ASC
  `);
  return rows;
};

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
      f.created_by,
      f.referee_id,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      CASE WHEN r.id IS NULL THEN NULL ELSE json_build_object(
        'id', r.id,
        'first_name', r.first_name,
        'last_name', r.last_name,
        'license_number', r.license_number,
        'federation', r.federation,
        'active', r.active
      ) END AS referee,
      f.min_judges_required,
      f.result_type::text AS result_type,
      f.result_winner,
      f.result_round,
      f.result_time,
      f.result_registered_at,
      f.created_at
    FROM fights f
    LEFT JOIN referees r ON r.id = f.referee_id
    WHERE f.id = $1
  `, [id]);
  return rows[0] || null;
};

Fight.create = async (data) => {
  const { rows } = await pool.query(`
    INSERT INTO fights (event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    data.event_name,
    data.boxer_red,
    data.boxer_blue,
    data.scheduled_date,
    data.total_rounds,
    data.weight_class,
    data.venue || null,
    data.title || null,
    data.referee_id || null,
    data.broadcaster || null,
    data.notes || null,
    data.created_by,
  ]);
  return rows[0].id;
};

Fight.update = async (id, data) => {
  const { rows } = await pool.query(`
    UPDATE fights SET
      event_name = $1, boxer_red = $2, boxer_blue = $3,
      scheduled_date = $4, total_rounds = $5, weight_class = $6,
      venue = $7, title = $8, broadcaster = $9,
      referee_id = $10, notes = $11
    WHERE id = $12
    RETURNING id
  `, [
    data.event_name, data.boxer_red, data.boxer_blue,
    data.scheduled_date, data.total_rounds, data.weight_class,
    data.venue || null, data.title || null, data.broadcaster || null,
    data.referee_id || null, data.notes || null,
    id,
  ]);
  return rows[0] || null;
};

Fight.getAssignedJudges = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.level::text AS level,
      ja.assignment_type::text
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

Fight.complete = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'completed'
    WHERE id = $1 AND status = 'active'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

Fight.activate = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'active'
    WHERE id = $1 AND status = 'pending'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

Fight.registerResult = async (id, data) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET
      result_type = $2::fight_result_type,
      result_winner = $3,
      result_round = $4,
      result_time = $5,
      result_registered_by = $6,
      result_registered_at = NOW(),
      status = CASE
        WHEN $2::fight_result_type IN ('ko', 'tko', 'rtd', 'dq', 'nc') THEN 'completed'
        ELSE status
      END
    WHERE id = $1
    RETURNING
      id,
      status::text,
      result_type::text,
      result_winner,
      result_round,
      result_time,
      result_registered_by,
      result_registered_at
  `, [
    id,
    data.result_type,
    data.result_winner || null,
    data.result_round || null,
    data.result_time || null,
    data.result_registered_by,
  ]);
  return rows[0] || null;
};

Fight.getRoundDetail = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      rs.score_card_id,
      sc.judge_id,
      rs.round_number,
      rs.final_score_red AS judge_score_red,
      rs.final_score_blue AS judge_score_blue,
      ors.final_score_red AS official_score_red,
      ors.final_score_blue AS official_score_blue
    FROM round_scores rs
    JOIN score_cards sc ON sc.id = rs.score_card_id
    JOIN official_cards oc ON oc.fight_id = sc.fight_id
    JOIN official_round_scores ors ON ors.official_card_id = oc.id AND ors.round_number = rs.round_number
    WHERE sc.fight_id = $1 AND sc.status = 'finalized'
    ORDER BY sc.judge_id, rs.round_number
  `, [fightId]);
  return rows;
};

Fight.getJudgeConsistency = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      jc.judge_a_id,
      ua.name AS judge_a_name,
      jc.judge_b_id,
      ub.name AS judge_b_name,
      jc.match_pct
    FROM judge_consistency jc
    JOIN users ua ON ua.id = jc.judge_a_id
    JOIN users ub ON ub.id = jc.judge_b_id
    WHERE jc.fight_id = $1
    ORDER BY ua.name, ub.name
  `, [fightId]);
  return rows;
};

Fight.analyze = async (id) => {
  const { rows } = await pool.query(`
    SELECT * FROM fn_calculate_analysis($1)
  `, [id]);
  return rows;
};

Fight.updateMinJudgesRequired = async (fightId, count) => {
  await pool.query(
    'UPDATE fights SET min_judges_required = $1 WHERE id = $2',
    [count, fightId]
  );
};

Fight.archive = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'archived', archived_at = NOW()
    WHERE id = $1 AND status != 'archived'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

Fight.getHistory = async (filters = {}) => {
  let query = `
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
      f.status::text,
      f.total_rounds,
      f.archived_at,
      f.created_at,
      COALESCE(ar_agg.avg_match_pct, 0)::NUMERIC(5,2) AS avg_match_pct,
      COALESCE(ar_agg.total_matches, 0)::INTEGER AS total_matches,
      COALESCE(ar_agg.total_errors, 0)::INTEGER AS total_errors
    FROM fights f
    LEFT JOIN LATERAL (
      SELECT
        AVG(ar.match_pct) AS avg_match_pct,
        SUM(ar.matches) AS total_matches,
        SUM(ar.errors) AS total_errors
      FROM analysis_results ar
      WHERE ar.fight_id = f.id
    ) ar_agg ON true
    WHERE f.status = 'archived'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.searchEvent) {
    query += ` AND f.event_name ILIKE $${paramIndex}`;
    params.push(`%${filters.searchEvent}%`);
    paramIndex++;
  }

  if (filters.dateFrom) {
    query += ` AND f.scheduled_date >= $${paramIndex}`;
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    query += ` AND f.scheduled_date <= $${paramIndex}`;
    params.push(filters.dateTo);
    paramIndex++;
  }

  if (filters.weightClass) {
    query += ` AND f.weight_class = $${paramIndex}`;
    params.push(filters.weightClass);
    paramIndex++;
  }

  query += ` ORDER BY f.archived_at DESC, f.scheduled_date DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
};

module.exports = Fight;
