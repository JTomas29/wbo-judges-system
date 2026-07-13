const { Router } = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/fightController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', roleMiddleware('admin'), create);
router.put('/:id', roleMiddleware('admin'), update);
router.delete('/:id', roleMiddleware('admin'), remove);

module.exports = router;
