/**
 * api.js — Instancia central de Axios para consumos con autenticación.
 *
 * Funcionamiento:
 *   - baseURL : la define VITE_API_URL (variable de entorno), apuntando al backend.
 *   - Interceptor de request : inyecta automáticamente el header
 *     "Authorization: Bearer <token>" en TODA petición, tomando el JWT del
 *     localStorage (clave "wbo_token"). Así los servicios no repiten el header.
 *   - Interceptor de response : ante un 401 (token vencido/inválido) limpia la
 *     sesión de localStorage y redirige a /login, salvo que el 401 venga del
 *     propio endpoint de login (ahí la credencial fue incorrecta y el usuario
 *     debe ver el error en el formulario, no ser redirigido).
 *
 * Se exporta por defecto para que los services (authService, notificationService,
 * profileService, refereeService) lo reutilicen.
 */

import axios from 'axios';

// URL base del backend; se lee desde el .env con prefijo VITE_ (expuesta al cliente).
const API_URL = import.meta.env.VITE_API_URL;

// Instancia compartida de Axios con JSON como Content-Type por defecto.
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de salida: adjunta el JWT a cada request si existe en localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wbo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de entrada: manejo centralizado de sesiones expiradas (401).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 fuera del login = sesión inválida/vencida:
    // se limpia localStorage y se fuerza la navegación a /login.
    // (window.location.href recarga la app y los guards redirigirán solos.)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('wbo_token');
      localStorage.removeItem('wbo_user');
      window.location.href = '/login';
    }
    // El error se propaga para que cada llamador lo maneje con try/catch.
    return Promise.reject(error);
  }
);

export default api;
