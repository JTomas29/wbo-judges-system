const Fight = require('../models/Fight');

// Controlador de peleas — CRUD de eventos de boxeo
exports.getAll = async (req, res, next) => {
  try {
    const fights = await Fight.getAll();
    res.json(fights);
  } catch (err) {
    next(err);
  }
};

exports.getById = (req, res) => {
  // TODO: obtener una pelea por ID
};

exports.create = (req, res) => {
  // TODO: crear una nueva pelea
};

exports.update = (req, res) => {
  // TODO: actualizar una pelea existente
};

exports.remove = (req, res) => {
  // TODO: eliminar una pelea
};
