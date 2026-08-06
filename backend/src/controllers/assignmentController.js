const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');
const OfficialJudgeCard = require('../models/OfficialJudgeCard');
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

    const validTypes = ['evaluation', 'official', 'referee_evaluator'];
    if (!validTypes.includes(assignment_type)) {
      return res.status(400).json({ message: 'assignment_type debe ser evaluation, official o referee_evaluator' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden asignar jueces a peleas en estado pending' });

    const judge = await User.findById(judgeNum);
    if (!judge) return res.status(400).json({ message: 'El usuario indicado no existe' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario debe tener role judge' });
    if (!judge.is_active) return res.status(400).json({ message: 'El juez no está activo' });

    const existing = await JudgeAssignment.findOne(fightId, judgeNum);
    if (existing) return res.status(400).json({ message: 'El juez ya está asignado a esta pelea' });

    const count = await JudgeAssignment.getCount(fightId);
    if (count >= 10) return res.status(400).json({ message: 'No se pueden asignar más de 10 jueces a una pelea' });

    if (assignment_type === 'official') {
      const officialCount = await JudgeAssignment.getCountByType(fightId, 'official');
      if (officialCount >= 3) {
        return res.status(400).json({ message: 'Una pelea puede tener como máximo 3 jueces oficiales' });
      }
    }

    const assignment = await JudgeAssignment.create(fightId, judgeNum, assignment_type);

    const totalAssigned = await JudgeAssignment.getCount(fightId);
    await Fight.updateMinJudgesRequired(fightId, totalAssigned);

    // Los jueces oficiales puntúan en papel: no reciben notificación de la app.
    if (assignment_type !== 'official') {
      await Notification.create({
        userId: judgeNum,
        type: 'assignment',
        title: 'Fuiste designado para una pelea',
        message: `Has sido asignado a la pelea "${fight.event_name}".`,
        referenceType: 'fight',
        referenceId: fightId,
      });
    }

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
    if (fight.status === 'active') return res.status(400).json({ message: 'No se puede eliminar asignaciones de una pelea activa' });

    if (assignment.assignment_type === 'official') {
      await OfficialJudgeCard.deleteByFightAndJudge(fightNum, judgeNum);
    }

    await JudgeAssignment.delete(fightNum, judgeNum);

    const totalAfterRemove = await JudgeAssignment.getCount(fightNum);
    await Fight.updateMinJudgesRequired(fightNum, totalAfterRemove);

    res.status(204).end();
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

exports.getJudgeAssignments = async (req, res, next) => {
  try {
    const judgeId = parseInt(req.params.id, 10);
    if (!Number.isInteger(judgeId) || judgeId < 1) return res.status(400).json({ message: 'ID de juez inválido' });
    const assignments = await JudgeAssignment.getByJudgeId(judgeId);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};
