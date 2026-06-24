import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Servicio de puntuaciones — envío y consulta de tarjetas
export const submitScore = (data, token) =>
  axios.post(`${API_URL}/scores`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const getScores = (fightId, token) =>
  axios.get(`${API_URL}/scores/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const getLiveScores = (fightId, token) =>
  axios.get(`${API_URL}/scores/live/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
