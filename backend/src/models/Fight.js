// ─── Fight.js — Modelo de peleas del sistema de evaluación de jueces/árbitros.
// ─── Centraliza el CRUD de peleas, las transiciones de estado
// ─── (pending → active → completed/archived), el registro de resultados,
// ─── la consulta de jueces asignados y las lecturas de análisis y
// ─── consistencia por pelea ───
const { pool } = require('../config/db');

const Fight = {};

// Devuelve todas las peleas NO archivadas (estado pending, active o completed)
// ordenadas por fecha ascendente. LEFT JOIN a `referees` para exponer el nombre
// completo del árbitro, y LEFT JOIN a un subquery que cuenta (GROUP BY fight_id)
// los jueces asignados en `judge_assignments`; el COALESCE hace que las peleas
// sin asignaciones reporten 0 jueces confirmados (`confirmed_judges`).
Fight.getAll = async () => {
  const { rows } = await pool.query(`
    SELECT
      f.id,
      f.event_name,
      f.boxer_red,
      f.boxer_blue,
      f.scheduled_date,
      f.weight_class,
      f.venue,
      f.title,
      f.broadcaster,
      f.referee_id,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      f.status::text,
      f.min_judges_required,
      f.total_rounds,
      f.result_type::text AS result_type,
      f.result_winner,
      f.result_round,
      f.result_time,
      f.result_registered_at,
      f.created_at,
      COALESCE(ja_stats.assigned_count, 0)::INTEGER AS confirmed_judges
    FROM fights f
    LEFT JOIN referees r ON r.id = f.referee_id
    LEFT JOIN (
      SELECT fight_id, COUNT(*) AS assigned_count
      FROM judge_assignments
      GROUP BY fight_id
    ) ja_stats ON ja_stats.fight_id = f.id
    WHERE f.status != 'archived'
    ORDER BY f.scheduled_date ASC
  `);
  return rows;
};

// Devuelve una sola pelea por su id (o null si no existe). LEFT JOIN al árbitro
// con `CONCAT_WS` para el nombre y `json_build_object` dentro de un CASE WHEN
// para incrustar el árbitro como objeto anidado (null cuando no hay árbitro).
Fight.getById = async (id) => {
  const { rows } = await pool.query(`
    SELECT
      f.id,
      f.event_name,
      f.boxer_red,
      f.boxer_blue,
      f.scheduled_date,
      f.total_rounds,
      f.weight_class,
      f.venue,
      f.title,
      f.broadcaster,
      f.notes,
      f.status::text,
      f.created_by,
      f.referee_id,
      CONCAT_WS(' ', r.first_name, r.last_name) AS referee_name,
      CASE WHEN r.id IS NULL THEN NULL ELSE json_build_object(
        'id', r.id,
        'first_name', r.first_name,
        'last_name', r.last_name,
        'license_number', r.license_number,
        'federation', r.federation,
        'active', r.active
      ) END AS referee,
      f.min_judges_required,
      f.result_type::text AS result_type,
      f.result_winner,
      f.result_round,
      f.result_time,
      f.result_registered_at,
      f.created_at
    FROM fights f
    LEFT JOIN referees r ON r.id = f.referee_id
    WHERE f.id = $1
  `, [id]);
  return rows[0] || null;
};

// Inserta una pelea nueva. Los campos opcionales (venue, title, referee_id,
// broadcaster, notes) se normalizan con `|| null` para guardar NULL en lugar de
// cadenas vacías o indefinidas, y `created_by` registra el usuario que la creó.
// Solo devuelve el id generado (el resto se consulta con getById).
Fight.create = async (data) => {
  const { rows } = await pool.query(`
    INSERT INTO fights (event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    data.event_name,
    data.boxer_red,
    data.boxer_blue,
    data.scheduled_date,
    data.total_rounds,
    data.weight_class,
    data.venue || null,
    data.title || null,
    data.referee_id || null,
    data.broadcaster || null,
    data.notes || null,
    data.created_by,
  ]);
  return rows[0].id;
};

// Actualiza los campos editables de la pelea. No toca `created_by` ni el estado
// (esas transiciones usan `complete`, `activate`, `archive`, `registerResult`).
// Devuelve la fila afectada o null si el id no existe.
Fight.update = async (id, data) => {
  const { rows } = await pool.query(`
    UPDATE fights SET
      event_name = $1, boxer_red = $2, boxer_blue = $3,
      scheduled_date = $4, total_rounds = $5, weight_class = $6,
      venue = $7, title = $8, broadcaster = $9,
      referee_id = $10, notes = $11
    WHERE id = $12
    RETURNING id
  `, [
    data.event_name, data.boxer_red, data.boxer_blue,
    data.scheduled_date, data.total_rounds, data.weight_class,
    data.venue || null, data.title || null, data.broadcaster || null,
    data.referee_id || null, data.notes || null,
    id,
  ]);
  return rows[0] || null;
};

// Lista los jueces asignados a una pelea. JOIN `judge_assignments` ↔ `users`
// para traer nombre, email, nivel (`level`) y el tipo de asignación
// (`assignment_type`), ordenados alfabéticamente por nombre.
Fight.getAssignedJudges = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.level::text AS level,
      ja.assignment_type::text
    FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_id
    WHERE ja.fight_id = $1
    ORDER BY u.name
  `, [fightId]);
  return rows;
};

