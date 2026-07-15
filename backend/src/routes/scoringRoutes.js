const { Router } = require('express');
const { saveRound, finalizeScorecard } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('judge'));

router.post('/:id/rounds', saveRound);
router.patch('/:id/finalize', finalizeScorecard);

module.exports = router;
