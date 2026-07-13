import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getJudges = (token) =>
  axios.get(`${API_URL}/judges`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Asignaciones de jueces a peleas
export const createAssignment = (fightId, data, token) =>
  axios.post(`${API_URL}/fights/${fightId}/assignments`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteAssignment = (fightId, judgeId, token) =>
  axios.delete(`${API_URL}/fights/${fightId}/assignments/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getFightAssignments = (fightId, token) =>
  axios.get(`${API_URL}/fights/${fightId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
