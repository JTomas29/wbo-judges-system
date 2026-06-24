const { Router } = require('express');
const { getAll, assign, getAssignments } = require('../controllers/judgeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAll);
router.post('/assign', assign);
router.get('/assignments/:fightId', getAssignments);

module.exports = router;
