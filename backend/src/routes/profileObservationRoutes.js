const { Router } = require('express');
const { getByJudge, getByReferee, create, update, delete: remove } = require('../controllers/profileObservationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// Observaciones de un juez
router.get('/judge/:judgeId', roleMiddleware('admin', 'supervisor'), getByJudge);

// Observaciones de un árbitro
router.get('/referee/:refereeId', roleMiddleware('admin', 'supervisor'), getByReferee);

// Crear observación (admin/supervisor)
router.post('/', roleMiddleware('admin', 'supervisor'), create);

// Editar observación (admin/supervisor)
router.put('/:id', roleMiddleware('admin', 'supervisor'), update);

// Eliminar observación (admin/supervisor)
router.delete('/:id', roleMiddleware('admin', 'supervisor'), remove);

module.exports = router;
