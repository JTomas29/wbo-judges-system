const { Router } = require('express');
const { getAll, getById, getRanking, getProfile, create, update, delete: deleteReferee } = require('../controllers/refereeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/ranking', roleMiddleware('admin', 'supervisor'), getRanking);
router.get('/:id/profile', roleMiddleware('admin', 'supervisor'), getProfile);
router.get('/', roleMiddleware('admin', 'supervisor'), getAll);
router.get('/:id', roleMiddleware('admin', 'supervisor'), getById);
router.post('/', roleMiddleware('admin'), create);
router.put('/:id', roleMiddleware('admin'), update);
router.delete('/:id', roleMiddleware('admin'), deleteReferee);

module.exports = router;
