import api from './api';

export const getReferees = () => api.get('/referees');
export const createReferee = (data) => api.post('/referees', data);
export const updateReferee = (id, data) => api.put(`/referees/${id}`, data);
export const deactivateReferee = (id) => api.delete(`/referees/${id}`);
