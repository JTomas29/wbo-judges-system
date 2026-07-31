const Referee = require('../models/Referee');

// Controlador de árbitros — CRUD completo de la entidad independiente Referee.
// El árbitro NO es un usuario del sistema: no tiene login, JWT, email ni contraseña.

exports.getAll = async (req, res, next) => {
  try {
    const referees = await Referee.getAll();
    res.json(referees);
  } catch (err) {
    next(err);
  }
};

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

exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, license_number, federation, phone } = req.body;

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ message: 'El apellido es obligatorio' });
    }

    const referee = await Referee.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      license_number: license_number !== undefined ? String(license_number).trim() || null : null,
      federation: federation !== undefined ? String(federation).trim() || null : null,
      phone: phone !== undefined ? String(phone).trim() || null : null,
    });

    res.status(201).json(referee);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, license_number, federation, phone } = req.body;

    const existing = await Referee.getById(id);
    if (!existing) return res.status(404).json({ message: 'Árbitro no encontrado' });

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ message: 'El apellido es obligatorio' });
    }

    const referee = await Referee.update(id, {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      license_number: license_number !== undefined ? String(license_number).trim() || null : null,
      federation: federation !== undefined ? String(federation).trim() || null : null,
      phone: phone !== undefined ? String(phone).trim() || null : null,
    });

    if (!referee) return res.status(400).json({ message: 'No se pudo actualizar el árbitro' });

    res.json(referee);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Referee.getById(id);
    if (!existing) return res.status(404).json({ message: 'Árbitro no encontrado' });

    const referee = await Referee.deactivate(id);
    if (!referee) return res.status(400).json({ message: 'No se pudo eliminar el árbitro' });

    res.json({ message: 'Árbitro desactivado correctamente', referee });
  } catch (err) {
    next(err);
  }
};
