import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Servicio de jueces — gestión y asignación
export const getJudges = (token) =>
  axios.get(`${API_URL}/judges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const assignJudge = (data, token) =>
  axios.post(`${API_URL}/judges/assign`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const getAssignments = (fightId, token) =>
  axios.get(`${API_URL}/judges/assignments/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
