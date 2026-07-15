const { Router } = require('express');
const { getAllStatistics, getJudgeStatistics } = require('../controllers/statisticsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAllStatistics);
router.get('/:judgeId', getJudgeStatistics);

module.exports = router;
