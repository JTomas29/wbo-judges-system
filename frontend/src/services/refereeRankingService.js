/**
 * refereeRankingService.js — Ranking y perfil de árbitros.
 *
 * Usa axios directo; recibe el JWT por parámetro para el header
 * "Authorization: Bearer <token>". Retorna la respuesta completa de axios.
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /referees/ranking — Header Bearer. Retorna el ranking global de árbitros
// (por puntaje/desempeño promedio). Sin params.
export const getRefereeRanking = (token) =>
  axios.get(`${API_URL}/referees/ranking`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /referees/:id/profile — Header Bearer; params: id del árbitro.
// Retorna el perfil extendido de un árbitro (datos, estadísticas, evaluaciones).
export const getRefereeProfile = (id, token) =>
  axios.get(`${API_URL}/referees/${id}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });