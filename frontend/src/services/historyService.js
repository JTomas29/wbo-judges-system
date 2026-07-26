import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getFightHistory = async (token, filters = {}) => {
  const params = {};
  if (filters.searchEvent) params.searchEvent = filters.searchEvent;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.weightClass) params.weightClass = filters.weightClass;

  const { data } = await axios.get(`${API_URL}/fights/history`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};
