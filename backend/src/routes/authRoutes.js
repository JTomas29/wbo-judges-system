// ─── authRoutes.js — Rutas de autenticación: registro, login y datos propios ───
// Prefijo: /api/auth.

const { Router } = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// POST /api/auth/register — crea un usuario; SOLO administradores
// (exige autenticación JWT + rol 'admin' antes del controller).
router.post('/register', authMiddleware, roleMiddleware('admin'), authController.register);

// POST /api/auth/login — intercambia credenciales (email/contraseña) por un JWT.
// No requiere autenticación previa: es la puerta de entrada al sistema.
router.post('/login', authController.login);

// GET /api/auth/me — devuelve los datos del usuario autenticado según su token.
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
