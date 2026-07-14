const { pool } = require('../config/db');

const RoundScore = {};

RoundScore.upsert = async ({ scoreCardId, roundNumber, scoreRed, scoreBlue, refereeScore, refereeNotes }) => {
  const { rows } = await pool.query(`
    INSERT INTO round_scores (score_card_id, round_number, score_red, score_blue, referee_score, referee_notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (score_card_id, round_number)
    DO UPDATE SET
      score_red = EXCLUDED.score_red,
      score_blue = EXCLUDED.score_blue,
      referee_score = EXCLUDED.referee_score,
      referee_notes = EXCLUDED.referee_notes
    RETURNING id, score_card_id, round_number, score_red, score_blue, referee_score, referee_notes
  `, [scoreCardId, roundNumber, scoreRed, scoreBlue, refereeScore ?? null, refereeNotes ?? null]);
  return rows[0];
};

module.exports = RoundScore;
