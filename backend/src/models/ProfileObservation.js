// ─── ProfileObservation.js — Modelo de observaciones del perfil de jueces y
// ─── árbitros: notas de supervisión fijadas a una pelea y su entidad (juez o
// ─── árbitro). CRUD básico + consultas cruzadas y exportación para PDF ───
const { pool } = require('../config/db');

const ProfileObservation = {};

// Observaciones del perfil de un juez, enriquecidas con los datos de la pelea
// (evento, fecha, boxeadores) y el nombre del usuario que las creó. JOIN a
// `fights` y a `users`; filtro por `judge_id`, ordenadas de más reciente a más
// antigua.
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

// Observaciones del perfil de un árbitro. Idéntico a `getByJudge` pero
// filtrando por `referee_id` (mismo JOIN a peleas y creadores).
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

// Observación individual por id (SELECT * de toda la fila). Devuelve el registro
// completo o null si no existe.
ProfileObservation.getById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM profile_observations WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

// Crea una observación. El campo `entityType` decide a qué entidad se liga: si
// es un juez se rellena `judge_id` y se deja `referee_id` en null (y viceversa),
// garantizando con `|| null` que el perfil del otro lado no quede ligado. La
// observación siempre se fija a una pelea (`fight_id`) y registra al creador.
ProfileObservation.create = async ({ entityType, judgeId, refereeId, fightId, createdBy, observation }) => {
  const { rows } = await pool.query(`
    INSERT INTO profile_observations (entity_type, judge_id, referee_id, fight_id, created_by, observation)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, entity_type, judge_id, referee_id, fight_id, created_by, observation, created_at, updated_at
  `, [entityType, judgeId || null, refereeId || null, fightId, createdBy, observation]);
  return rows[0];
};

// Actualiza únicamente el texto de la observación (los demás campos —entidad,
// pelea, creador— son inmutables). Devuelve la fila o null si no existe.
ProfileObservation.update = async (id, { observation }) => {
  const { rows } = await pool.query(`
    UPDATE profile_observations
    SET observation = $1
    WHERE id = $2
    RETURNING id, entity_type, judge_id, referee_id, fight_id, created_by, observation, created_at, updated_at
  `, [observation, id]);
  return rows[0] || null;
};

// Elimina la observación por id. RETURNING id sirve para confirmar el borrado:
// devuelve la fila eliminada o null si el id no existía.
ProfileObservation.delete = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM profile_observations WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
};

// Para el PDF: obtener todo junto
// Devuelve las observaciones de una entidad para el PDF del perfil. La columna
// a filtrar se elige según `entityType` ('judge' → judge_id, resto → referee_id);
// la interpolación `po.${column}` solo usa ese valor controlado (nunca input
// libre). JOIN a pelea y creador, ordenadas por fecha descendente.
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
