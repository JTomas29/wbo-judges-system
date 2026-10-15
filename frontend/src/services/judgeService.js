/**
 * judgeService.js — Gestión de jueces, sus asignaciones a peleas y perfil.
 *
 * Usa axios directo, recibiendo el JWT por parámetro para el header
 * "Authorization: Bearer <token>". Retorna la respuesta completa de axios.
 * Los comentarios "// Asignaciones (admin)" y "// Mis asignaciones (juez)"
 * ya existentes indican a qué rol pertenece cada grupo de endpoints.
 */

import axios from 'axios';

// URL base del backend desde variable de entorno.
const API_URL = import.meta.env.VITE_API_URL;

// GET /judges — Header Bearer. Retorna el listado de jueces registrados.
export const getJudges = (token) =>
  axios.get(`${API_URL}/judges`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /judges/:id — Header Bearer. Retorna el detalle/perfil de un juez.
export const getJudgeById = (id, token) =>
  axios.get(`${API_URL}/judges/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// PUT /judges/:id — Header Bearer; body: data (datos editables del juez).
// Actualiza el juez y retorna el registro modificado.
export const updateJudge = (id, data, token) =>
  axios.put(`${API_URL}/judges/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// DELETE /judges/:id — Header Bearer. Elimina/desactiva el juez indicado.
export const deleteJudge = (id, token) =>
  axios.delete(`${API_URL}/judges/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Asignaciones (admin)
// POST /fights/:fightId/assignments — Header Bearer; body: data (jueces + rol).
// Asigna jueces a una pelea concreta.
export const createAssignment = (fightId, data, token) =>
  axios.post(`${API_URL}/fights/${fightId}/assignments`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// DELETE /fights/:fightId/assignments/:judgeId — Header Bearer.
// Quita la asignación de un juez a una pelea.
export const deleteAssignment = (fightId, judgeId, token) =>
  axios.delete(`${API_URL}/fights/${fightId}/assignments/${judgeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// GET /fights/:fightId/assignments — Header Bearer.
// Retorna las asignaciones actuales de una pelea.
export const getFightAssignments = (fightId, token) =>
  axios.get(`${API_URL}/fights/${fightId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Mis asignaciones (juez)
// GET /me/assignments — Header Bearer. Retorna las peleas asignadas al USUARIO
// actual (el token determina quién es "me").
export const getMyAssignments = (token) =>
  axios.get(`${API_URL}/me/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Asignaciones de un juez específico (admin/supervisor)
// GET /judges/:judgeId/assignments — Header Bearer. Retorna el histórico de
// asignaciones/participaciones de un juez puntual.
export const getJudgeAssignments = (judgeId, token) =>
  axios.get(`${API_URL}/judges/${judgeId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
