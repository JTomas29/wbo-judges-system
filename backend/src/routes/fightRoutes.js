const { Router } = require('express');
const { getAll, getById, create, update, remove, complete, analyze, getAnalysis } = require('../controllers/fightController');
const { assign, remove: removeAssignment, list, respond } = require('../controllers/assignmentController');
const { createOrGetScorecard, getMyScorecard, getAllScorecards } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', roleMiddleware('admin', 'supervisor'), create);
router.put('/:id', roleMiddleware('admin', 'supervisor'), update);
router.delete('/:id', roleMiddleware('admin', 'supervisor'), remove);

// Tarjetas de puntuación del juez
router.post('/:id/scorecards', createOrGetScorecard);
router.get('/:id/scorecards/mine', getMyScorecard);

// Vista en vivo para admin/supervisor — progreso de todos los jueces
router.get('/:id/scorecards', roleMiddleware('admin', 'supervisor'), getAllScorecards);

// Finalizar pelea (admin)
router.post('/:id/complete', roleMiddleware('admin'), complete);

// Ejecutar análisis (admin)
router.post('/:id/analyze', roleMiddleware('admin'), analyze);

// Ver análisis (admin, supervisor, judge)
router.get('/:id/analysis', getAnalysis);

// Asignaciones de jueces
router.post('/:id/assignments', roleMiddleware('admin'), assign);
router.delete('/:id/assignments/:judgeId', roleMiddleware('admin'), removeAssignment);
router.get('/:id/assignments', list);

// Respuesta del juez (confirmar/rechazar)
router.patch('/:id/assignments/respond', respond);

module.exports = router;
