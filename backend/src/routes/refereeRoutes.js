// ─── refereeRoutes.js — Rutas de gestión de árbitros ───
// Prefijo: /api/referees — JWT obligatorio; consultas para admin/supervisor
// y escritura restringida a admin.

const { Router } = require('express');
const { getAll, getById, getRanking, getProfile, create, update, delete: deleteReferee } = require('../controllers/refereeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// Orden importante: las rutas con segmento literal ('/ranking', '/:id/profile')
// se registran antes de '/:id' para que Express no las tome como un id de árbitro.

// GET /api/referees/ranking — ranking de árbitros; admin/supervisor.
router.get('/ranking', roleMiddleware('admin', 'supervisor'), getRanking);

// GET /api/referees/:id/profile — perfil detallado de un árbitro; admin/supervisor.
router.get('/:id/profile', roleMiddleware('admin', 'supervisor'), getProfile);

// GET /api/referees/ — listado de árbitros; admin/supervisor.
router.get('/', roleMiddleware('admin', 'supervisor'), getAll);

// GET /api/referees/:id — detalle de un árbitro; admin/supervisor.
router.get('/:id', roleMiddleware('admin', 'supervisor'), getById);

// POST /api/referees/ — alta de un nuevo árbitro; solo admin.
router.post('/', roleMiddleware('admin'), create);

// PUT /api/referees/:id — edición de los datos de un árbitro; solo admin.
router.put('/:id', roleMiddleware('admin'), update);

// DELETE /api/referees/:id — baja de un árbitro; solo admin.
router.delete('/:id', roleMiddleware('admin'), deleteReferee);

module.exports = router;
