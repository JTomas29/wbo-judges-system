/**
 * historyService.js — Historial de peleas finalizadas con filtros.
 *
 * Usa axios directo; el JWT se pasa por parámetro para el header
 * "Authorization: Bearer <token>". Los filtros opcionales se envían como
 * query string; a diferencia de otros services, resume a res.data (devuelve
 * solo el body de la respuesta).
 */

import axios from 'axios';

// URL base del backend; con fallback local por si falta la variable de entorno.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// GET /fights/history — Header Bearer; query params opcionales según `filters`
// (searchEvent, dateFrom, dateTo, weightClass). Se arma el objeto de params de
// forma incremental: solo se incluyen los filtros que el usuario definió, para
// no mandar claves vacías al servidor. Retorna el listado de peleas históricas.
export const getFightHistory = async (token, filters = {}) => {
  const params = {};
  // Cada filtro presente se agrega al query string (los ausentes se ignoran).
  if (filters.searchEvent) params.searchEvent = filters.searchEvent;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.weightClass) params.weightClass = filters.weightClass;

  const { data } = await axios.get(`${API_URL}/fights/history`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};