// Trae la tarjeta oficial de puntuación de la pelea (puntos totales de cada
// esquina, winner y timestamps) desde `official_cards`, o null si aún no existe.
Fight.getOfficialCard = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT id, total_score_red, total_score_blue, winner, created_at
    FROM official_cards
    WHERE fight_id = $1
  `, [fightId]);
  return rows[0] || null;
};

// Resumen del análisis de desempeño de cada juez en la pelea. JOIN con `users`
// para el nombre y expone matches (asaltos coincidentes), errors (asaltos en
// desacuerdo con la tarjeta oficial) y match_pct (porcentaje de coincidencia).
Fight.getAnalysisSummary = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      ar.judge_id,
      u.name AS judge_name,
      ar.matches,
      ar.errors,
      ar.match_pct
    FROM analysis_results ar
    JOIN users u ON u.id = ar.judge_id
    WHERE ar.fight_id = $1
    ORDER BY u.name
  `, [fightId]);
  return rows;
};

// Transición de estado activo → completado. La condición `status = 'active'`
// actúa como guarda: si la pelea no está activa no se modifica nada (devuelve
// null), evitando completar peleas archivadas o pendientes.
Fight.complete = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'completed'
    WHERE id = $1 AND status = 'active'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

// Transición de estado pendiente → activo (guarda equivalente a `complete`):
// solo afecta peleas cuyo estado actual sea 'pending'.
Fight.activate = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'active'
    WHERE id = $1 AND status = 'pending'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

// Registra el resultado final de la pelea (tipo, ganador, round, tiempo y el
// usuario responsable). El `CASE` fuerza `status = 'completed'` cuando el tipo
// de resultado es definitivo (ko, tko, rtd, dq, nc); para el resto de tipos
// conserva el estado actual. `result_type` se castea al enum `fight_result_type`
// y `result_registered_at` toma `NOW()`. Los campos opcionales se normalizan
// con `|| null`.
Fight.registerResult = async (id, data) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET
      result_type = $2::fight_result_type,
      result_winner = $3,
      result_round = $4,
      result_time = $5,
      result_registered_by = $6,
      result_registered_at = NOW(),
      status = CASE
        WHEN $2::fight_result_type IN ('ko', 'tko', 'rtd', 'dq', 'nc') THEN 'completed'
        ELSE status
      END
    WHERE id = $1
    RETURNING
      id,
      status::text,
      result_type::text,
      result_winner,
      result_round,
      result_time,
      result_registered_by,
      result_registered_at
  `, [
    id,
    data.result_type,
    data.result_winner || null,
    data.result_round || null,
    data.result_time || null,
    data.result_registered_by,
  ]);
  return rows[0] || null;
};

// Detalle asalto por asalto comparando la puntuación del juez contra la oficial.
// UNION ALL de dos orígenes:
//   1) Jueces de evaluación: `round_scores` + `score_cards' (solo finalizadas)
//      contra `official_cards` + `official_round_scores`, alineando por round.
//   2) Jueces oficiales: `official_judge_round_scores` + `official_judge_cards`
//      contra `official_cards` + `official_round_scores`.
// Ambos descartan asaltos posteriores al resultado (`round_number <= result_round`
// o `total_rounds` si el resultado no indicó round), pues no se puntúan asaltos
// que no se disputaron. El subquery resultante se ordena por juez y round.
Fight.getRoundDetail = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT
      judge_id,
      round_number,
      judge_score_red,
      judge_score_blue,
      official_score_red,
      official_score_blue
    FROM (
      -- Evaluation judges: score_cards + round_scores
      SELECT
        sc.judge_id,
        rs.round_number,
        rs.final_score_red  AS judge_score_red,
        rs.final_score_blue AS judge_score_blue,
        ors.final_score_red AS official_score_red,
        ors.final_score_blue AS official_score_blue
      FROM round_scores rs
      JOIN score_cards sc ON sc.id = rs.score_card_id
      JOIN official_cards oc ON oc.fight_id = sc.fight_id
      JOIN official_round_scores ors ON ors.official_card_id = oc.id AND ors.round_number = rs.round_number
      JOIN fights f ON f.id = sc.fight_id
      WHERE sc.fight_id = $1 AND sc.status = 'finalized'
        AND rs.round_number <= COALESCE(NULLIF(f.result_round, 0), f.total_rounds)

      UNION ALL

      -- Official judges: official_judge_cards + official_judge_round_scores
      SELECT
        ojc.judge_id,
        ojrs.round_number,
        ojrs.final_score_red  AS judge_score_red,
        ojrs.final_score_blue AS judge_score_blue,
        ors.final_score_red   AS official_score_red,
        ors.final_score_blue  AS official_score_blue
      FROM official_judge_round_scores ojrs
      JOIN official_judge_cards ojc ON ojc.id = ojrs.official_judge_card_id
      JOIN official_cards oc ON oc.fight_id = ojc.fight_id
      JOIN official_round_scores ors ON ors.official_card_id = oc.id AND ors.round_number = ojrs.round_number
      JOIN fights f ON f.id = ojc.fight_id
      WHERE ojc.fight_id = $1
        AND ojrs.round_number <= COALESCE(NULLIF(f.result_round, 0), f.total_rounds)
    ) all_rounds
    ORDER BY judge_id, round_number
  `, [fightId]);
  return rows;
};

// Cuenta los asaltos que los jueces puntuaron DESPUÉS de que la pelea terminó
// (`round_number > result_round` o `total_rounds`) sobre tarjetas finalizadas.
// Es un indicador de error de registro: detecta asaltos sobrantes puntuados.
Fight.countRoundsBeyondFinish = async (fightId) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::INTEGER AS count
    FROM round_scores rs
    JOIN score_cards sc ON sc.id = rs.score_card_id
    JOIN fights f ON f.id = sc.fight_id
    WHERE sc.fight_id = $1
      AND sc.status = 'finalized'
      AND rs.round_number > COALESCE(NULLIF(f.result_round, 0), f.total_rounds)
  `, [fightId]);
  return rows[0]?.count || 0;
};

