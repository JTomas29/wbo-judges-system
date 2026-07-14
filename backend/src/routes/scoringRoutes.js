const { Router } = require('express');
const { saveRound } = require('../controllers/scoringController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/:id/rounds', saveRound);

module.exports = router;
