import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getMyScorecard = (fightId, token) =>
  axios.get(`${API_URL}/fights/${fightId}/scorecards/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createScorecard = (fightId, token) =>
  axios.post(`${API_URL}/fights/${fightId}/scorecards`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const saveRound = (scorecardId, data, token) =>
  axios.post(`${API_URL}/scorecards/${scorecardId}/rounds`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const finalizeScorecard = (scorecardId, token) =>
  axios.patch(`${API_URL}/scorecards/${scorecardId}/finalize`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
