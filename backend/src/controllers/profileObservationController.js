// ─── profileObservationController.js — Observaciones de perfil ───
// Responsabilidad: gestionar las observaciones (notas) que los supervisores
// registran sobre el perfil de un juez o un árbitro, asociadas a una pelea.
// La entidad apunta a un juez (usuarios) o a un árbitro (tabla referees).

const ProfileObservation = require('../models/ProfileObservation');
const { pool } = require('../config/db');

const profileObservationController = {};

// ─── GET por juez ───────────────────────────────────────────────────────────

// GET /api/profile-observations/judge/:judgeId
// Devuelve las observaciones de un juez.
// Espera: req.params.judgeId = id de juez.
// Devuelve: 200 con el array de observaciones.
// Errores: sólo del servidor.
profileObservationController.getByJudge = async (req, res, next) => {
  try {
    const { judgeId } = req.params;
    const observations = await ProfileObservation.getByJudge(parseInt(judgeId, 10));
    res.json(observations);
  } catch (err) {
    next(err);
  }
};

// ─── GET por árbitro ────────────────────────────────────────────────────────

// GET /api/profile-observations/referee/:refereeId
// Devuelve las observaciones de un árbitro.
// Espera: req.params.refereeId = id de árbitro.
// Devuelve: 200 con el array de observaciones.
// Errores: sólo del servidor.
profileObservationController.getByReferee = async (req, res, next) => {
  try {
    const { refereeId } = req.params;
    const observations = await ProfileObservation.getByReferee(parseInt(refereeId, 10));
    res.json(observations);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE ─────────────────────────────────────────────────────────────────

// POST /api/profile-observations
// Registra una nueva observación sobre un juez o árbitro en una pelea.
// Espera: req.body = { entity_type, entity_id, fight_id, observation }.
// Devuelve: 201 con la observación creada.
// Errores: 400 (campos inválidos, pelea/entidad inexistente, longitud).
profileObservationController.create = async (req, res, next) => {
  try {
    const { entity_type, entity_id, fight_id, observation } = req.body;

    // La observación apunta a un juez o a un árbitro, nunca a otro tipo.
    if (!entity_type || !['judge', 'referee'].includes(entity_type)) {
      return res.status(400).json({ message: 'entity_type debe ser "judge" o "referee"' });
    }
    if (!entity_id) {
      return res.status(400).json({ message: 'entity_id es obligatorio' });
    }
    if (!fight_id) {
      return res.status(400).json({ message: 'fight_id es obligatorio' });
    }
    // El texto es obligatorio y tiene un tope de extensión.
    if (!observation || !observation.trim()) {
      return res.status(400).json({ message: 'La observación es obligatoria' });
    }
    if (observation.trim().length > 2000) {
      return res.status(400).json({ message: 'La observación no puede superar 2000 caracteres' });
    }

    // Verificar que la pelea existe
    const fightCheck = await pool.query('SELECT id FROM fights WHERE id = $1', [fight_id]);
    if (fightCheck.rows.length === 0) {
      return res.status(400).json({ message: 'La pelea no existe' });
    }

    // Verificar que la entidad existe
    // Según el tipo se valida contra la tabla de usuarios (jueces) o contra
    // la tabla propia de árbitros.
    if (entity_type === 'judge') {
      const judgeCheck = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'judge'", [entity_id]);
      if (judgeCheck.rows.length === 0) {
        return res.status(400).json({ message: 'El juez no existe' });
      }
    } else {
      const refCheck = await pool.query('SELECT id FROM referees WHERE id = $1', [entity_id]);
      if (refCheck.rows.length === 0) {
        return res.status(400).json({ message: 'El árbitro no existe' });
      }
    }

    // Recién ahora persistimos la observación con el usuario que la creó,
    // mapeando la entidad a la columna correspondiente (judge_id o referee_id).
    const created = await ProfileObservation.create({
      entityType: entity_type,
      judgeId: entity_type === 'judge' ? entity_id : null,
      refereeId: entity_type === 'referee' ? entity_id : null,
      fightId: fight_id,
      createdBy: req.user.id,
      observation: observation.trim(),
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE ─────────────────────────────────────────────────────────────────

// PUT /api/profile-observations/:id
// Actualiza el texto de una observación existente.
// Espera: req.params.id; req.body = { observation }.
// Devuelve: 200 con la observación actualizada.
// Errores: 400 (texto inválido/longitud), 404 (no existe).
profileObservationController.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { observation } = req.body;

    if (!observation || !observation.trim()) {
      return res.status(400).json({ message: 'La observación es obligatoria' });
    }
    if (observation.trim().length > 2000) {
      return res.status(400).json({ message: 'La observación no puede superar 2000 caracteres' });
    }

    const existing = await ProfileObservation.getById(parseInt(id, 10));
    if (!existing) {
      return res.status(404).json({ message: 'Observación no encontrada' });
    }

    const updated = await ProfileObservation.update(parseInt(id, 10), { observation: observation.trim() });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE ─────────────────────────────────────────────────────────────────

// DELETE /api/profile-observations/:id
// Elimina una observación.
// Espera: req.params.id.
// Devuelve: 200 con mensaje de éxito.
// Errores: 404 (no existe).
profileObservationController.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await ProfileObservation.getById(parseInt(id, 10));
    if (!existing) {
      return res.status(404).json({ message: 'Observación no encontrada' });
    }

    await ProfileObservation.delete(parseInt(id, 10));
    res.json({ message: 'Observación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = profileObservationController;
