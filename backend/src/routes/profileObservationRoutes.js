// ─── profileObservationRoutes.js — Observaciones de perfil (jueces/árbitros) ───
// Prefijo: /api/profile-observations — JWT obligatorio; el CRUD de observaciones
// está restringido a admin/supervisor.

const { Router } = require('express');
const { getByJudge, getByReferee, create, update, delete: remove } = require('../controllers/profileObservationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// Observaciones de un juez
// GET /api/profile-observations/judge/:judgeId — observaciones anotadas a un juez.
router.get('/judge/:judgeId', roleMiddleware('admin', 'supervisor'), getByJudge);

// Observaciones de un árbitro
// GET /api/profile-observations/referee/:refereeId — observaciones de un árbitro.
router.get('/referee/:refereeId', roleMiddleware('admin', 'supervisor'), getByReferee);

// Crear observación (admin/supervisor)
// POST /api/profile-observations/ — registra una nueva observación.
router.post('/', roleMiddleware('admin', 'supervisor'), create);

// Editar observación (admin/supervisor)
// PUT /api/profile-observations/:id — actualiza una observación existente.
router.put('/:id', roleMiddleware('admin', 'supervisor'), update);

// Eliminar observación (admin/supervisor)
// DELETE /api/profile-observations/:id — borra una observación.
router.delete('/:id', roleMiddleware('admin', 'supervisor'), remove);

module.exports = router;