// Ejecuta la función almacenada `fn_calculate_analysis($1)` que recalcula en la
// base todos los resultados de análisis de los jueces (matches, errors, match_pct
// y consistencia entre pares) para la pelea indicada.
Fight.analyze = async (id) => {
  const { rows } = await pool.query(`
    SELECT * FROM fn_calculate_analysis($1)
  `, [id]);
  return rows;
};

// Ajusta el número mínimo de jueces requeridos para validar la pelea. Sin
// RETURNING: es una escritura de configuración de negocio, no de consulta.
Fight.updateMinJudgesRequired = async (fightId, count) => {
  await pool.query(
    'UPDATE fights SET min_judges_required = $1 WHERE id = $2',
    [count, fightId]
  );
};

// Archiva la pelea (status = 'archived' + timestamp). La condición
// `status != 'archived'` evita re-archivar; devuelve la fila o null.
Fight.archive = async (id) => {
  const { rows } = await pool.query(`
    UPDATE fights
    SET status = 'archived', archived_at = NOW()
    WHERE id = $1 AND status != 'archived'
    RETURNING id, status::text
  `, [id]);
  return rows[0] || null;
};

// Historial de peleas archivadas con filtros opcionales construidos de forma
// dinámica (los índices `$n` se calculan con `paramIndex` en orden de llegada):
//   - searchEvent: búsqueda parcial del nombre del evento (ILIKE).
//   - dateFrom / dateTo: rango de fechas de la pelea.
//   - weightClass: categoría de peso exacta.
// `LEFT JOIN LATERAL` agrega por pelea los resultados de `analysis_results`
// (AVG de match_pct, SUM de matches y SUM de errors) para mostrar el desempeño
// promedio de los jueces en cada pelea archivada.
Fight.getHistory = async (filters = {}) => {
  let query = `
    SELECT
      f.id,
      f.event_name,
      f.boxer_red,
      f.boxer_blue,
      f.scheduled_date,
      f.weight_class,
      f.venue,
      f.title,
      f.broadcaster,
      f.status::text,
      f.total_rounds,
      f.archived_at,
      f.created_at,
      COALESCE(ar_agg.avg_match_pct, 0)::NUMERIC(5,2) AS avg_match_pct,
      COALESCE(ar_agg.total_matches, 0)::INTEGER AS total_matches,
      COALESCE(ar_agg.total_errors, 0)::INTEGER AS total_errors
    FROM fights f
    LEFT JOIN LATERAL (
      SELECT
        AVG(ar.match_pct) AS avg_match_pct,
        SUM(ar.matches) AS total_matches,
        SUM(ar.errors) AS total_errors
      FROM analysis_results ar
      WHERE ar.fight_id = f.id
    ) ar_agg ON true
    WHERE f.status = 'archived'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.searchEvent) {
    query += ` AND f.event_name ILIKE $${paramIndex}`;
    params.push(`%${filters.searchEvent}%`);
    paramIndex++;
  }

  if (filters.dateFrom) {
    query += ` AND f.scheduled_date >= $${paramIndex}`;
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    query += ` AND f.scheduled_date <= $${paramIndex}`;
    params.push(filters.dateTo);
    paramIndex++;
  }

  if (filters.weightClass) {
    query += ` AND f.weight_class = $${paramIndex}`;
    params.push(filters.weightClass);
    paramIndex++;
  }

  query += ` ORDER BY f.archived_at DESC, f.scheduled_date DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
};

module.exports = Fight;
