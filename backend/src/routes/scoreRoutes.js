const { Router } = require('express');
const { submit, getByFight, getLive } = require('../controllers/scoreController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/', submit);
router.get('/:fightId', getByFight);
router.get('/live/:fightId', getLive);

module.exports = router;
