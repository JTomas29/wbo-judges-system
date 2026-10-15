// ─── refereeEvaluationController.js — Evaluaciones de árbitros ───
// Responsabilidad: gestión de las evaluaciones que el supervisor hace del
// árbitro asignado a una pelea. La evaluación es única por pelea y sólo está
// disponible una vez finalizada la misma.

const RefereeEvaluation = require('../models/RefereeEvaluation');
const Fight = require('../models/Fight');

// Helper de validación de ids: devuelve mensaje de error o null si es válido.
const validateId = (id) => {
  const num = parseInt(id, 10);
  if (!Number.isInteger(num) || num < 1) return 'ID inválido';
  return null;
};

// La evaluación del árbitro está disponible únicamente una vez finalizada la
// pelea: estado 'completed' (finalizada) o 'analyzed' (finalizada y analizada).
const isFightFinalized = (status) => status === 'completed' || status === 'analyzed';

// POST /api/referee-evaluations
// Registra la evaluación del árbitro de una pelea.
// Espera: req.body = { fight_id, referee_id, score, point_deduction, comments }.
// Devuelve: 201 con la evaluación creada.
// Errores: 400 (validaciones), 403 (no es el supervisor / referee no
// coincide), 404 (pelea no encontrada), 409 (ya existe evaluación).
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

    // No se evalúa a un árbitro de una pelea que no finalizó.
    if (!isFightFinalized(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar finalizada (completed o analyzed) para evaluar al árbitro' });
    }

    // Verificar que no exista ya una evaluación para esta pelea
    const existing = await RefereeEvaluation.findByFight(fightId);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una evaluación para esta pelea' });
    }

    // Score normalizado: entero entre 0 y 100.
    const scoreNum = parseInt(score, 10);
    if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ message: 'score debe ser un número entre 0 y 100' });
    }

    // Descuento de puntos (default 0): entero entre 0 y 5.
    const deductionNum = parseInt(point_deduction || 0, 10);
    if (!Number.isInteger(deductionNum) || deductionNum < 0 || deductionNum > 5) {
      return res.status(400).json({ message: 'point_deduction debe ser un número entre 0 y 5' });
    }

    // Los comentarios son opcionales con tope de extensión.
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

// PUT /api/referee-evaluations/:id
// Actualiza una evaluación existente.
// Espera: req.params.id; req.body = { score, point_deduction, comments }.
// Devuelve: 200 con la evaluación actualizada.
// Errores: 400 (id/validaciones), 403 (permisos), 404 (evaluación o pelea no
// encontrada).
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

    // Mismas reglas de validación que en create.
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

// GET /api/referee-evaluations/fight/:fightId
// Devuelve la evaluación de una pelea.
// Espera: req.params.fightId = pelea.
// Devuelve: 200 con la evaluación.
// Errores: 400 (id inválido), 403 (no es el supervisor),
//          404 (pelea o evaluación no encontrada).
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

// DELETE /api/referee-evaluations/:id
// Elimina una evaluación.
// Espera: req.params.id.
// Devuelve: 200 con mensaje de éxito.
// Errores: 400 (id inválido o fallo de eliminación), 403 (permisos),
//          404 (evaluación no encontrada).
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
