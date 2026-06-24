import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Servicio de peleas — CRUD de eventos de boxeo
export const getFights = (token) =>
  axios.get(`${API_URL}/fights`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const getFightById = (id, token) =>
  axios.get(`${API_URL}/fights/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const createFight = (data, token) =>
  axios.post(`${API_URL}/fights`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const updateFight = (id, data, token) =>
  axios.put(`${API_URL}/fights/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const deleteFight = (id, token) =>
  axios.delete(`${API_URL}/fights/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
