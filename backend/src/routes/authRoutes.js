const { Router } = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
