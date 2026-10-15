// ─── assignmentController.js — Asignación de jueces a peleas ───
// Responsabilidad: coordinar el alta, listado, baja y consulta de las
// asignaciones de jueces (evaluation, official y referee_evaluator) a cada
// pelea, manteniendo la integridad del panel y el cupo de jueces.

const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');
const OfficialJudgeCard = require('../models/OfficialJudgeCard');
const Notification = require('../models/Notification');

// POST /api/fights/:id/assignments
// Asigna un juez a una pelea según el tipo de asignación.
// Espera: req.params.id = id de pelea; req.body = { judge_id, assignment_type }.
// Devuelve: 201 con la asignación creada en JSON.
// Errores: 400 (ids/campos/tipos inválidos, pelea no 'pending', juez
// inexistente/no activo/sin rol judge, asignación duplicada, cupo máximo
// alcanzado), 404 (pelea no encontrada).
exports.assign = async (req, res, next) => {
  try {
    // El id de la pelea debe venir por parámetro y ser un entero positivo.
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });

    // El juez y el tipo de asignación llegan en el cuerpo de la petición.
    const { judge_id, assignment_type } = req.body;

    // Campos obligatorios del cuerpo: sin ellos no hay asignación posible.
    if (!judge_id || !assignment_type) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: judge_id, assignment_type' });
    }

    // Normalizamos el juez a número entero para las consultas.
    const judgeNum = parseInt(judge_id, 10);
    if (!Number.isInteger(judgeNum) || judgeNum < 1) {
      return res.status(400).json({ message: 'judge_id inválido' });
    }

    // Tipos permitidos: cada uno define el flujo de puntuación posterior.
    const validTypes = ['evaluation', 'official', 'referee_evaluator'];
    if (!validTypes.includes(assignment_type)) {
      return res.status(400).json({ message: 'assignment_type debe ser evaluation, official o referee_evaluator' });
    }

    // Solo se pueden sumar jueces mientras la pelea espera por comenzar.
    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') return res.status(400).json({ message: 'Solo se pueden asignar jueces a peleas en estado pending' });

    // El asignado debe ser un usuario existente, con rol 'judge' y activo.
    const judge = await User.findById(judgeNum);
    if (!judge) return res.status(400).json({ message: 'El usuario indicado no existe' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario debe tener role judge' });
    if (!judge.is_active) return res.status(400).json({ message: 'El juez no está activo' });

    // Evitamos asignaciones duplicadas del mismo juez a la misma pelea.
    const existing = await JudgeAssignment.findOne(fightId, judgeNum);
    if (existing) return res.status(400).json({ message: 'El juez ya está asignado a esta pelea' });

    // Límite global de 10 jueces por pelea (regla de aforo del sistema).
    const count = await JudgeAssignment.getCount(fightId);
    if (count >= 10) return res.status(400).json({ message: 'No se pueden asignar más de 10 jueces a una pelea' });

    // Además, como máximo 3 oficiales: son quienes puntúan en papel y su
    // tarjeta la carga el supervisor.
    if (assignment_type === 'official') {
      const officialCount = await JudgeAssignment.getCountByType(fightId, 'official');
      if (officialCount >= 3) {
        return res.status(400).json({ message: 'Una pelea puede tener como máximo 3 jueces oficiales' });
      }
    }

    // Persistimos la asignación.
    const assignment = await JudgeAssignment.create(fightId, judgeNum, assignment_type);

    // Recalculamos el cupo disponible y actualizamos el mínimo de jueces
    // exigido para poder activar la pelea.
    const totalAssigned = await JudgeAssignment.getCount(fightId);
    await Fight.updateMinJudgesRequired(fightId, totalAssigned);

    // Los jueces oficiales puntúan en papel: no reciben notificación de la app.
    if (assignment_type !== 'official') {
      // El resto de jueces sí: se les notifica en la app que fueron elegidos.
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
    // Propaga el error al middleware global de errores.
    next(err);
  }
};

// GET /api/fights/:id/assignments
// Obtiene todas las asignaciones de una pelea.
// Espera: req.params.id = id de pelea.
// Devuelve: 200 con el array de asignaciones.
// Errores: 400 (id inválido), 404 (pelea no encontrada).
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

// DELETE /api/fights/:id/assignments/:judgeId
// Quita la asignación de un juez a una pelea.
// Espera: req.params.id = pelea; req.params.judgeId = juez.
// Devuelve: 204 sin cuerpo.
// Errores: 400 (ids inválidos, pelea activa), 404 (pelea o asignación no
// encontradas).
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
    // No se puede retirar a un juez cuando la pelea ya está en marcha.
    if (fight.status === 'active') return res.status(400).json({ message: 'No se puede eliminar asignaciones de una pelea activa' });

    // Si era juez oficial en papel, también se eliminan sus tarjetas
    // oficiales cargadas para evitar datos huérfanos.
    if (assignment.assignment_type === 'official') {
      await OfficialJudgeCard.deleteByFightAndJudge(fightNum, judgeNum);
    }

    await JudgeAssignment.delete(fightNum, judgeNum);

    // Volvemos a recalcular el mínimo de jueces con el cupo posterior a la baja.
    const totalAfterRemove = await JudgeAssignment.getCount(fightNum);
    await Fight.updateMinJudgesRequired(fightNum, totalAfterRemove);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// GET /api/assignments/mine
// Devuelve las asignaciones del juez autenticado (identidad tomada del JWT).
// Espera: req.user.id (inyectado por authMiddleware).
// Devuelve: 200 con el array de asignaciones del juez. Sin errores previstos
// más que los del servidor.
exports.myAssignments = async (req, res, next) => {
  try {
    const assignments = await JudgeAssignment.getByJudgeId(req.user.id);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

// GET /api/judges/:id/assignments
// Lista las asignaciones de un juez concreto (consulta administrativa).
// Espera: req.params.id = id de juez.
// Devuelve: 200 con el array de asignaciones.
// Errores: 400 (id inválido).
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
