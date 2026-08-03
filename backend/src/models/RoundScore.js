const { pool } = require('../config/db');

const RoundScore = {};

RoundScore.upsert = async ({
  scoreCardId,
  roundNumber,
  scoreRed,
  scoreBlue,
  deductionRed,
  deductionBlue,
  notes,
}) => {
  const { rows } = await pool.query(`
    INSERT INTO round_scores (
      score_card_id, round_number, score_red, score_blue,
      deduction_red, deduction_blue, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (score_card_id, round_number)
    DO UPDATE SET
      score_red = EXCLUDED.score_red,
      score_blue = EXCLUDED.score_blue,
      deduction_red = EXCLUDED.deduction_red,
      deduction_blue = EXCLUDED.deduction_blue,
      notes = EXCLUDED.notes
    RETURNING
      id, score_card_id, round_number, score_red, score_blue,
      deduction_red, deduction_blue, final_score_red, final_score_blue, notes
  `, [
    scoreCardId,
    roundNumber,
    scoreRed,
    scoreBlue,
    deductionRed,
    deductionBlue,
    notes ?? null,
  ]);
  return rows[0];
};

module.exports = RoundScore;
