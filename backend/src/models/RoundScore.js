// ─── RoundScore.js — Modelo de puntuación por asalto de la tarjeta de un juez.
// ─── Guarda/actualiza el puntaje de cada round (con deducciones) usando un
// ─── upsert por la clave compuesta (score_card_id, round_number) ───
const { pool } = require('../config/db');

const RoundScore = {};

// Upsert de un asalto: INSERT y, ante un conflicto en la clave única
// `(score_card_id, round_number)` (es decir, el asalto ya está puntuado), pasa a
// UPDATE los campos actualizables usando `EXCLUDED`. De esta forma el front puede
// guardar asaltos repetidos sin duplicar filas. `notes` se normaliza con `?? null`
// y los `final_score_red/blue` los calcula la propia base al devolver.
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
