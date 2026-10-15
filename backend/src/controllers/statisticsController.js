// ─── statisticsController.js — Estadísticas de desempeño de jueces ───
// Responsabilidad: exponer las estadísticas globales (ranking de jueces) y
// las individuales por juez, calculadas sobre las vistas v_judge_history y
// analysis_results.

const { pool } = require('../config/db');

// GET /api/statistics/judges — Set completo del ranking de jueces.
// Si el usuario autenticado es juez, sólo ve sus propios datos.
// Espera: req.user = { role, id }.
// Devuelve: 200 con el array de estadísticas de cada juez.
// Errores: sólo del servidor.
const getAllStatistics = async (req, res, next) => {
  try {
    const { role, id } = req.user;

    // Preparación de la query; el rol define el alcance de los datos:
    // un juez consulta UNICAMENTE su propio histórico.
    let query;
    let params;

    if (role === 'judge') {
      query = `
        SELECT judge_id, judge_name, level, total_fights,
               total_rounds_judged, avg_match_pct, last_5_avg_pct
        FROM v_judge_history
        WHERE judge_id = $1
        ORDER BY avg_match_pct DESC NULLS LAST
      `;
      params = [id];
    } else {
      // Admin/supervisor ven el ranking completo de todos los jueces.
      query = `
        SELECT judge_id, judge_name, level, total_fights,
               total_rounds_judged, avg_match_pct, last_5_avg_pct
        FROM v_judge_history
        ORDER BY avg_match_pct DESC NULLS LAST
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    // Normalizamos los tipos de la vista (algunos vienen como string/numeric).
    res.json(result.rows.map((r) => ({
      id: r.judge_id,
      name: r.judge_name,
      level: r.level,
      total_fights: Number(r.total_fights),
      total_rounds: Number(r.total_rounds_judged),
      avg_match_pct: Number(r.avg_match_pct),
      last_5_avg: Number(r.last_5_avg_pct),
    })));
  } catch (err) {
    next(err);
  }
};

// GET /api/statistics/judges/:judgeId — Estadísticas detalladas de un juez.
// Espera: req.params.judgeId; req.user = { role, id }.
// Devuelve: 200 con { id, name, level, total_fights, total_rounds,
// avg_match_pct, last_5_avg, history }.
// Errores: 403 (permisos), 404 (juez no encontrado).
const getJudgeStatistics = async (req, res, next) => {
  try {
    const judgeId = parseInt(req.params.judgeId, 10);
    const { role, id } = req.user;

    // Un juez sólo puede consultar su propio desempeño, no el de colegas.
    if (role === 'judge' && id !== judgeId) {
      return res.status(403).json({ message: 'No puedes consultar estadísticas de otro juez' });
    }

    // Datos generales del juez desde la vista de histórico agregado.
    const generalResult = await pool.query(`
      SELECT judge_id, judge_name, level, total_fights,
             total_rounds_judged, avg_match_pct, last_5_avg_pct
      FROM v_judge_history
      WHERE judge_id = $1
    `, [judgeId]);

    // Si el juez no tiene histórico (peleas analizadas), devolvemos un perfil
    // en cero siempre que el usuario exista con rol 'judge'; si ni siquiera
    // existe el usuario, es 404.
    if (generalResult.rows.length === 0) {
      const userCheck = await pool.query(
        'SELECT id, name FROM users WHERE id = $1 AND role = $2',
        [judgeId, 'judge']
      );
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Juez no encontrado' });
      }
      // Sin peleas analizadas los promedios se devuelven en null (no 0):
      // un 0 aquí se lee como "acertó 0%" en vez de "sin datos".
      return res.json({
        id: judgeId,
        name: userCheck.rows[0].name,
        level: null,
        total_fights: 0,
        total_rounds: 0,
        avg_match_pct: null,
        last_5_avg: null,
        total_errors: 0,
        total_matches: 0,
        stale_fights: 0,
        history: [],
      });
    }

    const g = generalResult.rows[0];

    // v_judge_history usa LEFT JOIN y COALESCE, así que un juez sin peleas
    // analizadas igual devuelve una fila con los promedios en 0. Sin peleas no
    // hay promedio: se devuelve null para que la UI no muestre "0%" de acierto.
    const hasHistory = Number(g.total_fights) > 0;
    const avgMatchPct = hasHistory ? Number(g.avg_match_pct) : null;
    const last5Avg = hasHistory ? Number(g.last_5_avg_pct) : null;

    // Historial pelea por pelea del juez: se cruza la tabla analysis_results
    // con 'fights' (para nombre/fecha del evento) y 'users' (para el nivel),
    // ordenado de la pelea más reciente a la más antigua.
    // Historial pelea por pelea del juez. Se cruza analysis_results con
    // 'fights' (evento, fecha, boxeadores, resultado oficial registrado) y con
    // 'official_cards' mediante ar.official_card_id para la TARJETA DE REFERENCIA
    // (ganador y marcador de la referencia) — que es el mismo criterio que usa
    // fn_calculate_analysis.
    //
    // analysis_valid = la tarjeta de referencia conserva sus rounds
    // (official_round_scores). Si no los tiene, el snapshot de analysis_results
    // es histórico pero ya NO es recalculable: fn_calculate_analysis devolvería
    // 0 comparaciones. Se marca en vez de ocultarse para no inventar ni borrar.
    const historyResult = await pool.query(`
      SELECT
        ar.fight_id,
        f.event_name,
        f.scheduled_date,
        f.boxer_blue,
        f.boxer_red,
        f.result_type::text AS fight_result_type,
        f.result_winner    AS fight_result_winner,
        oc.winner           AS official_winner,
        oc.total_score_red  AS official_score_red,
        oc.total_score_blue AS official_score_blue,
        ar.match_pct,
        ar.matches,
        ar.errors,
        u.level,
        EXISTS (
          SELECT 1 FROM official_round_scores ors
          WHERE ors.official_card_id = ar.official_card_id
        ) AS analysis_valid
      FROM analysis_results ar
      JOIN fights f ON f.id = ar.fight_id
      JOIN users u ON u.id = ar.judge_id
      LEFT JOIN official_cards oc ON oc.id = ar.official_card_id
      WHERE ar.judge_id = $1
      ORDER BY f.scheduled_date DESC
    `, [judgeId]);

    // Totales de errores y coincidencias: se agregan de las MISMAS filas del
    // historial ya descargado, sin consultas ni tablas adicionales. La
    // clasificación por cantidad de errores (Excelente/Muy bueno/Bueno/
    // Regular/Malo) se calcula en el frontend sobre total_errors.
    const totalErrors = historyResult.rows.reduce((a, h) => a + Number(h.errors || 0), 0);
    const totalMatches = historyResult.rows.reduce((a, h) => a + Number(h.matches || 0), 0);
    const staleFights = historyResult.rows.filter((h) => !h.analysis_valid).length;

    // Respuesta final: datos generales + historial normalizado a número.
    res.json({
      id: g.judge_id,
      name: g.judge_name,
      level: g.level,
      total_fights: Number(g.total_fights),
      total_rounds: Number(g.total_rounds_judged),
      avg_match_pct: avgMatchPct,
      last_5_avg: last5Avg,
      total_errors: totalErrors,
      total_matches: totalMatches,
      stale_fights: staleFights,
      history: historyResult.rows.map((h) => ({
        fight_id: h.fight_id,
        event_name: h.event_name,
        scheduled_date: h.scheduled_date,
        boxer_blue: h.boxer_blue,
        boxer_red: h.boxer_red,
        fight_result_type: h.fight_result_type,
        fight_result_winner: h.fight_result_winner,
        official_winner: h.official_winner,
        official_score_red: h.official_score_red === null ? null : Number(h.official_score_red),
        official_score_blue: h.official_score_blue === null ? null : Number(h.official_score_blue),
        match_pct: Number(h.match_pct),
        matches: Number(h.matches),
        errors: Number(h.errors),
        level: h.level,
        analysis_valid: h.analysis_valid === true,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllStatistics, getJudgeStatistics };
