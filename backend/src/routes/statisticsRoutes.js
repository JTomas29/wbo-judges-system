// ─── statisticsRoutes.js — Estadísticas de jueces ───
// Prefijo: /api/statistics — requiere autenticación JWT.

const { Router } = require('express');
const { getAllStatistics, getJudgeStatistics } = require('../controllers/statisticsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/statistics/ — estadísticas globales de todos los jueces.
router.get('/', getAllStatistics);

// GET /api/statistics/:judgeId — estadísticas de un juez concreto.
router.get('/:judgeId', getJudgeStatistics);

module.exports = router;
