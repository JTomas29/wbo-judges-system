const { Router } = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/fightController');
const { assign, remove: removeAssignment, list, respond } = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', roleMiddleware('admin'), create);
router.put('/:id', roleMiddleware('admin'), update);
router.delete('/:id', roleMiddleware('admin'), remove);

// Asignaciones de jueces
router.post('/:id/assignments', roleMiddleware('admin'), assign);
router.delete('/:id/assignments/:judgeId', roleMiddleware('admin'), removeAssignment);
router.get('/:id/assignments', list);

// Respuesta del juez (confirmar/rechazar)
router.patch('/:id/assignments/respond', respond);

module.exports = router;
