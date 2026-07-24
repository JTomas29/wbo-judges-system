const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = Router();
router.use(authMiddleware);

// GET /api/notifications — listar notificaciones del usuario
router.get('/', async (req, res, next) => {
  try {
    await Notification.deleteExpired(20);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = await Notification.getByUser(req.user.id, { limit, offset });
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (err) {
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
    const notification = await Notification.markAsRead(parseInt(req.params.id), req.user.id);
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
    res.json({ marked: count });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — eliminar una notificación
router.delete('/:id', async (req, res, next) => {
  try {
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
