const { Router } = require('express');
const { get, create } = require('../controllers/officialCardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/:id/official-card', get);
router.post('/:id/official-card', roleMiddleware('admin', 'supervisor'), create);

module.exports = router;
