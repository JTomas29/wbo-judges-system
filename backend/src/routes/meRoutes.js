const { Router } = require('express');
const { myAssignments } = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/assignments', roleMiddleware('judge'), myAssignments);

module.exports = router;
