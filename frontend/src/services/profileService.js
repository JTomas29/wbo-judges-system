import api from './api';

export const getJudgeObservations = (judgeId, token) =>
  api.get(`/profile-observations/judge/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getRefereeObservations = (refereeId, token) =>
  api.get(`/profile-observations/referee/${refereeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createObservation = (data, token) =>
  api.post('/profile-observations', data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateObservation = (id, data, token) =>
  api.put(`/profile-observations/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteObservation = (id, token) =>
  api.delete(`/profile-observations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const downloadJudgePdf = (judgeId, token) =>
  api.get(`/profile/judges/${judgeId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });

export const downloadRefereePdf = (refereeId, token) =>
  api.get(`/profile/referees/${refereeId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });
