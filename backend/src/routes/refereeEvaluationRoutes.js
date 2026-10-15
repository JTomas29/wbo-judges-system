// ─── refereeEvaluationRoutes.js — Evaluaciones de árbitros por pelea ───
// Prefijo: /api/referee-evaluations — JWT obligatorio; todas las operaciones
// están restringidas al rol 'supervisor'.

const { Router } = require('express');
const { create, update, getByFight, remove } = require('../controllers/refereeEvaluationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// POST /api/referee-evaluations - Solo supervisor de la pelea
// Registra la evaluación del árbitro para una pelea.
router.post('/', roleMiddleware('supervisor'), create);

// PUT /api/referee-evaluations/:id - Solo supervisor de la pelea
// Actualiza una evaluación existente.
router.put('/:id', roleMiddleware('supervisor'), update);

// DELETE /api/referee-evaluations/:id - Solo supervisor de la pelea
// Elimina la evaluación indicada.
router.delete('/:id', roleMiddleware('supervisor'), remove);

// GET /api/referee-evaluations/fight/:fightId - Solo supervisor de la pelea
// Consulta la evaluación de una pelea. El segmento literal 'fight'
// evita conflicto con ':id' porque este path tiene dos segmentos.
router.get('/fight/:fightId', roleMiddleware('supervisor'), getByFight);

module.exports = router;
