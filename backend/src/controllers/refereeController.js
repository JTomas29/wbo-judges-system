// ─── refereeController.js — Gestión de árbitros ───
// Responsabilidad: CRUD de la entidad independiente 'Referee' (tabla
// referees), más las consultas de ranking y perfil. El árbitro NO es un
// usuario del sistema: no tiene login, JWT, email ni contraseña.

const Referee = require('../models/Referee');

// Controlador de árbitros — CRUD completo de la entidad independiente Referee.
// El árbitro NO es un usuario del sistema: no tiene login, JWT, email ni contraseña.

// ─── RANKING ────────────────────────────────────────────────────────────────

// GET /api/referees/ranking
// Devuelve el ranking de árbitros ordenado por su promedio de evaluación.
// Devuelve: 200 con el array del ranking.
// Errores: sólo del servidor.
exports.getRanking = async (req, res, next) => {
  try {
    const ranking = await Referee.getRanking();
    res.json(ranking);
  } catch (err) {
    next(err);
  }
};

// ─── PROFILE ────────────────────────────────────────────────────────────────

// GET /api/referees/:id/profile
// Devuelve el perfil de un árbitro junto con su historial de evaluaciones.
// Espera: req.params.id = id de árbitro.
// Devuelve: 200 con { profile, history }.
// Errores: 404 (árbitro no encontrado).
exports.getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await Referee.getProfile(id);
    if (!profile) return res.status(404).json({ message: 'Árbitro no encontrado' });

    const history = await Referee.getEvaluationHistory(id);

    res.json({ profile, history });
  } catch (err) {
    next(err);
  }
};

// ─── CRUD ───────────────────────────────────────────────────────────────────

// GET /api/referees — Lista todos los árbitros.
// Devuelve: 200 con el array de árbitros.
// Errores: sólo del servidor.
exports.getAll = async (req, res, next) => {
  try {
    const referees = await Referee.getAll();
    res.json(referees);
  } catch (err) {
    next(err);
  }
};

// GET /api/referees/:id — Devuelve un árbitro puntual.
// Espera: req.params.id.
// Devuelve: 200 con el árbitro.
// Errores: 404 (no encontrado).
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const referee = await Referee.getById(id);
    if (!referee) return res.status(404).json({ message: 'Árbitro no encontrado' });
    res.json(referee);
  } catch (err) {
    next(err);
  }
};

// POST /api/referees — Crea un árbitro.
// Espera: req.body = { first_name, last_name, license_number, federation,
// phone, active }.
// Devuelve: 201 con el árbitro creado.
// Errores: 400 (nombre/apellido obligatorios).
exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, license_number, federation, phone, active } = req.body;

    // Nombre y apellido son obligatorios; el resto de los datos son opcionales.
    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ message: 'El apellido es obligatorio' });
    }

    // Campos opcionales: se normalizan (trim) o pasan como null si vienen
    // vacíos. 'active' por defecto es true, salvo que se indique lo contrario.
    const referee = await Referee.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      license_number: license_number !== undefined ? String(license_number).trim() || null : null,
      federation: federation !== undefined ? String(federation).trim() || null : null,
      phone: phone !== undefined ? String(phone).trim() || null : null,
      active: active !== undefined ? active === true || active === 'true' : true,
    });

    res.status(201).json(referee);
  } catch (err) {
    next(err);
  }
};

// PUT /api/referees/:id — Actualiza un árbitro.
// Espera: req.params.id; req.body = { first_name, last_name, license_number,
// federation, phone, active }.
// Devuelve: 200 con el árbitro actualizado.
// Errores: 400 (nombre/apellido obligatorios o fallo de update),
//          404 (no encontrado).
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, license_number, federation, phone, active } = req.body;

    const existing = await Referee.getById(id);
    if (!existing) return res.status(404).json({ message: 'Árbitro no encontrado' });

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ message: 'El apellido es obligatorio' });
    }

    // Mismo tratamiento de normalización que en create; si 'active' no viene,
    // se conserva el valor actual.
    const referee = await Referee.update(id, {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      license_number: license_number !== undefined ? String(license_number).trim() || null : null,
      federation: federation !== undefined ? String(federation).trim() || null : null,
      phone: phone !== undefined ? String(phone).trim() || null : null,
      active: active !== undefined ? active === true || active === 'true' : existing.active,
    });

    if (!referee) return res.status(400).json({ message: 'No se pudo actualizar el árbitro' });

    res.json(referee);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/referees/:id — Desactiva (baja lógica) un árbitro.
// Espera: req.params.id.
// Devuelve: 200 con mensaje y el árbitro desactivado.
// Errores: 400 (fallo de baja), 404 (no encontrado).
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Referee.getById(id);
    if (!existing) return res.status(404).json({ message: 'Árbitro no encontrado' });

    // Baja lógica: no se borra el registro para no romper el historial.
    const referee = await Referee.deactivate(id);
    if (!referee) return res.status(400).json({ message: 'No se pudo eliminar el árbitro' });

    res.json({ message: 'Árbitro desactivado correctamente', referee });
  } catch (err) {
    next(err);
  }
};
