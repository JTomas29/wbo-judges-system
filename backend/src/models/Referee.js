// ─── Referee.js — Modelo de árbitros del sistema. CRUD del catálogo de
// ─── árbitros más sus consultas de evaluación: ranking de desempeño,
// ─── perfil con estadísticas agregadas e historial de evaluaciones ───
const { pool } = require('../config/db');

const Referee = {};

// Columnas base reutilizadas en las consultas CRUD. `full_name` se compone en
// SQL concatenando nombre y apellido, evitando el CONCAT_WS cuando faltan datos.
const SELECT_COLS = `
  id, first_name, last_name,
  first_name || ' ' || last_name AS full_name,
  license_number, federation, phone, active, created_at, updated_at
`;

// Inserta un árbitro nuevo. Los campos opcionales (licencia, federación,
// teléfono) se normalizan con `|| null`; `active` tiene default true si el
// llamador no lo envía. Devuelve el árbitro creado.
Referee.create = async ({ first_name, last_name, license_number, federation, phone, active = true }) => {
  const { rows } = await pool.query(
    `INSERT INTO referees (first_name, last_name, license_number, federation, phone, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null, active]
  );
  return rows[0];
};

// Lista todos los árbitros del catálogo (activos e inactivos), ordenados por
// apellido y luego nombre.
Referee.getAll = async () => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM referees
     ORDER BY last_name, first_name`
  );
  return rows;
};

// Árbitro por id, o null si no existe.
Referee.getById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM referees
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

// Actualiza los datos editables del árbitro, normalizando campos opcionales.
// Devuelve la fila actualizada o null si el id no existe.
Referee.update = async (id, { first_name, last_name, license_number, federation, phone, active }) => {
  const { rows } = await pool.query(
    `UPDATE referees
     SET first_name = $1, last_name = $2, license_number = $3, federation = $4, phone = $5, active = $6
     WHERE id = $7
     RETURNING ${SELECT_COLS}`,
    [first_name, last_name, license_number || null, federation || null, phone || null, active, id]
  );
  return rows[0] || null;
};

// Desactiva el árbitro (active = FALSE) en lugar de borrarlo físicamente, para
// preservar el historial de peleas y evaluaciones que lo referencian (FK).
Referee.deactivate = async (id) => {
  const { rows } = await pool.query(
    `UPDATE referees
     SET active = FALSE
     WHERE id = $1
     RETURNING ${SELECT_COLS}`,
    [id]
  );
  return rows[0] || null;
};

// ─── RANKING ────────────────────────────────────────────────────────────────

// Ranking de desempeño de los árbitros. El CTE `eval_stats` agrega por árbitro
// sus evaluaciones: COUNT de peleas, AVG de score/deducción/final (ROUND a 2
// decimales), mejor/peor final_score y última fecha evaluada. El SELECT hace
// LEFT JOIN de todos los árbitros contra ese agregado (COALESCE a 0 para quienes
// nunca fueron evaluados) y asigna la `position` con ROW_NUMBER() ordenando por
// promedio de final_score DESC, luego por cantidad de peleas y luego por nombre.
// Los valores agregados se pasan a Number para salir como números JSON seguros.
Referee.getRanking = async () => {
  const { rows } = await pool.query(`
    WITH eval_stats AS (
      SELECT
        re.referee_id,
        COUNT(*)::INTEGER AS total_fights,
        ROUND(AVG(re.score)::NUMERIC, 2) AS average_score,
        ROUND(AVG(re.point_deduction)::NUMERIC, 2) AS average_deduction,
        ROUND(AVG(re.final_score)::NUMERIC, 2) AS average_final_score,
        MAX(re.final_score) AS best_score,
        MIN(re.final_score) AS worst_score,
        MAX(re.created_at) AS last_evaluation_date
      FROM referee_evaluations re
      GROUP BY re.referee_id
    )
    SELECT
      r.id,
      r.first_name,
      r.last_name,
      r.license_number,
      r.federation,
      r.active,
      COALESCE(es.total_fights, 0) AS total_fights,
      COALESCE(es.average_score, 0) AS average_score,
      COALESCE(es.average_deduction, 0) AS average_deduction,
      COALESCE(es.average_final_score, 0) AS average_final_score,
      COALESCE(es.best_score, 0) AS best_score,
      COALESCE(es.worst_score, 0) AS worst_score,
      es.last_evaluation_date AS last_evaluation,
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(es.average_final_score, 0) DESC,
          COALESCE(es.total_fights, 0) DESC,
          r.last_name ASC,
          r.first_name ASC
      ) AS position
    FROM referees r
    LEFT JOIN eval_stats es ON es.referee_id = r.id
    ORDER BY position
  `);
  return rows.map((row) => ({
    ...row,
    total_fights: Number(row.total_fights),
    average_score: Number(row.average_score),
    average_deduction: Number(row.average_deduction),
    average_final_score: Number(row.average_final_score),
    best_score: Number(row.best_score),
    worst_score: Number(row.worst_score),
    position: Number(row.position),
  }));
};

