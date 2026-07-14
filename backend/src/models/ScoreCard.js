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
    SELECT id, score_card_id, round_number, score_red, score_blue, referee_score, referee_notes
    FROM round_scores
    WHERE score_card_id = $1
    ORDER BY round_number ASC
  `, [scoreCardId]);
  return rows;
};

module.exports = ScoreCard;
