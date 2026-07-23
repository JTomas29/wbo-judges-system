import api from './api';

export const getNotifications = (limit = 20, offset = 0) =>
  api.get('/notifications', { params: { limit, offset } }).then((res) => res.data);

export const getUnreadCount = () =>
  api.get('/notifications/unread-count').then((res) => res.data);

export const markAsRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data);

export const markAllAsRead = () =>
  api.patch('/notifications/read-all').then((res) => res.data);

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`).then((res) => res.data);
