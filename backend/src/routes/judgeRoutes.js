const { Router } = require('express');
const { getAll, getById, update, delete: deleteJudge, assign, getAssignments } = require('../controllers/judgeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.put('/:id', roleMiddleware('admin'), update);
router.delete('/:id', roleMiddleware('admin'), deleteJudge);
router.post('/assign', roleMiddleware('admin'), assign);
router.get('/assignments/:fightId', getAssignments);

module.exports = router;
