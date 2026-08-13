const { pool } = require('../config/db');

const OfficialJudgeCard = {};

const CARD_FIELDS = `
  ojc.id,
  ojc.fight_id,
  ojc.judge_id,
  ojc.created_by,
  ojc.created_at,
  ojc.updated_at
`;

const getRounds = async (client, cardId) => {
  const roundsRes = await client.query(`
    SELECT
      id,
      official_judge_card_id,
      round_number,
      score_red,
      score_blue,
      point_deduction_red,
      point_deduction_blue,
      final_score_red,
      final_score_blue,
      winner
    FROM official_judge_round_scores
    WHERE official_judge_card_id = $1
    ORDER BY round_number
  `, [cardId]);
  return roundsRes.rows;
};

const getJudgeInfo = async (card) => {
  const userRes = await pool.query(
    'SELECT id, name, email, level::text AS level FROM users WHERE id = $1',
    [card.judge_id]
  );
  card.judge = userRes.rows[0] || null;
  return card;
};

OfficialJudgeCard.findByFight = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT ${CARD_FIELDS}
    FROM official_judge_cards ojc
    WHERE ojc.fight_id = $1
    ORDER BY ojc.id
  `, [fightId]);

  const cards = [];
  for (const card of rows) {
    card.rounds = await getRounds(pool, card.id);
    await getJudgeInfo(card);
    cards.push(card);
  }
  return cards;
};

OfficialJudgeCard.findByFightAndJudge = async (fightId, judgeId) => {
  const { rows } = await pool.query(`
    SELECT ${CARD_FIELDS}
    FROM official_judge_cards ojc
    WHERE ojc.fight_id = $1 AND ojc.judge_id = $2
  `, [fightId, judgeId]);
  const card = rows[0];
  if (!card) return null;
  card.rounds = await getRounds(pool, card.id);
  await getJudgeInfo(card);
  return card;
};

OfficialJudgeCard.findById = async (cardId) => {
  const { rows } = await pool.query(`
    SELECT ${CARD_FIELDS}
    FROM official_judge_cards ojc
    WHERE ojc.id = $1
  `, [cardId]);
  const card = rows[0];
  if (!card) return null;
  card.rounds = await getRounds(pool, card.id);
  await getJudgeInfo(card);
  return card;
};

OfficialJudgeCard.create = async (fightId, judgeId, rounds, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(`
      INSERT INTO official_judge_cards (fight_id, judge_id, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, fight_id, judge_id, created_by, created_at, updated_at
    `, [fightId, judgeId, userId]);
    const card = cardRes.rows[0];

    if (rounds && rounds.length > 0) {
      const values = [];
      const params = [];
      rounds.forEach((r, i) => {
        const offset = i * 6;
        params.push(
          card.id,
          r.round_number,
          r.score_red,
          r.score_blue,
          r.point_deduction_red ?? 0,
          r.point_deduction_blue ?? 0
        );
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
      });

      await client.query(`
        INSERT INTO official_judge_round_scores
          (official_judge_card_id, round_number, score_red, score_blue, point_deduction_red, point_deduction_blue)
        VALUES ${values.join(', ')}
      `, params);
    }

    await client.query('COMMIT');

    card.rounds = await getRounds(pool, card.id);
    await getJudgeInfo(card);
    return card;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

OfficialJudgeCard.update = async (cardId, rounds) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(`
      SELECT id, fight_id, judge_id, created_by, created_at, updated_at
      FROM official_judge_cards
      WHERE id = $1
    `, [cardId]);
    const card = cardRes.rows[0];
    if (!card) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM official_judge_round_scores WHERE official_judge_card_id = $1', [cardId]);

    if (rounds && rounds.length > 0) {
      const values = [];
      const params = [];
      rounds.forEach((r, i) => {
        const offset = i * 6;
        params.push(
          cardId,
          r.round_number,
          r.score_red,
          r.score_blue,
          r.point_deduction_red ?? 0,
          r.point_deduction_blue ?? 0
        );
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
      });

      await client.query(`
        INSERT INTO official_judge_round_scores
          (official_judge_card_id, round_number, score_red, score_blue, point_deduction_red, point_deduction_blue)
        VALUES ${values.join(', ')}
      `, params);
    }

    const updatedRes = await client.query(`
      UPDATE official_judge_cards SET updated_at = NOW()
      WHERE id = $1
      RETURNING id, fight_id, judge_id, created_by, created_at, updated_at
    `, [cardId]);
    const updated = updatedRes.rows[0];

    await client.query('COMMIT');

    updated.rounds = await getRounds(pool, updated.id);
    await getJudgeInfo(updated);
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

OfficialJudgeCard.deleteByFightAndJudge = async (fightId, judgeId) => {
  const { rowCount } = await pool.query(`
    DELETE FROM official_judge_cards
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);
  return rowCount;
};

module.exports = OfficialJudgeCard;
