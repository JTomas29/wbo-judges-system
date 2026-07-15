const Fight = require('../models/Fight');
const User = require('../models/User');
const ScoreCard = require('../models/ScoreCard');
const OfficialCard = require('../models/OfficialCard');

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

exports.complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'active') {
      return res.status(400).json({ message: 'Solo se puede finalizar una pelea activa' });
    }

    const scorecards = await ScoreCard.getAllByFight(Number(id));
    const allFinalized = scorecards.every((sc) => sc.scorecard_status === 'finalized');
    if (!allFinalized) {
      return res.status(400).json({ message: 'Todos los jueces deben haber enviado su tarjeta' });
    }

    const updated = await Fight.complete(Number(id));
    res.json({ message: 'Pelea finalizada correctamente.', fight: updated });
  } catch (err) {
    next(err);
  }
};

exports.getAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (fight.status !== 'analyzed') {
      return res.status(400).json({ message: 'La pelea debe estar analizada para ver el análisis.' });
    }

    const officialCard = await OfficialCard.findByFight(Number(id));

    const analysisResults = await Fight.getAnalysisSummary(Number(id));
    const roundDetail = await Fight.getRoundDetail(Number(id));
    const consistency = await Fight.getJudgeConsistency(Number(id));

    const judgesAnalysis = analysisResults.map((ar) => ({
      judge_id: ar.judge_id,
      judge_name: ar.judge_name,
      rounds: roundDetail
        .filter((r) => r.judge_id === ar.judge_id)
        .map((r) => ({
          round_number: r.round_number,
          official_score_red: r.official_score_red,
          official_score_blue: r.official_score_blue,
          judge_score_red: r.judge_score_red,
          judge_score_blue: r.judge_score_blue,
          result: r.judge_score_red === r.official_score_red && r.judge_score_blue === r.official_score_blue ? 'OK' : 'ERROR',
        })),
      matches: ar.matches,
      errors: ar.errors,
      match_pct: ar.match_pct,
    }));

    const response = {
      fight: {
        id: fight.id,
        event_name: fight.event_name,
        boxer_red: fight.boxer_red,
        boxer_blue: fight.boxer_blue,
        scheduled_date: fight.scheduled_date,
        venue: fight.venue,
        weight_class: fight.weight_class,
        status: fight.status,
      },
      official_card: officialCard
        ? {
            total_score_red: officialCard.total_score_red,
            total_score_blue: officialCard.total_score_blue,
            winner: officialCard.winner,
            rounds: (officialCard.rounds || []).map((r) => ({
              round_number: r.round_number,
              score_red: r.score_red,
              score_blue: r.score_blue,
            })),
          }
        : null,
      judges_analysis: judgesAnalysis,
      consistency,
    };

    if (req.user.role === 'judge') {
      const myAnalysis = judgesAnalysis.find((j) => j.judge_id === req.user.id);
      if (!myAnalysis) {
        return res.status(403).json({ message: 'No tienes análisis disponible para esta pelea.' });
      }
      return res.json({
        ...response,
        judges_analysis: [myAnalysis],
        consistency: [],
      });
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.analyze = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (fight.status === 'analyzed') {
      return res.status(400).json({ message: 'Esta pelea ya fue analizada.' });
    }

    if (fight.status !== 'completed') {
      return res.status(400).json({ message: 'La pelea debe estar finalizada antes de ejecutar el análisis.' });
    }

    const officialCard = await Fight.getOfficialCard(id);
    if (!officialCard) {
      return res.status(400).json({ message: 'Debe existir una tarjeta oficial para poder analizar la pelea.' });
    }

    const scorecards = await ScoreCard.getAllByFight(Number(id));
    const hasFinalized = scorecards.some((sc) => sc.scorecard_status === 'finalized');
    if (!hasFinalized) {
      return res.status(400).json({ message: 'Debe existir al menos una tarjeta de juez finalizada para ejecutar el análisis.' });
    }

    const results = await Fight.analyze(Number(id));
    res.json({
      fight_id: Number(id),
      status: 'analyzed',
      judges_analyzed: results.length,
      message: 'Análisis completado',
    });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const deletable = ['pending', 'cancelled'];
    if (!deletable.includes(fight.status)) {
      return res.status(400).json({ message: `No se puede eliminar una pelea en estado ${fight.status}` });
    }

    const [officialCard, analysisSummary] = await Promise.all([
      Fight.getOfficialCard(id),
      Fight.getAnalysisSummary(id),
    ]);

    if (officialCard) {
      return res.status(400).json({ message: 'No se puede eliminar una pelea que tiene una tarjeta oficial cargada' });
    }

    if (analysisSummary.length > 0) {
      return res.status(400).json({ message: 'No se puede eliminar una pelea que tiene an\u00e1lisis realizados' });
    }

    await Fight.deleteAssignments(id);
    const deleted = await Fight.deleteById(id);

    res.json({ message: 'Pelea eliminada correctamente.' });
  } catch (err) {
    next(err);
  }
};
