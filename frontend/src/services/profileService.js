/**
 * profileService.js — Observaciones del perfil (jueces y árbitros) y descarga
 * de PDFs de perfil.
 *
 * Usa la instancia `api` (services/api.js). Aunque el interceptor ya inyecta el
 * Bearer automáticamente, estas funciones además reciben `token` y lo pasan
 * explícitamente en el header Authorization (redundante por diseño). Devuelven
 * la respuesta completa de axios (no solo res.data).
 */

import api from './api';

// GET /profile-observations/judge/:judgeId — Header Bearer (también via
// interceptor). Retorna las observaciones registradas sobre un juez.
export const getJudgeObservations = (judgeId, token) =>
  api.get(`/profile-observations/judge/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /profile-observations/referee/:refereeId — Header Bearer.
// Retorna las observaciones registradas sobre un árbitro.
export const getRefereeObservations = (refereeId, token) =>
  api.get(`/profile-observations/referee/${refereeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /profile-observations — Header Bearer; body: data (juez/árbitro,
// observación, autor). Crea una nueva observación de perfil.
export const createObservation = (data, token) =>
  api.post('/profile-observations', data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// DELETE /profile-observations/:id — Header Bearer. Elimina una observación.
export const deleteObservation = (id, token) =>
  api.delete(`/profile-observations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /profile/judges/:judgeId/pdf — Header Bearer; responseType 'blob' para que
// axios trate la respuesta como archivo binario (habilitar la descarga del PDF
// del perfil del juez en el navegador).
export const downloadJudgePdf = (judgeId, token) =>
  api.get(`/profile/judges/${judgeId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });

// GET /profile/referees/:refereeId/pdf — Header Bearer; responseType 'blob'.
// Mismo mecanismo que el anterior pero para el perfil de un árbitro.
export const downloadRefereePdf = (refereeId, token) =>
  api.get(`/profile/referees/${refereeId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });
