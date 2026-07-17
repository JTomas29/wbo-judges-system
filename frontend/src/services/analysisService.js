import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Servicio de análisis — estadísticas y comparativas
export const getFightAnalysis = (fightId, token) =>
  axios.get(`${API_URL}/analysis/fight/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const getStatistics = (params, token) =>
  axios.get(`${API_URL}/analysis/statistics`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
