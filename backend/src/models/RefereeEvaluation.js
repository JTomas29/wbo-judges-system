// ─── RefereeEvaluation.js — Modelo de evaluación de árbitros por pelea.
// ─── El supervisor puntúa al árbitro (score) y puede aplicar deducciones
// ─── (point_deduction); el final_score se calcula y persiste aquí mismo ───
const { pool } = require('../config/db');

const RefereeEvaluation = {};

// Crea una evaluación. La lógica de negocio central: `finalScore` se calcula
// como `score - point_deduction` con piso en 0 (`Math.max`) para que una
// deducción nunca resulte en puntuación negativa. Los comentarios se guardan
// como null si vienen vacíos. Devuelve la fila completa (RETURNING *).
RefereeEvaluation.create = async ({ fight_id, referee_id, supervisor_id, score, point_deduction, comments }) => {
  const finalScore = Math.max(0, score - point_deduction);
  const { rows } = await pool.query(`
    INSERT INTO referee_evaluations (fight_id, referee_id, supervisor_id, score, point_deduction, final_score, comments)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [fight_id, referee_id, supervisor_id, score, point_deduction, finalScore, comments || null]);
  return rows[0];
};

// Recalcula una evaluación existente: vuelve a derivar `final_score` con la
// misma regla de piso en 0 que el create. Devuelve la fila actualizada o null.
RefereeEvaluation.update = async (id, { score, point_deduction, comments }) => {
  const finalScore = Math.max(0, score - point_deduction);
  const { rows } = await pool.query(`
    UPDATE referee_evaluations
    SET score = $1, point_deduction = $2, final_score = $3, comments = $4
    WHERE id = $5
    RETURNING *
  `, [score, point_deduction, finalScore, comments || null, id]);
  return rows[0] || null;
};

// Evaluación de una pelea (se asume una por pelea). LEFT JOIN a `referees` para
// el nombre completo del árbitro (CONCAT_WS) y a `users` para el del supervisor;
// los LEFT JOIN permiten devolver la evaluación aunque falte alguno de los dos.
RefereeEvaluation.findByFight = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.referee_id,
      re.supervisor_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at,
      re.updated_at,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      u.name AS supervisor_name
    FROM referee_evaluations re
    LEFT JOIN referees r ON r.id = re.referee_id
    LEFT JOIN users u ON u.id = re.supervisor_id
    WHERE re.fight_id = $1
  `, [fightId]);
  return rows[0] || null;
};

// Evaluación individual por id, con el mismo enriquecimiento de nombres
// (árbitro y supervisor) que `findByFight`. Devuelve null si no existe.
RefereeEvaluation.getById = async (id) => {
  const { rows } = await pool.query(`
    SELECT
      re.id,
      re.fight_id,
      re.referee_id,
      re.supervisor_id,
      re.score,
      re.point_deduction,
      re.final_score,
      re.comments,
      re.created_at,
      re.updated_at,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      u.name AS supervisor_name
    FROM referee_evaluations re
    LEFT JOIN referees r ON r.id = re.referee_id
    LEFT JOIN users u ON u.id = re.supervisor_id
    WHERE re.id = $1
  `, [id]);
  return rows[0] || null;
};

// Elimina la evaluación por id. RETURNING id confirma el borrado: devuelve la
// fila eliminada o null si el id no existía.
RefereeEvaluation.deleteById = async (id) => {
  const { rows } = await pool.query(`
    DELETE FROM referee_evaluations
    WHERE id = $1
    RETURNING id
  `, [id]);
  return rows[0] || null;
};

module.exports = RefereeEvaluation;
