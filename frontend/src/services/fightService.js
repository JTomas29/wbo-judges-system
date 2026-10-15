/**
 * fightService.js — CRUD de peleas (eventos de boxeo) y submódulos asociados:
 * tarjetas, marcadores y análisis.
 *
 * Todas las funciones usan axios directo y reciben el JWT por parámetro para
 * armar el header "Authorization: Bearer <token>". Retornan la respuesta
 * completa de axios (objeto { data, status, ... }).
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// Servicio de peleas — CRUD de eventos de boxeo
// GET /fights — Header Bearer. Retorna el listado de todas las peleas.
export const getFights = (token) =>
  axios.get(`${API_URL}/fights`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:id — Header Bearer; params: id de la pelea.
// Retorna el detalle completo de una pelea (boxeadores, categoría, estado).
export const getFightById = (id, token) =>
  axios.get(`${API_URL}/fights/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights — Header Bearer; body: data (datos de la nueva pelea).
// Crea una pelea y retorna el registro creado.
export const createFight = (data, token) =>
  axios.post(`${API_URL}/fights`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// PUT /fights/:id — Header Bearer; body: data (campos a actualizar).
// Actualiza la pelea y retorna el registro modificado.
export const updateFight = (id, data, token) =>
  axios.put(`${API_URL}/fights/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// DELETE /fights/:id — Header Bearer. Elimina la pelea indicada.
export const deleteFight = (id, token) =>
  axios.delete(`${API_URL}/fights/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:id/scorecards — Header Bearer.
// Retorna las tarjetas de puntuación cargadas por los jueces de esa pelea.
export const getScorecards = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/scorecards`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/complete — Header Bearer; sin body (null). Marca la pelea
// como completada una vez reunidas todas las tarjetas.
export const completeFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/complete`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/activate — Header Bearer; sin body. Pasa la pelea a estado
// "active" (comienza el periodo de puntuación en vivo).
export const activateFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/activate`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/result — Header Bearer; body: data (resultado: tipo, ganador,
// round de finalización, tiempo). Registra el resultado oficial de la pelea.
export const registerResult = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/result`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/analyze — Header Bearer; sin body. Dispara el proceso de
// análisis/estadísticas de la pelea en el backend.
export const analyzeFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/analyze`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:id/analysis — Header Bearer. Retorna el análisis ya generado
// para la pelea (puede diferir de /analysis/fight/:id en el formato).
export const getFightAnalysis = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/analysis`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:id/official-card — Header Bearer. Retorna la tarjeta oficial
// de la pelea (resultado consolidado emitido por la organización).
export const getOfficialCard = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/official-card`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/official-card — Header Bearer; body: data (detalle de la
// tarjeta oficial). Crea/emite la tarjeta oficial de la pelea.
export const createOfficialCard = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/official-card`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:id/official-judge-cards — Header Bearer.
// Retorna el conjunto de tarjetas oficiales CARGADAS POR CADA JUEZ de la pelea.
export const getOfficialJudgeCards = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/official-judge-cards`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// POST /fights/:id/official-judge-cards — Header Bearer; body: data.
// Crea la tarjeta oficial de un juez sobre la pelea.
export const createOfficialJudgeCard = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/official-judge-cards`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// PUT /fights/official-judge-cards/:cardId — Header Bearer; body: data.
// Actualiza los campos de una tarjeta oficial de un juez.
export const updateOfficialJudgeCard = (cardId, data, token) =>
  axios.put(`${API_URL}/fights/official-judge-cards/${cardId}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
