// ─── officialJudgeCardRoutes.js — Tarjetas oficiales POR JUEZ de una pelea ───
// Prefijo: /api/fights — se monta con app.use('/api/fights', ...).
// Permite consultar/crear/actualizar las tarjetas oficiales individuales de cada
// juez asignado a una pelea. Requiere autenticación JWT.

const { Router } = require('express');
const { list, get, create, update } = require('../controllers/officialJudgeCardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/fights/:id/official-judge-cards — lista las tarjetas oficiales
// de todos los jueces para la pelea :id.
router.get('/:id/official-judge-cards', list);

// POST /api/fights/:id/official-judge-cards — crea la tarjeta oficial de un juez;
// solo admin/supervisor.
router.post('/:id/official-judge-cards', roleMiddleware('admin', 'supervisor'), create);

// GET /api/fights/official-judge-cards/:cardId — detalle de una tarjeta específica.
// Se declara después de las rutas '/:id/...' porque su primer segmento es literal.
router.get('/official-judge-cards/:cardId', get);

// PUT /api/fights/official-judge-cards/:cardId — edita la tarjeta oficial de un
// juez; solo admin/supervisor.
router.put('/official-judge-cards/:cardId', roleMiddleware('admin', 'supervisor'), update);

module.exports = router;
