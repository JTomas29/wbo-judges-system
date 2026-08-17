const { pool } = require('../config/db');

const ScoreCard = {};

ScoreCard.findOrCreate = async (fightId, judgeId) => {
  const existing = await pool.query(`
    SELECT id, fight_id, judge_id, status::text, total_score_red, total_score_blue, winner, submitted_at
    FROM score_cards
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);

  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await pool.query(`
    INSERT INTO score_cards (fight_id, judge_id)
    VALUES ($1, $2)
    RETURNING id, fight_id, judge_id, status::text, total_score_red, total_score_blue, winner, submitted_at
  `, [fightId, judgeId]);

  return rows[0];
};

ScoreCard.findById = async (id) => {
  const { rows } = await pool.query(`
    SELECT id, fight_id, judge_id, status::text, total_score_red, total_score_blue, winner, submitted_at
    FROM score_cards
    WHERE id = $1
  `, [id]);
  return rows[0] || null;
};

ScoreCard.findByFightAndJudge = async (fightId, judgeId) => {
  const { rows } = await pool.query(`
    SELECT id, fight_id, judge_id, status::text, total_score_red, total_score_blue, winner, submitted_at
    FROM score_cards
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);
  return rows[0] || null;
};

ScoreCard.getRoundScores = async (scoreCardId) => {
  const { rows } = await pool.query(`
    SELECT
      id, score_card_id, round_number, score_red, score_blue,
      deduction_red, deduction_blue, final_score_red, final_score_blue, notes
    FROM round_scores
    WHERE score_card_id = $1
    ORDER BY round_number ASC
  `, [scoreCardId]);
  return rows;
};

ScoreCard.finalize = async (id) => {
  const { rows } = await pool.query(`
    UPDATE score_cards
    SET status = 'finalized', submitted_at = NOW()
    WHERE id = $1 AND status = 'draft'
    RETURNING id, fight_id, judge_id, status::text, total_score_red, total_score_blue, winner, submitted_at
  `, [id]);
  return rows[0] || null;
};

ScoreCard.getAllByFight = async (fightId, assignmentType = null) => {
  let query = `
    SELECT
      u.id AS judge_id,
      u.name AS judge_name,
      u.level::text AS level,
      ja.assignment_type::text AS assignment_type,
      sc.status::text AS scorecard_status,
      sc.total_score_red,
      sc.total_score_blue,
      sc.winner,
      sc.submitted_at,
      COUNT(rs.id)::INTEGER AS completed_rounds,
      f.total_rounds
    FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_id
    JOIN fights f ON f.id = ja.fight_id
    LEFT JOIN score_cards sc ON sc.fight_id = ja.fight_id AND sc.judge_id = ja.judge_id
    LEFT JOIN round_scores rs ON rs.score_card_id = sc.id
    WHERE ja.fight_id = $1
  `;
  const params = [fightId];
  if (assignmentType) {
    query += ` AND ja.assignment_type = $2::assignment_type`;
    params.push(assignmentType);
  }
  query += `
    GROUP BY u.id, u.name, u.level, ja.assignment_type, sc.status,
             sc.total_score_red, sc.total_score_blue, sc.winner, sc.submitted_at,
             f.total_rounds
    ORDER BY u.name
  `;
  const { rows } = await pool.query(query, params);
  return rows;
};

ScoreCard.getRoundCount = async (scoreCardId) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::INTEGER AS count
    FROM round_scores
    WHERE score_card_id = $1
  `, [scoreCardId]);
  return rows[0].count;
};

module.exports = ScoreCard;
