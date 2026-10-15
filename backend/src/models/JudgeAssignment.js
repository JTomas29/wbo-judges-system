// ─── JudgeAssignment.js — Modelo de asignación de jueces a peleas.
// ─── Gestiona el alta/baja de asignaciones, el conteo por pelea y tipo, y
// ─── las consultas de las peleas asignadas a un juez ───
const { pool } = require('../config/db');

const JudgeAssignment = {};

// Asigna un juez (con su tipo de asignación) a una pelea. `assigned_at` lo
// resuelve el default de la columna. Devuelve la asignación completa creada.
JudgeAssignment.create = async (fightId, judgeId, assignmentType) => {
  const { rows } = await pool.query(`
    INSERT INTO judge_assignments (fight_id, judge_id, assignment_type)
    VALUES ($1, $2, $3)
    RETURNING id, fight_id, judge_id, assignment_type::text, assigned_at
  `, [fightId, judgeId, assignmentType]);
  return rows[0];
};

// Busca una asignación existente por la pareja (fight_id, judge_id). La clave
// compuesta única sirve de guarda para evitar duplicados: devuelve null cuando
// el juez aún no está asignado a esa pelea.
JudgeAssignment.findOne = async (fightId, judgeId) => {
  const { rows } = await pool.query(`
    SELECT id, fight_id, judge_id, assignment_type::text, assigned_at
    FROM judge_assignments
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);
  return rows[0] || null;
};

// Lista las asignaciones de una pelea. JOIN a `users` para traer nombre, email,
// nivel y el tipo de asignación, ordenadas alfabéticamente por nombre.
JudgeAssignment.getByFight = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      ja.judge_id,
      u.name,
      u.email,
      u.level::text AS level,
      ja.assignment_type::text,
      ja.assigned_at
    FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_id
    WHERE ja.fight_id = $1
    ORDER BY u.name
  `, [fightId]);
  return rows;
};

// Cuenta el total de asignaciones de una pelea (todas juntas).
JudgeAssignment.getCount = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::INTEGER AS total
    FROM judge_assignments
    WHERE fight_id = $1
  `, [fightId]);
  return rows[0].total;
};

// Cuenta las asignaciones de una pelea filtrando por tipo (`assignment_type`),
// casted a su enum. Se usa para validar si ya se cubrió el cupo oficial esperado.
JudgeAssignment.getCountByType = async (fightId, assignmentType) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::INTEGER AS total
    FROM judge_assignments
    WHERE fight_id = $1 AND assignment_type = $2::assignment_type
  `, [fightId, assignmentType]);
  return rows[0].total;
};

// Elimina la asignación (fight_id, judge_id). Devuelve el número de filas
// borradas (0 si no existía), que la capa de servicio usa para distinguir.
JudgeAssignment.delete = async (fightId, judgeId) => {
  const { rowCount } = await pool.query(`
    DELETE FROM judge_assignments
    WHERE fight_id = $1 AND judge_id = $2
  `, [fightId, judgeId]);
  return rowCount;
};

// Peleas asignadas a un juez (para su agenda/panel). JOIN con `fights` para los
// datos del evento y LEFT JOIN con `score_cards` (mismo juez y pelea) para
// exponer el estado de su tarjeta de puntuación; así el juez sabe si ya entregó
// su tarjeta y en qué estado está cada pelea. Ordena por fecha de la pelea.
JudgeAssignment.getByJudgeId = async (judgeId) => {
  const { rows } = await pool.query(`
    SELECT
      ja.fight_id,
      f.event_name,
      f.scheduled_date,
      f.venue,
      f.boxer_red,
      f.boxer_blue,
      f.total_rounds,
      f.result_type::text AS result_type,
      f.result_round,
      ja.assignment_type::text,
      f.status::text AS fight_status,
      sc.status::text AS scorecard_status
    FROM judge_assignments ja
    JOIN fights f ON f.id = ja.fight_id
    LEFT JOIN score_cards sc ON sc.fight_id = ja.fight_id AND sc.judge_id = ja.judge_id
    WHERE ja.judge_id = $1
    ORDER BY f.scheduled_date ASC
  `, [judgeId]);
  return rows;
};

module.exports = JudgeAssignment;
