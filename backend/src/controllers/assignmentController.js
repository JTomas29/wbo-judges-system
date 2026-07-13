const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');

exports.assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { judge_id, assignment_type } = req.body;

    // Validar campos obligatorios
    if (!judge_id || !assignment_type) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: judge_id, assignment_type' });
    }

    // Validar assignment_type
    const validTypes = ['evaluator', 'referee_evaluator'];
    if (!validTypes.includes(assignment_type)) {
      return res.status(400).json({ message: 'assignment_type debe ser evaluator o referee_evaluator' });
    }

    // Validar que la pelea exista
    const fight = await Fight.getById(id);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    // Validar que la pelea estÃ© en status pending
    if (fight.status !== 'pending') {
      return res.status(400).json({ message: 'Solo se pueden asignar jueces a peleas en estado pending' });
    }

    // Validar que el usuario exista
    const judge = await User.findById(judge_id);
    if (!judge) {
      return res.status(400).json({ message: 'El usuario indicado no existe' });
    }

    // Validar que tenga role judge
    if (judge.role !== 'judge') {
      return res.status(400).json({ message: 'El usuario debe tener role judge' });
    }

    // Validar que estÃ© activo
    if (!judge.is_active) {
      return res.status(400).json({ message: 'El juez no estÃ¡ activo' });
    }

    // Validar que no sea el referee de la pelea
    if (fight.referee_id && Number(judge_id) === fight.referee_id) {
      return res.status(400).json({ message: 'No se puede asignar al Ã¡rbitro de la pelea como juez' });
    }

    // Validar que no haya asignaciÃ³n duplicada
    const existing = await JudgeAssignment.findOne(id, judge_id);
    if (existing) {
      return res.status(400).json({ message: 'El juez ya estÃ¡ asignado a esta pelea' });
    }

    // Validar mÃ¡ximo 10 asignaciones
    const count = await JudgeAssignment.getCount(id);
    if (count >= 10) {
      return res.status(400).json({ message: 'No se pueden asignar mÃ¡s de 10 jueces a una pelea' });
    }

    const assignment = await JudgeAssignment.create(id, judge_id, assignment_type);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id, judgeId } = req.params;

    // Validar que la pelea exista
    const fight = await Fight.getById(id);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    // Validar que la asignaciÃ³n exista
    const assignment = await JudgeAssignment.findOne(id, judgeId);
    if (!assignment) {
      return res.status(404).json({ message: 'AsignaciÃ³n no encontrada' });
    }

    // Validar que estÃ© pending
    if (assignment.status !== 'pending') {
      return res.status(400).json({ message: 'Solo se pueden eliminar asignaciones en estado pending' });
    }

    // Validar que la pelea no estÃ© active
    if (fight.status === 'active') {
      return res.status(400).json({ message: 'No se puede eliminar asignaciones de una pelea activa' });
    }

    await JudgeAssignment.delete(id, judgeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;

    const fight = await Fight.getById(id);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    const assignments = await JudgeAssignment.getByFight(id);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};
