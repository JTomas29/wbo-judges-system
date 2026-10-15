/**
 * scoringService.js — Flujo de puntuación del juez (scorecards y rounds).
 *
 * Permite al juez autenticado: obtener/crear su tarjeta de una pelea, guardar
 * cada round y finalizarla. Usa axios directo con el JWT por parámetro para el
 * header "Authorization: Bearer <token>". Retorna la respuesta completa de axios.
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /fights/:fightId/scorecards/mine — Header Bearer.
// Retorna la tarjeta de puntuación del juez actual para esa pelea (o 404 si
// aún no la posee; el caller decide si debe crearla).
export const getMyScorecard = (fightId, token) =>
  axios.get(`${API_URL}/fights/${fightId}/scorecards/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:fightId/scorecards — Header Bearer; sin body (null).
// Crea la tarjeta vacía del juez para la pelea. Retorna la tarjeta creada.
export const createScorecard = (fightId, token) =>
  axios.post(`${API_URL}/fights/${fightId}/scorecards`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /scorecards/:scorecardId/rounds — Header Bearer; body: data (número de
// round y puntuación de cada boxeador). Guarda/acumula un round de puntuación.
export const saveRound = (scorecardId, data, token) =>
  axios.post(`${API_URL}/scorecards/${scorecardId}/rounds`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// PATCH /scorecards/:scorecardId/finalize — Header Bearer; sin body.
// Marca la tarjeta como finalizada (ya no admite más rounds). Retorna la tarjeta.
export const finalizeScorecard = (scorecardId, token) =>
  axios.patch(`${API_URL}/scorecards/${scorecardId}/finalize`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
