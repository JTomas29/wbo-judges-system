const Fight = require('../models/Fight');
const User = require('../models/User');

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
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const [assignedJudges, officialCard, analysisSummary] = await Promise.all([
      Fight.getAssignedJudges(id),
      Fight.getOfficialCard(id),
      Fight.getAnalysisSummary(id),
    ]);

    res.json({ ...fight, assigned_judges: assignedJudges, official_card: officialCard || null, analysis_summary: analysisSummary });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes } = req.body;

    if (!event_name || !boxer_red || !boxer_blue || !scheduled_date || !total_rounds || !weight_class) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class' });
    }

    if (boxer_red.trim().toLowerCase() === boxer_blue.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Los nombres de los boxeadores no pueden ser iguales' });
    }

    const fightDate = new Date(scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fightDate < today) {
      return res.status(400).json({ message: 'La fecha debe ser hoy o posterior' });
    }

    const validRounds = [4, 6, 8, 10, 12];
    const rounds = Number(total_rounds);
    if (!validRounds.includes(rounds)) {
      return res.status(400).json({ message: 'total_rounds debe ser 4, 6, 8, 10 o 12' });
    }

    if (referee_id) {
      const referee = await User.findById(referee_id);
      if (!referee) {
        return res.status(400).json({ message: 'El referee_id indicado no existe' });
      }
    }

    const fightId = await Fight.create({
      event_name: event_name.trim(),
      boxer_red: boxer_red.trim(),
      boxer_blue: boxer_blue.trim(),
      scheduled_date,
      total_rounds: rounds,
      weight_class,
      venue,
      title,
      referee_id: referee_id || null,
      broadcaster,
      notes,
      created_by: req.user.id,
    });

    const created = await Fight.getById(fightId);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes } = req.body;

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const nonEditable = ['completed', 'analyzed', 'cancelled'];
    if (nonEditable.includes(fight.status)) {
      return res.status(400).json({ message: `No se puede editar una pelea en estado ${fight.status}` });
    }

    if (!event_name || !boxer_red || !boxer_blue || !scheduled_date || !total_rounds || !weight_class) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class' });
    }

    if (boxer_red.trim().toLowerCase() === boxer_blue.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Los nombres de los boxeadores no pueden ser iguales' });
    }

    const fightDate = new Date(scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fightDate < today) {
      return res.status(400).json({ message: 'La fecha debe ser hoy o posterior' });
    }

    const validRounds = [4, 6, 8, 10, 12];
    const rounds = Number(total_rounds);
    if (!validRounds.includes(rounds)) {
      return res.status(400).json({ message: 'total_rounds debe ser 4, 6, 8, 10 o 12' });
    }

    if (referee_id) {
      const referee = await User.findById(referee_id);
      if (!referee) {
        return res.status(400).json({ message: 'El referee_id indicado no existe' });
      }
    }

    await Fight.update(id, {
      event_name: event_name.trim(),
      boxer_red: boxer_red.trim(),
      boxer_blue: boxer_blue.trim(),
      scheduled_date,
      total_rounds: rounds,
      weight_class,
      venue,
      title,
      referee_id: referee_id || null,
      broadcaster,
      notes,
    });

    const updated = await Fight.getById(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res) => {
  res.status(501).json({ message: 'No implementado' });
};
