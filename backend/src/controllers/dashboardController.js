// ─── dashboardController.js — Resumen del panel de inicio ───
// Responsabilidad: agregar las métricas de cabecera del dashboard: cantidad
// de peleas (total/activas/finalizadas), total de jueces activos, las peleas
// más recientes con su cupo de jueces confirmados y el top 5 de jueces por
// desempeño. Para el rol 'judge' no se exponen los rankings de los demás.

const { pool } = require('../config/db');

// GET /api/dashboard
// Arma el resumen del panel según el rol del usuario autenticado.
// Espera: req.user (inyectado por authMiddleware).
// Devuelve: 200 con { stats, recent_fights, active_judges }.
// Errores: solo los del servidor (manejados por next(err)).
const getDashboard = async (req, res, next) => {
  try {
    // Conteo de peleas por estado en una sola pasada sobre la tabla
    // 'fights', excluyendo las archivadas del total visible.
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'archived')::INTEGER AS total_fights,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_fights,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_fights
      FROM fights
    `);
    // Jueces habilitados del sistema (rol 'judge' y activos) para el conteo.
    const judgesResult = await pool.query(`
      SELECT COUNT(*)::INTEGER AS total_judges
      FROM users
      WHERE role = 'judge' AND is_active = TRUE
    `);

    // Últimas 4 peleas visibles. Se hace LEFT JOIN con un subquery que
    // cuenta las asignaciones por pelea (confirmed_count) para mostrar el
    // cupo de jueces sin perder peleas que aún no tienen asignaciones.
    const recentFightsResult = await pool.query(`
      SELECT
        f.id,
        f.event_name,
        f.boxer_red,
        f.boxer_blue,
        f.scheduled_date,
        f.status::text,
        f.total_rounds,
        COALESCE(ja.confirmed_count, 0)::INTEGER AS confirmed_judges
      FROM fights f
      LEFT JOIN (
        SELECT fight_id, COUNT(*) AS confirmed_count
        FROM judge_assignments
        GROUP BY fight_id
      ) ja ON ja.fight_id = f.id
      WHERE f.status != 'archived'
      ORDER BY f.created_at DESC
      LIMIT 4
    `);

    // Top 5 jueces por promedio de acierto. La CTE 'judge_stats' agrega por
    // juez la vista v_judge_performance: promedio de match, tarjetas,
    // matches y errores. Se cruza con 'users' para traer el email y filtrar
    // sólo jueces activos, ordenando de mayor a menor acierto (los nulos al
    // final).
    const activeJudgesResult = await pool.query(`
      WITH judge_stats AS (
        SELECT
          judge_id,
          judge_name,
          ROUND(AVG(avg_match_pct), 2) AS overall_avg_pct,
          SUM(cards_compared) AS total_cards,
          SUM(total_matches) AS total_matches,
          SUM(total_errors) AS total_errors
        FROM v_judge_performance
        GROUP BY judge_id, judge_name
      )
      SELECT
        js.judge_id,
        js.judge_name,
        js.overall_avg_pct,
        js.total_cards,
        js.total_matches,
        js.total_errors,
        u.email
      FROM judge_stats js
      JOIN users u ON u.id = js.judge_id
      WHERE u.is_active = TRUE
      ORDER BY js.overall_avg_pct DESC NULLS LAST
      LIMIT 5
    `);

    // A un juez no se le muestran los rankings de sus colegas.
    const isJudge = req.user.role === 'judge';

    res.json({
      stats: {
        total_fights: statsResult.rows[0].total_fights,
        active_fights: statsResult.rows[0].active_fights,
        completed_fights: statsResult.rows[0].completed_fights,
        total_judges: judgesResult.rows[0].total_judges,
      },
      recent_fights: recentFightsResult.rows,
      // Solo se expone la lista de jueces destacados a roles no-juez.
      active_judges: isJudge ? [] : activeJudgesResult.rows.map(j => ({
        id: j.judge_id,
        name: j.judge_name,
        email: j.email,
        // Normalizamos a número: null si no hay aciertos todavía.
        avg_match_pct: j.overall_avg_pct !== null ? Number(j.overall_avg_pct) : null,
        total_analyzed: Number(j.total_cards),
        total_matches: Number(j.total_matches),
        total_errors: Number(j.total_errors),
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
