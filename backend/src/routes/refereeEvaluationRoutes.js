const { Router } = require('express');
const { create, update, getByFight } = require('../controllers/refereeEvaluationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// POST /api/referee-evaluations - Solo supervisor
router.post('/', roleMiddleware('supervisor'), create);

// PUT /api/referee-evaluations/:id - Solo supervisor
router.put('/:id', roleMiddleware('supervisor'), update);

// GET /api/referee-evaluations/fight/:fightId - Supervisor y admin
router.get('/fight/:fightId', roleMiddleware('supervisor', 'admin'), getByFight);

module.exports = router;