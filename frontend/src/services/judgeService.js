import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const getJudges = (token) =>
  axios.get(`${API_URL}/judges`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getJudgeById = (id, token) =>
  axios.get(`${API_URL}/judges/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateJudge = (id, data, token) =>
  axios.put(`${API_URL}/judges/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteJudge = (id, token) =>
  axios.delete(`${API_URL}/judges/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Asignaciones (admin)
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

// Respuesta del juez (confirmar/rechazar)
export const respondAssignment = (fightId, body, token) =>
  axios.patch(`${API_URL}/fights/${fightId}/assignments/respond`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Mis asignaciones (juez)
export const getMyAssignments = (token) =>
  axios.get(`${API_URL}/me/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
