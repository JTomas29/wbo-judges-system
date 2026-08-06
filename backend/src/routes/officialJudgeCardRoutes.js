const { Router } = require('express');
const { list, get, create, update } = require('../controllers/officialJudgeCardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/:id/official-judge-cards', list);
router.post('/:id/official-judge-cards', roleMiddleware('admin', 'supervisor'), create);

router.get('/official-judge-cards/:cardId', get);
router.put('/official-judge-cards/:cardId', roleMiddleware('admin', 'supervisor'), update);

module.exports = router;
