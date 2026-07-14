const { Router } = require('express');
const { saveRound, finalizeScorecard } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/:id/rounds', saveRound);
router.patch('/:id/finalize', finalizeScorecard);

module.exports = router;
