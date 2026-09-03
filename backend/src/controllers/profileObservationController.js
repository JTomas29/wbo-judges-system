const ProfileObservation = require('../models/ProfileObservation');
const { pool } = require('../config/db');

const profileObservationController = {};

// ─── GET por juez ───────────────────────────────────────────────────────────

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

profileObservationController.create = async (req, res, next) => {
  try {
    const { entity_type, entity_id, fight_id, observation } = req.body;

    if (!entity_type || !['judge', 'referee'].includes(entity_type)) {
      return res.status(400).json({ message: 'entity_type debe ser "judge" o "referee"' });
    }
    if (!entity_id) {
      return res.status(400).json({ message: 'entity_id es obligatorio' });
    }
    if (!fight_id) {
      return res.status(400).json({ message: 'fight_id es obligatorio' });
    }
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
