import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const getAllStatistics = (token) =>
  axios.get(`${API_URL}/statistics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getJudgeStatistics = (judgeId, token) =>
  axios.get(`${API_URL}/statistics/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
