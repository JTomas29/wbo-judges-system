// ─── OfficialCard.js — Modelo de la tarjeta OFICIAL de puntuación de una pelea
// ─── (la referencia contra la que se evalúa a los jueces). Crea la tarjeta con
// ─── sus asaltos en una transacción y la consulta incluyendo esos asaltos ───
const { pool } = require('../config/db');

const OfficialCard = {};

// Busca la tarjeta oficial de una pelea (se asume una por pelea) y, si existe,
// adjunta la lista de sus asaltos (`official_round_scores`) ordenada por
// `round_number` en la propiedad `rounds`. Devuelve null si no hay tarjeta.
OfficialCard.findByFight = async (fightId) => {
  const cardRes = await pool.query(`
    SELECT id, fight_id, total_score_red, total_score_blue, winner, created_by, created_at
    FROM official_cards
    WHERE fight_id = $1
  `, [fightId]);
  const card = cardRes.rows[0];
  if (!card) return null;

  const roundsRes = await pool.query(`
    SELECT id, round_number, score_red, score_blue, deduction_red, deduction_blue, final_score_red, final_score_blue
    FROM official_round_scores
    WHERE official_card_id = $1
    ORDER BY round_number
  `, [card.id]);
  card.rounds = roundsRes.rows;
  return card;
};

// Crea la tarjeta oficial junto con todos sus asaltos dentro de una transacción
// (BEGIN/COMMIT/ROLLBACK), garantizando atomicidad: o se guarda la tarjeta y
// todos sus `official_round_scores`, o no queda nada. El INSERT múltiple de
// asaltos se arma con un solo statement de valores generados (`$$n` por asalto,
// 6 params c/u) y las deducciones se normalizan con `?? 0`. Al finalizar se
// vuelve a leer la tarjeta y sus asaltos para devolver el estado completo.
OfficialCard.create = async (fightId, rounds, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(`
      INSERT INTO official_cards (fight_id, created_by)
      VALUES ($1, $2)
      RETURNING id, fight_id, total_score_red, total_score_blue, winner, created_by, created_at
    `, [fightId, userId]);
    const card = cardRes.rows[0];

    const values = [];
    const params = [];
    rounds.forEach((r, i) => {
      const offset = i * 6;
      params.push(
        card.id,
        r.round_number,
        r.score_red,
        r.score_blue,
        r.deduction_red ?? 0,
        r.deduction_blue ?? 0
      );
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
    });

    await client.query(`
      INSERT INTO official_round_scores (official_card_id, round_number, score_red, score_blue, deduction_red, deduction_blue)
      VALUES ${values.join(', ')}
    `, params);

    await client.query('COMMIT');

    const updatedRes = await pool.query(`
      SELECT id, fight_id, total_score_red, total_score_blue, winner, created_by, created_at
      FROM official_cards WHERE id = $1
    `, [card.id]);
    const updated = updatedRes.rows[0];

    const roundsRes = await pool.query(`
      SELECT id, round_number, score_red, score_blue, deduction_red, deduction_blue, final_score_red, final_score_blue
      FROM official_round_scores
      WHERE official_card_id = $1
      ORDER BY round_number
    `, [card.id]);
    updated.rounds = roundsRes.rows;

    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = OfficialCard;
