const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');
const Notification = require('../models/Notification');

exports.assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });

    const { judge_id, assignment_type } = req.body;

    if (!judge_id || !assignment_type) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: judge_id, assignment_type' });
    }

    const judgeNum = parseInt(judge_id, 10);
    if (!Number.isInteger(judgeNum) || judgeNum < 1) {
      return res.status(400).json({ message: 'judge_id inválido' });
    }

    const validTypes = ['evaluator', 'referee_evaluator'];
    if (!validTypes.includes(assignment_type)) {
      return res.status(400).json({ message: 'assignment_type debe ser evaluator o referee_evaluator' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden asignar jueces a peleas en estado pending' });

    const judge = await User.findById(judgeNum);
    if (!judge) return res.status(400).json({ message: 'El usuario indicado no existe' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario debe tener role judge' });
    if (!judge.is_active) return res.status(400).json({ message: 'El juez no está activo' });

    if (fight.referee_id && judgeNum === fight.referee_id) {
      return res.status(400).json({ message: 'No se puede asignar al árbitro de la pelea como juez' });
    }

    const existing = await JudgeAssignment.findOne(fightId, judgeNum);
    if (existing) return res.status(400).json({ message: 'El juez ya está asignado a esta pelea' });

    const count = await JudgeAssignment.getCount(fightId);
    if (count >= 10) return res.status(400).json({ message: 'No se pueden asignar más de 10 jueces a una pelea' });

    const assignment = await JudgeAssignment.create(fightId, judgeNum, assignment_type);

    await Notification.create({
      userId: judgeNum,
      type: 'assignment',
      title: 'Fuiste designado para una pelea',
      message: `Has sido asignado a la pelea "${fight.event_name}".`,
      referenceType: 'fight',
      referenceId: fightId,
    });

    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const assignments = await JudgeAssignment.getByFight(fightId);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id, judgeId } = req.params;
    const fightNum = parseInt(id, 10);
    if (!Number.isInteger(fightNum) || fightNum < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const judgeNum = parseInt(judgeId, 10);
    if (!Number.isInteger(judgeNum) || judgeNum < 1) return res.status(400).json({ message: 'ID de juez inválido' });

    const fight = await Fight.getById(fightNum);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const assignment = await JudgeAssignment.findOne(fightNum, judgeNum);
    if (!assignment) return res.status(404).json({ message: 'Asignación no encontrada' });
    if (assignment.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden eliminar asignaciones en estado pending' });
    if (fight.status === 'active') return res.status(400).json({ message: 'No se puede eliminar asignaciones de una pelea activa' });

    await JudgeAssignment.delete(fightNum, judgeNum);

    await Notification.create({
      userId: judgeNum,
      type: 'assignment',
      title: 'Asignación eliminada',
      message: `Tu asignación como juez en la pelea "${fight.event_name}" fue eliminada`,
      referenceType: 'fight',
      referenceId: fightNum,
    });

    const adminSupervisorIds = await Notification.getAdminAndSupervisorIds();
    const judge = await User.findById(judgeNum);
    await Notification.createForUsers(adminSupervisorIds, {
      type: 'assignment',
      title: 'Asignación eliminada',
      message: `La asignación del juez "${judge ? judge.name : judgeNum}" en la pelea "${fight.event_name}" fue eliminada`,
      referenceType: 'fight',
      referenceId: fightNum,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const { response, reason } = req.body;
    const judgeId = req.user.id;

    if (!response || !['confirmed', 'rejected'].includes(response)) {
      return res.status(400).json({ message: 'response debe ser confirmed o rejected' });
    }

    if (response === 'rejected' && (!reason || !reason.trim())) {
      return res.status(400).json({ message: 'Debe indicar el motivo del rechazo' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'La pelea ya no está en estado pending' });

    const assignment = await JudgeAssignment.findOne(fightId, judgeId);
    if (!assignment) return res.status(404).json({ message: 'No tienes una asignación para esta pelea' });
    if (assignment.status !== 'pending') {
      return res.status(409).json({ message: `La asignación ya fue respondida como ${assignment.status}` });
    }

    const updated = await JudgeAssignment.respond(fightId, judgeId, response, reason);
    const updatedFight = await Fight.getById(fightId);

    const allAssignments = await JudgeAssignment.getByFight(fightId);
    const confirmedCount = allAssignments.filter(a => a.status === 'confirmed').length;

    const judge = await User.findById(judgeId);
    const adminSupervisorIds = await Notification.getAdminAndSupervisorIds();

    if (response === 'confirmed') {
      await Notification.createForUsers(adminSupervisorIds, {
        type: 'status_change',
        title: 'Juez confirmó participación',
        message: `El juez "${judge.name}" confirmó su participación en la pelea "${fight.event_name}"`,
        referenceType: 'fight',
        referenceId: fightId,
      });
    } else {
      await Notification.createForUsers(adminSupervisorIds, {
        type: 'status_change',
        title: 'Designación rechazada',
        message: `${judge.name} rechazó la designación para la pelea "${fight.event_name}"`,
        referenceType: 'fight',
        referenceId: fightId,
      });
    }

    if (fight.status === 'pending' && updatedFight && updatedFight.status === 'active') {
      await Notification.createForUsers(adminSupervisorIds, {
        type: 'status_change',
        title: 'Pelea lista para comenzar',
        message: 'Todos los jueces confirmaron su participación.',
        referenceType: 'fight',
        referenceId: fightId,
      });
    }

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
