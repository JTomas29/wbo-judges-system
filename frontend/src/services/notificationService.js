/**
 * notificationService.js — Endpoints del centro de notificaciones del usuario.
 *
 * Usa la instancia `api` (services/api.js): el header "Authorization: Bearer
 * <JWT>" se inyecta automáticamente desde localStorage por el interceptor, y
 * ante un 401 la sesión se limpia. Todas las funciones devuelven el body
 * (res.data). El offset/limit permiten paginación (scroll infinito).
 */

import api from './api';

// GET /notifications?limit=&offset= — Paginado. Retorna el listado de
// notificaciones del usuario autenticado (las más recientes con "offset").
export const getNotifications = (limit = 20, offset = 0) =>
  api.get('/notifications', { params: { limit, offset } }).then((res) => res.data);

// GET /notifications/unread-count — Retorna el número de notificaciones sin
// leer; alimenta el badge del navbar/header.
export const getUnreadCount = () =>
  api.get('/notifications/unread-count').then((res) => res.data);

// PATCH /notifications/:id/read — Marca como leída una notificación puntual.
export const markAsRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data);

// PATCH /notifications/read-all — Marca TODAS las notificaciones como leídas.
export const markAllAsRead = () =>
  api.patch('/notifications/read-all').then((res) => res.data);

// DELETE /notifications/:id — Elimina una notificación puntual.
export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`).then((res) => res.data);

// DELETE /notifications — Vacía todo el centro de notificaciones del usuario.
export const deleteAllNotifications = () =>
  api.delete('/notifications').then((res) => res.data);
