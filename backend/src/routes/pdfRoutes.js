// ─── pdfRoutes.js — Generación de PDFs de perfil (jueces y árbitros) ───
// Prefijo: /api/profile — requiere autenticación JWT; la generación de PDFs
// está restringida a admin/supervisor.

const { Router } = require('express');
const { generateJudgePdf, generateRefereePdf } = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

// Autenticación global del router.
router.use(authMiddleware);

// GET /api/profile/judges/:id/pdf — genera el PDF del perfil completo de un juez
// (historial, estadísticas, observaciones); solo admin/supervisor.
router.get('/judges/:id/pdf', roleMiddleware('admin', 'supervisor'), generateJudgePdf);

// GET /api/profile/referees/:id/pdf — genera el PDF del perfil completo de un
// árbitro; solo admin/supervisor.
router.get('/referees/:id/pdf', roleMiddleware('admin', 'supervisor'), generateRefereePdf);

module.exports = router;
