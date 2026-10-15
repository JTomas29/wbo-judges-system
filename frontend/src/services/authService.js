/**
 * authService.js — Endpoints de autenticación y registro de usuarios.
 *
 * Todas las funciones usan la instancia `api` (services/api.js), por lo que el
 * header "Authorization: Bearer <JWT>" lo inyecta automáticamente el interceptor
 * de request a partir de localStorage. Devolución: siempre resuelven con el body
 * de la respuesta (res.data).
 */

import api from './api';

// POST /auth/login — Body: { username o email, password }.
// Retorna: { token, user } (JWT + datos del usuario). No lleva Authorization
// (aún no hay sesión); el interceptor de 401 no la redirige porque el login
// legítimo devuelve 401 cuando las credenciales son inválidas.
export const loginRequest = (credentials) =>
  api.post('/auth/login', credentials).then((res) => res.data);

// GET /auth/me — Header: Authorization Bearer (inyectado por el interceptor).
// Retorna: { user } con los datos frescos del usuario autenticado. Se usa para
// restaurar/validar la sesión al cargar la app y tras cada login.
export const getMeRequest = () =>
  api.get('/auth/me').then((res) => res.data);

// POST /auth/register — Body: data (datos del nuevo usuario) + Header
// Authorization Bearer con el token de un admin (crear usuarios es privilegio
// administrativo). Retorna: { user, token }.
export const registerRequest = (data, token) =>
  api.post('/auth/register', data, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.data);
