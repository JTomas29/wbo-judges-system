// ─── judgeRoutes.js — Rutas de gestión de jueces ───
// Prefijo: /api/judges — requiere autenticación JWT; el CRUD se restringe por rol.

const { Router } = require('express');
const { getAll, getById, update, delete: deleteJudge } = require('../controllers/judgeController');
const { getJudgeAssignments } = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/judges/ — listado de jueces; admin/supervisor.
router.get('/', roleMiddleware('admin', 'supervisor'), getAll);

// GET /api/judges/:id — detalle de un juez; admin/supervisor.
router.get('/:id', roleMiddleware('admin', 'supervisor'), getById);

// GET /api/judges/:id/assignments — asignaciones de un juez concreto; admin/supervisor.
router.get('/:id/assignments', roleMiddleware('admin', 'supervisor'), getJudgeAssignments);

// PUT /api/judges/:id — edición de los datos de un juez; solo admin.
router.put('/:id', roleMiddleware('admin'), update);

// DELETE /api/judges/:id — baja de un juez del sistema; solo admin.
router.delete('/:id', roleMiddleware('admin'), deleteJudge);

module.exports = router;