// ─── PROFILE ────────────────────────────────────────────────────────────────

// Perfil de un árbitro con estadísticas agregadas de su historial. Reutiliza el
// mismo CTE de `eval_stats` (COUNT/AVG/MAX/MIN por árbitro), filtra por id y
// devuelve el resumen con los promedios a 2 decimales y COALESCE a 0; al igual
// que el ranking, los agregados se convierten a Number para el JSON final.
Referee.getProfile = async (id) => {
  const { rows } = await pool.query(`
    WITH eval_stats AS (
      SELECT
        re.referee_id,
        COUNT(*)::INTEGER AS total_fights,
        ROUND(AVG(re.score)::NUMERIC, 2) AS average_score,
        ROUND(AVG(re.point_deduction)::NUMERIC, 2) AS average_deduction,
        ROUND(AVG(re.final_score)::NUMERIC, 2) AS average_final_score,
        MAX(re.final_score) AS best_score,
        MIN(re.final_score) AS worst_score
      FROM referee_evaluations re
      GROUP BY re.referee_id
    )
    SELECT
      r.id,
      r.first_name,
      r.last_name,
      r.license_number,
      r.federation,
      r.phone,
      r.active,
      COALESCE(es.total_fights, 0) AS total_fights,
      COALESCE(es.average_score, 0) AS average_score,
      COALESCE(es.average_deduction, 0) AS average_deduction,
      COALESCE(es.average_final_score, 0) AS average_final_score,
      COALESCE(es.best_score, 0) AS best_score,
      COALESCE(es.worst_score, 0) AS worst_score
    FROM referees r
    LEFT JOIN eval_stats es ON es.referee_id = r.id
    WHERE r.id = $1
  `, [id]);
  if (!rows[0]) return null;
  const { ...profile } = rows[0];
  return {
    ...profile,
    total_fights: Number(profile.total_fights),
    average_score: Number(profile.average_score),
    average_deduction: Number(profile.average_deduction),
    average_final_score: Number(profile.average_final_score),
    best_score: Number(profile.best_score),
    worst_score: Number(profile.worst_score),
  };
};

// Historial de evaluaciones de un árbitro para su ficha: JOIN a `fights` (nombre
// y fecha del evento) y a `users` (nombre del supervisor), ordenado por fecha de
// la evaluación descendente.
Referee.getEvaluationHistory = async (refereeId) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at AS evaluation_date,
      f.event_name,
      f.scheduled_date AS fight_date,
      u.name AS supervisor_name
    FROM referee_evaluations re
    JOIN fights f ON f.id = re.fight_id
    JOIN users u ON u.id = re.supervisor_id
    WHERE re.referee_id = $1
    ORDER BY re.created_at DESC
  `, [refereeId]);
  return rows;
};

module.exports = Referee;