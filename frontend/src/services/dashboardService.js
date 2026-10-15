/**
 * dashboardService.js — Datos agregados para la pantalla de inicio.
 *
 * Usa axios directamente (no la instancia `api`) y recibe el JWT por parámetro
 * para armar el header "Authorization: Bearer <token>". Retorna la respuesta
 * completa de axios.
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /dashboard — Header Bearer con el token del usuario.
// Retorna: resumen del dashboard (peleas asignadas, próximas fechas,
// notificaciones/cuentas relevantes para el rol autenticado).
export const getDashboard = (token) =>
  axios.get(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
