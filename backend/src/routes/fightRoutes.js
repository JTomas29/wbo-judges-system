// ─── fightRoutes.js — Rutas de gestión de peleas y operaciones relacionadas ───
// Prefijo: /api/fights — todo exige autenticación JWT; las acciones de escritura
// están restringidas por rol (admin/supervisor).

const { Router } = require('express');
const { getAll, getById, create, update, archive, complete, activate, analyze, getAnalysis, getHistory, registerResult } = require('../controllers/fightController');
const { assign, remove: removeAssignment, list } = require('../controllers/assignmentController');
const { createOrGetScorecard, getMyScorecard, getAllScorecards } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// Orden importante: las rutas con segmento literal ('/history') se registran
// ANTES que las de ':id' para que Express no las capture como un id de pelea.

// GET /api/fights/history — historial de peleas; solo admin.
router.get('/history', roleMiddleware('admin'), getHistory);

// GET /api/fights/ — listado de peleas (cualquier usuario autenticado).
router.get('/', getAll);

// GET /api/fights/:id — detalle de una pelea.
router.get('/:id', getById);

// POST /api/fights/ — creación de una pelea; admin/supervisor.
router.post('/', roleMiddleware('admin', 'supervisor'), create);

// PUT /api/fights/:id — edición de datos de una pelea; admin/supervisor.
router.put('/:id', roleMiddleware('admin', 'supervisor'), update);

// DELETE /api/fights/:id — archivado (baja lógica) de la pelea; solo admin.
router.delete('/:id', roleMiddleware('admin'), archive);

// Tarjetas de puntuación del juez
// POST /api/fights/:id/scorecards — crea u obtiene la tarjeta de puntuación
// del juez autenticado para la pelea indicada.
router.post('/:id/scorecards', createOrGetScorecard);

// GET /api/fights/:id/scorecards/mine — la tarjeta propia del juez autenticado.
router.get('/:id/scorecards/mine', getMyScorecard);

// Vista en vivo para admin/supervisor — progreso de todos los jueces
// GET /api/fights/:id/scorecards — tarjetas de todos los jueces asignados;
// visibilidad restringida a admin/supervisor.
router.get('/:id/scorecards', roleMiddleware('admin', 'supervisor'), getAllScorecards);

// Finalizar pelea (admin, supervisor)
// POST /api/fights/:id/complete — cierra la pelea y congela los puntajes.
router.post('/:id/complete', roleMiddleware('admin', 'supervisor'), complete);

// Activar pelea manualmente (admin, supervisor)
// POST /api/fights/:id/activate — permite reabrir/activar la pelea en vivo.
router.post('/:id/activate', roleMiddleware('admin', 'supervisor'), activate);

// Registrar resultado oficial — SOLO supervisor (KO, TKO, RTD, DQ, NC o Decisión)
// POST /api/fights/:id/result — registra el resultado oficial de la pelea.
router.post('/:id/result', roleMiddleware('supervisor'), registerResult);

// Ejecutar análisis (admin, supervisor)
// POST /api/fights/:id/analyze — dispara (o regenera) el análisis de la pelea.
router.post('/:id/analyze', roleMiddleware('admin', 'supervisor'), analyze);

// Ver análisis (admin, supervisor, judge)
// GET /api/fights/:id/analysis — consulta el análisis de la pelea.
router.get('/:id/analysis', getAnalysis);

// Asignaciones de jueces
// POST /api/fights/:id/assignments — asigna un juez a la pelea; admin/supervisor.
router.post('/:id/assignments', roleMiddleware('admin', 'supervisor'), assign);

// DELETE /api/fights/:id/assignments/:judgeId — quita la asignación de un juez.
router.delete('/:id/assignments/:judgeId', roleMiddleware('admin', 'supervisor'), removeAssignment);

// GET /api/fights/:id/assignments — lista los jueces asignados a la pelea.
router.get('/:id/assignments', list);

module.exports = router;
