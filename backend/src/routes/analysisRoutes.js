const { Router } = require('express');
const { getFightAnalysis, getStatistics } = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/fight/:fightId', getFightAnalysis);
router.get('/statistics', getStatistics);

module.exports = router;
