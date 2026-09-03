const { Router } = require('express');
const { generateJudgePdf, generateRefereePdf } = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/judges/:id/pdf', roleMiddleware('admin', 'supervisor'), generateJudgePdf);
router.get('/referees/:id/pdf', roleMiddleware('admin', 'supervisor'), generateRefereePdf);

module.exports = router;
