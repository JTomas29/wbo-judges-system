const User = require('../models/User');

// Controlador de jueces — gestión y asignación de jueces
exports.getAll = async (req, res, next) => {
  try {
    const judges = await User.getAllJudges();
    res.json(judges);
  } catch (err) {
    next(err);
  }
};

exports.assign = (req, res) => {
  // TODO: asignar juez(es) a una pelea
};

exports.getAssignments = (req, res) => {
  // TODO: obtener asignaciones de una pelea
};
