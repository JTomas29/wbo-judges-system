const { pool } = require('../config/db');

const ProfileObservation = {};

ProfileObservation.getByJudge = async (judgeId) => {
  const { rows } = await pool.query(`
    SELECT
      po.id,
      po.entity_type,
      po.observation,
      po.created_at,
      po.updated_at,
      f.id AS fight_id,
      f.event_name,
      f.scheduled_date,
      f.boxer_red,
      f.boxer_blue,
      u.name AS creator_name
    FROM profile_observations po
    JOIN fights f ON f.id = po.fight_id
    JOIN users u ON u.id = po.created_by
    WHERE po.judge_id = $1
    ORDER BY po.created_at DESC
  `, [judgeId]);
  return rows;
};

ProfileObservation.getByReferee = async (refereeId) => {
  const { rows } = await pool.query(`
    SELECT
      po.id,
      po.entity_type,
      po.observation,
      po.created_at,
      po.updated_at,
      f.id AS fight_id,
      f.event_name,
      f.scheduled_date,
      f.boxer_red,
      f.boxer_blue,
      u.name AS creator_name
    FROM profile_observations po
    JOIN fights f ON f.id = po.fight_id
    JOIN users u ON u.id = po.created_by
    WHERE po.referee_id = $1
    ORDER BY po.created_at DESC
  `, [refereeId]);
  return rows;
};

ProfileObservation.getById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM profile_observations WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

ProfileObservation.create = async ({ entityType, judgeId, refereeId, fightId, createdBy, observation }) => {
  const { rows } = await pool.query(`
    INSERT INTO profile_observations (entity_type, judge_id, referee_id, fight_id, created_by, observation)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, entity_type, judge_id, referee_id, fight_id, created_by, observation, created_at, updated_at
  `, [entityType, judgeId || null, refereeId || null, fightId, createdBy, observation]);
  return rows[0];
};

ProfileObservation.update = async (id, { observation }) => {
  const { rows } = await pool.query(`
    UPDATE profile_observations
    SET observation = $1
    WHERE id = $2
    RETURNING id, entity_type, judge_id, referee_id, fight_id, created_by, observation, created_at, updated_at
  `, [observation, id]);
  return rows[0] || null;
};

ProfileObservation.delete = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM profile_observations WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
};

// Para el PDF: obtener todo junto
ProfileObservation.getForPdf = async (entityType, entityId) => {
  const column = entityType === 'judge' ? 'judge_id' : 'referee_id';
  const { rows } = await pool.query(`
    SELECT
      po.observation,
      po.created_at,
      f.id AS fight_id,
      f.event_name,
      f.scheduled_date,
      f.boxer_red,
      f.boxer_blue,
      u.name AS creator_name
    FROM profile_observations po
    JOIN fights f ON f.id = po.fight_id
    JOIN users u ON u.id = po.created_by
    WHERE po.${column} = $1
    ORDER BY po.created_at DESC
  `, [entityId]);
  return rows;
};

module.exports = ProfileObservation;
