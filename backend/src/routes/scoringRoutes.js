// ─── scoringRoutes.js — Tarjeta de puntuación del juez (asalto por asalto) ───
// Prefijo: /api/scorecards — exige autenticación JWT y, además, rol 'judge':
// únicamente un juez puede llenar y finalizar su propia tarjeta.

const { Router } = require('express');
const { saveRound, finalizeScorecard } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);
// Todo el router queda restringido al rol 'judge'.
router.use(roleMiddleware('judge'));

// POST /api/scorecards/:id/rounds — guarda la puntuación de un asalto
// dentro de la tarjeta de puntuación :id.
router.post('/:id/rounds', saveRound);

// PATCH /api/scorecards/:id/finalize — marca la tarjeta como finalizada
// (envío oficial de la puntuación del juez).
router.patch('/:id/finalize', finalizeScorecard);

module.exports = router;
