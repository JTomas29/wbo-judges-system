// ─── notificationRoutes.js — Rutas de notificaciones por usuario ───
// Prefijo: /api/notifications — todos los endpoints exigen autenticación JWT;
// la identidad del usuario (req.user.id) delimita siempre los datos accesibles.

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
// Se usa el modelo directamente (patrón simple en esta ruta) en lugar de un controller.
const Notification = require('../models/Notification');

const router = Router();
// Autenticación global: a partir de aquí req.user.id está disponible.
router.use(authMiddleware);

// GET /api/notifications — listar notificaciones del usuario
router.get('/', async (req, res, next) => {
  try {
    // Antes de listar, se eliminan notificaciones expiradas de más de 20 días
    // para mantener la tabla limpia sin necesidad de un job por separado.
    await Notification.deleteExpired(20);
    // Paginación mediante query params: 20 por página por defecto, desde el offset 0.
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = await Notification.getByUser(req.user.id, { limit, offset });
    // Conteo de no leídas: útil para mostrar el badge en la interfaz.
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (err) {
    // Cualquier error se delega al errorMiddleware global.
    next(err);
  }
});

// GET /api/notifications/unread-count — conteo de no leídas
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — marcar una como leída
router.patch('/:id/read', async (req, res, next) => {
  try {
    // Se pasa req.user.id para que SOLO el dueño pueda marcar su notificación.
    const notification = await Notification.markAsRead(parseInt(req.params.id), req.user.id);
    // Devuelve null si la notificación no existe o no pertenece al usuario.
    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — marcar todas como leídas
router.patch('/read-all', async (req, res, next) => {
  try {
    const count = await Notification.markAllAsRead(req.user.id);
    // Devolvemos cuántas se marcaron para que el frontend actualice el badge.
    res.json({ marked: count });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications — eliminar todas las notificaciones del usuario
router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteAllByUser(req.user.id);
    res.json({ message: 'Notificaciones eliminadas correctamente' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — eliminar una notificación
router.delete('/:id', async (req, res, next) => {
  try {
    // Se restringe por req.user.id: solo el dueño puede eliminar su notificación.
    const deleted = await Notification.deleteById(parseInt(req.params.id), req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
