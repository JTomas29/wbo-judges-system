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

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const fight = await Fight.getById(id);
    if (!fight) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    const [assignedJudges, officialCard, analysisSummary] = await Promise.all([
      Fight.getAssignedJudges(id),
      Fight.getOfficialCard(id),
      Fight.getAnalysisSummary(id),
    ]);

    res.json({
      ...fight,
      assigned_judges: assignedJudges,
      official_card: officialCard || null,
      analysis_summary: analysisSummary,
    });
  } catch (err) {
    next(err);
  }
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
