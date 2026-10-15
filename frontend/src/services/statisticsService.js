/**
 * statisticsService.js — Estadísticas globales e individuales de jueces.
 *
 * Usa axios directo; recibe el JWT por parámetro para el header
 * "Authorization: Bearer <token>". Retorna la respuesta completa de axios.
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /statistics — Header Bearer. Retorna estadísticas agregadas de todos los
// jueces (métricas globales del sistema, sin params).
export const getAllStatistics = (token) =>
  axios.get(`${API_URL}/statistics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /statistics/:judgeId — Header Bearer; params: id del juez.
// Retorna las estadísticas individuales de un juez puntual.
export const getJudgeStatistics = (judgeId, token) =>
  axios.get(`${API_URL}/statistics/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
