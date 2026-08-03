import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const getRefereeEvaluation = (fightId, token) =>
  axios.get(`${API_URL}/referee-evaluations/fight/${fightId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createRefereeEvaluation = (data, token) =>
  axios.post(`${API_URL}/referee-evaluations`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateRefereeEvaluation = (id, data, token) =>
  axios.put(`${API_URL}/referee-evaluations/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteRefereeEvaluation = (id, token) =>
  axios.delete(`${API_URL}/referee-evaluations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
