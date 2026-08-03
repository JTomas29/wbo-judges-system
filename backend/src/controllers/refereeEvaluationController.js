const RefereeEvaluation = require('../models/RefereeEvaluation');
const Fight = require('../models/Fight');

const validateId = (id) => {
  const num = parseInt(id, 10);
  if (!Number.isInteger(num) || num < 1) return 'ID inválido';
  return null;
};

// La evaluación del árbitro está disponible únicamente una vez finalizada la
// pelea: estado 'completed' (finalizada) o 'analyzed' (finalizada y analizada).
const isFightFinalized = (status) => status === 'completed' || status === 'analyzed';

exports.create = async (req, res, next) => {
  try {
    const { fight_id, referee_id, score, point_deduction, comments } = req.body;

    // Validaciones
    if (!fight_id || !referee_id) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: fight_id, referee_id' });
    }

    const fightId = parseInt(fight_id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) {
      return res.status(400).json({ message: 'fight_id inválido' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    // Solo el supervisor que creó la pelea puede evaluar al árbitro
    if (Number(fight.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el supervisor de la pelea puede evaluar al árbitro' });
    }

    // El referee_id debe coincidir con el árbitro asignado a la pelea
    if (parseInt(referee_id, 10) !== Number(fight.referee_id)) {
      return res.status(400).json({ message: 'El referee_id no coincide con el árbitro asignado a la pelea' });
    }

    if (!isFightFinalized(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar finalizada (completed o analyzed) para evaluar al árbitro' });
    }

    // Verificar que no exista ya una evaluación para esta pelea
    const existing = await RefereeEvaluation.findByFight(fightId);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una evaluación para esta pelea' });
    }

    const scoreNum = parseInt(score, 10);
    if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ message: 'score debe ser un número entre 0 y 100' });
    }

    const deductionNum = parseInt(point_deduction || 0, 10);
    if (!Number.isInteger(deductionNum) || deductionNum < 0 || deductionNum > 5) {
      return res.status(400).json({ message: 'point_deduction debe ser un número entre 0 y 5' });
    }

    if (comments && comments.length > 500) {
      return res.status(400).json({ message: 'Los comentarios no pueden exceder los 500 caracteres' });
    }

    const evaluation = await RefereeEvaluation.create({
      fight_id: fightId,
      referee_id: parseInt(referee_id, 10),
      supervisor_id: req.user.id,
      score: scoreNum,
      point_deduction: deductionNum,
      comments: comments || null,
    });

    res.status(201).json(evaluation);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const existing = await RefereeEvaluation.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }

    // Solo el supervisor que creó la evaluación puede editarla
    if (Number(existing.supervisor_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el supervisor que creó la evaluación puede editarla' });
    }

    // Verificar que el supervisor siga siendo el supervisor de la pelea
    const fight = await Fight.getById(existing.fight_id);
    if (!fight || Number(fight.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el supervisor de la pelea puede modificar la evaluación' });
    }

    // Solo se puede modificar la evaluación de una pelea finalizada
    if (!isFightFinalized(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar finalizada (completed o analyzed) para modificar la evaluación' });
    }

    const { score, point_deduction, comments } = req.body;

    const scoreNum = parseInt(score, 10);
    if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ message: 'score debe ser un número entre 0 y 100' });
    }

    const deductionNum = parseInt(point_deduction || 0, 10);
    if (!Number.isInteger(deductionNum) || deductionNum < 0 || deductionNum > 5) {
      return res.status(400).json({ message: 'point_deduction debe ser un número entre 0 y 5' });
    }

    if (comments && comments.length > 500) {
      return res.status(400).json({ message: 'Los comentarios no pueden exceder los 500 caracteres' });
    }

    const evaluation = await RefereeEvaluation.update(id, {
      score: scoreNum,
      point_deduction: deductionNum,
      comments: comments || null,
    });

    res.json(evaluation);
  } catch (err) {
    next(err);
  }
};

exports.getByFight = async (req, res, next) => {
  try {
    const { fightId } = req.params;
    const errMsg = validateId(fightId);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const fight = await Fight.getById(fightId);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    // Solo el supervisor de la pelea puede ver la evaluación
    if (Number(fight.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el supervisor de la pelea puede ver la evaluación del árbitro' });
    }

    const evaluation = await RefereeEvaluation.findByFight(fightId);
    if (!evaluation) {
      return res.status(404).json({ message: 'No hay evaluación para esta pelea' });
    }

    res.json(evaluation);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const existing = await RefereeEvaluation.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }

    // Solo el supervisor de la pelea puede eliminar la evaluación
    const fight = await Fight.getById(existing.fight_id);
    if (!fight || Number(fight.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el supervisor de la pelea puede eliminar la evaluación del árbitro' });
    }

    const deleted = await RefereeEvaluation.deleteById(id);
    if (!deleted) {
      return res.status(400).json({ message: 'No se pudo eliminar la evaluación' });
    }

    res.json({ message: 'Evaluación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};
