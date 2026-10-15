/**
 * refereeService.js — CRUD de árbitros (función administrativa).
 *
 * Usa la instancia `api` (services/api.js): el header "Authorization: Bearer
 * <JWT>" se inyecta automáticamente por el interceptor y un 401 limpia la
 * sesión. Retornan la respuesta completa de axios.
 */

import api from './api';

// GET /referees — Lista todos los árbitros.
export const getReferees = () => api.get('/referees');

// POST /referees — Body: data (datos del árbitro). Crea un árbitro.
export const createReferee = (data) => api.post('/referees', data);

// PUT /referees/:id — Body: data (campos a editar). Actualiza un árbitro.
export const updateReferee = (id, data) => api.put(`/referees/${id}`, data);

// DELETE /referees/:id — Baja (desactiva/elimina lógicamente) un árbitro.
export const deactivateReferee = (id) => api.delete(`/referees/${id}`);
