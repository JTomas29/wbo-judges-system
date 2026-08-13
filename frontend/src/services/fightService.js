import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

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
export const getScorecards = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/scorecards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
export const completeFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/complete`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const activateFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/activate`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const registerResult = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/result`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const analyzeFight = (id, token) =>
  axios.post(`${API_URL}/fights/${id}/analyze`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getFightAnalysis = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/analysis`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getOfficialCard = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/official-card`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createOfficialCard = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/official-card`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getOfficialJudgeCards = (id, token) =>
  axios.get(`${API_URL}/fights/${id}/official-judge-cards`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createOfficialJudgeCard = (id, data, token) =>
  axios.post(`${API_URL}/fights/${id}/official-judge-cards`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getOfficialJudgeCard = (cardId, token) =>
  axios.get(`${API_URL}/fights/official-judge-cards/${cardId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateOfficialJudgeCard = (cardId, data, token) =>
  axios.put(`${API_URL}/fights/official-judge-cards/${cardId}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
