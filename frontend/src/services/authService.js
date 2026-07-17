import api from './api';

export const loginRequest = (credentials) =>
  api.post('/auth/login', credentials).then((res) => res.data);

export const getMeRequest = () =>
  api.get('/auth/me').then((res) => res.data);
