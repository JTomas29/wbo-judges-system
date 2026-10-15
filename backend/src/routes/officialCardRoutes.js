// ─── officialCardRoutes.js — Tarjeta oficial de puntuación de una pelea ───
// Prefijo: /api/fights — se monta con app.use('/api/fights', ...), por eso sus
// rutas cuelgan del parámetro :id de la pelea. Requiere autenticación JWT.

const { Router } = require('express');
const { get, create } = require('../controllers/officialCardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/fights/:id/official-card — obtener la tarjeta oficial de la pelea :id.
router.get('/:id/official-card', get);

// POST /api/fights/:id/official-card — crear la tarjeta oficial de la pelea;
// solo admin/supervisor (es un dato emitido por la organización).
router.post('/:id/official-card', roleMiddleware('admin', 'supervisor'), create);

module.exports = router;
