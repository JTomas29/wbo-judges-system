import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Servicio de autenticación — endpoints: login, register, profile
export const login = (credentials) => axios.post(`${API_URL}/auth/login`, credentials);
export const register = (userData) => axios.post(`${API_URL}/auth/register`, userData);
export const getProfile = (token) =>
  axios.get(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
