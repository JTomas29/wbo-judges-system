const { Router } = require('express');
const { create, update, getByFight, remove } = require('../controllers/refereeEvaluationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// POST /api/referee-evaluations - Solo supervisor de la pelea
router.post('/', roleMiddleware('supervisor'), create);

// PUT /api/referee-evaluations/:id - Solo supervisor de la pelea
router.put('/:id', roleMiddleware('supervisor'), update);

// DELETE /api/referee-evaluations/:id - Solo supervisor de la pelea
router.delete('/:id', roleMiddleware('supervisor'), remove);

// GET /api/referee-evaluations/fight/:fightId - Solo supervisor de la pelea
router.get('/fight/:fightId', roleMiddleware('supervisor'), getByFight);

module.exports = router;
