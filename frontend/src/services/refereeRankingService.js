import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const getRefereeRanking = (token) =>
  axios.get(`${API_URL}/referees/ranking`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getRefereeProfile = (id, token) =>
  axios.get(`${API_URL}/referees/${id}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });