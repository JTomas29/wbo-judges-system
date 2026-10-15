/**
 * refereeEvaluationService.js — Evaluaciones de árbitros por pelea.
 *
 * Usa axios directo; recibe el JWT por parámetro para el header
 * "Authorization: Bearer <token>". Retorna la respuesta completa de axios
 * (objeto { data, status, ... }).
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /referee-evaluations/fight/:fightId — Header Bearer.
// Retorna la evaluación (o evaluaciones) del árbitro para una pelea,
// consultadas por id de la pelea.
export const getRefereeEvaluation = (fightId, token) =>
  axios.get(`${API_URL}/referee-evaluations/fight/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /referee-evaluations — Header Bearer; body: data (pelea, árbitro, nota,
// observaciones). Crea una evaluación de árbitro.
export const createRefereeEvaluation = (data, token) =>
  axios.post(`${API_URL}/referee-evaluations`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// PUT /referee-evaluations/:id — Header Bearer; body: data. Actualiza una
// evaluación existente (identificada por su id).
export const updateRefereeEvaluation = (id, data, token) =>
  axios.put(`${API_URL}/referee-evaluations/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// DELETE /referee-evaluations/:id — Header Bearer. Elimina una evaluación.
export const deleteRefereeEvaluation = (id, token) =>
  axios.delete(`${API_URL}/referee-evaluations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
