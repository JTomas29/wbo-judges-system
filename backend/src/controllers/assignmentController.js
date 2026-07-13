const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');

exports.assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { judge_id, assignment_type } = req.body;

    if (!judge_id || !assignment_type) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: judge_id, assignment_type' });
    }

    const validTypes = ['evaluator', 'referee_evaluator'];
    if (!validTypes.includes(assignment_type)) {
      return res.status(400).json({ message: 'assignment_type debe ser evaluator o referee_evaluator' });
    }

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden asignar jueces a peleas en estado pending' });

    const judge = await User.findById(judge_id);
    if (!judge) return res.status(400).json({ message: 'El usuario indicado no existe' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario debe tener role judge' });
    if (!judge.is_active) return res.status(400).json({ message: 'El juez no está activo' });

    if (fight.referee_id && Number(judge_id) === fight.referee_id) {
      return res.status(400).json({ message: 'No se puede asignar al árbitro de la pelea como juez' });
    }

    const existing = await JudgeAssignment.findOne(id, judge_id);
    if (existing) return res.status(400).json({ message: 'El juez ya está asignado a esta pelea' });

    const count = await JudgeAssignment.getCount(id);
    if (count >= 10) return res.status(400).json({ message: 'No se pueden asignar más de 10 jueces a una pelea' });

    const assignment = await JudgeAssignment.create(id, judge_id, assignment_type);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const assignments = await JudgeAssignment.getByFight(id);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id, judgeId } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const assignment = await JudgeAssignment.findOne(id, judgeId);
    if (!assignment) return res.status(404).json({ message: 'Asignación no encontrada' });
    if (assignment.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden eliminar asignaciones en estado pending' });
    if (fight.status === 'active') return res.status(400).json({ message: 'No se puede eliminar asignaciones de una pelea activa' });

    await JudgeAssignment.delete(id, judgeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response, reason } = req.body;
    const judgeId = req.user.id;

    if (!response || !['confirmed', 'rejected'].includes(response)) {
      return res.status(400).json({ message: 'response debe ser confirmed o rejected' });
    }

    if (response === 'rejected' && (!reason || !reason.trim())) {
      return res.status(400).json({ message: 'Debe indicar el motivo del rechazo' });
    }

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'La pelea ya no está en estado pending' });

    const assignment = await JudgeAssignment.findOne(id, judgeId);
    if (!assignment) return res.status(404).json({ message: 'No tienes una asignación para esta pelea' });
    if (assignment.status !== 'pending') {
      return res.status(409).json({ message: `La asignación ya fue respondida como ${assignment.status}` });
    }

    const updated = await JudgeAssignment.respond(id, judgeId, response, reason);
    const updatedFight = await Fight.getById(id);

    const allAssignments = await JudgeAssignment.getByFight(id);
    const confirmedCount = allAssignments.filter(a => a.status === 'confirmed').length;

    res.json({
      assignment: updated,
      fight_status: updatedFight.status,
      confirmed_count: confirmedCount,
      required_count: updatedFight.min_judges_required,
    });
  } catch (err) {
    next(err);
  }
};

exports.myAssignments = async (req, res, next) => {
  try {
    const assignments = await JudgeAssignment.getByJudgeId(req.user.id);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};
