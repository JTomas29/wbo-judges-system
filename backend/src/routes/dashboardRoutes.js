// ─── dashboardRoutes.js — Rutas del panel principal (dashboard) ───
// Prefijo: /api/dashboard — requiere autenticación JWT.

const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/dashboard/ — datos agregados del panel principal
// (resumen de peleas, jueces, asignaciones, etc. según el rol).
router.get('/', getDashboard);

module.exports = router;
