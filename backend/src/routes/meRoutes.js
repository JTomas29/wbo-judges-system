// ─── meRoutes.js — Rutas del "usuario actual" orientadas al juez ───
// Prefijo: /api/me — requiere autenticación JWT.

const { Router } = require('express');
const { myAssignments } = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/me/assignments — asignaciones del juez autenticado (dónde debe trabajar).
// Restringido al rol 'judge': solo el juez puede ver SUS propias asignaciones.
router.get('/assignments', roleMiddleware('judge'), myAssignments);

module.exports = router;
