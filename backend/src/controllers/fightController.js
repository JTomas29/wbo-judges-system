const Fight = require('../models/Fight');
const User = require('../models/User');
const Referee = require('../models/Referee');
const ScoreCard = require('../models/ScoreCard');
const OfficialCard = require('../models/OfficialCard');
const JudgeAssignment = require('../models/JudgeAssignment');
const Notification = require('../models/Notification');

const RESULT_TYPES = ['decision', 'ko', 'tko', 'rtd', 'dq', 'nc'];
const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

exports.getAll = async (req, res, next) => {
  try {
    const fights = await Fight.getAll();
    res.json(fights);
  } catch (err) {
    next(err);
  }
};

const validateFightId = (id) => {
  const num = parseInt(id, 10);
  if (!Number.isInteger(num) || num < 1) return 'ID de pelea inválido';
  return null;
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const [assignedJudges, officialCard, analysisSummary] = await Promise.all([
      Fight.getAssignedJudges(id),
      Fight.getOfficialCard(id),
      Fight.getAnalysisSummary(id),
    ]);

    const filteredJudges = req.user.role === 'judge'
      ? assignedJudges.filter((j) => j.id === req.user.id)
      : assignedJudges;

    res.json({ ...fight, assigned_judges: filteredJudges, official_card: officialCard || null, analysis_summary: analysisSummary });
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
    if (isNaN(fightDate.getTime())) {
      return res.status(400).json({ message: 'La fecha proporcionada no es válida' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fightDate < today) {
      return res.status(400).json({ message: 'La fecha debe ser hoy o posterior' });
    }

    const validRounds = [4, 6, 8, 10, 12];
    const rounds = Number(total_rounds);
    if (!Number.isInteger(rounds) || !validRounds.includes(rounds)) {
      return res.status(400).json({ message: 'total_rounds debe ser 4, 6, 8, 10 o 12' });
    }

    if (referee_id) {
      console.log('TRACE create BODY:', req.body);
      console.log('TRACE create referee_id:', referee_id);
      console.log('TRACE create typeof referee_id:', typeof referee_id);
      const refId = parseInt(referee_id, 10);
      console.log('TRACE create refId (parseInt):', refId);
      if (!Number.isInteger(refId) || refId < 1) {
        return res.status(400).json({ message: 'referee_id inválido' });
      }
      const referee = await Referee.getById(refId);
      console.log('TRACE create Referee encontrado:', referee);
      if (!referee) {
        return res.status(400).json({ message: 'El referee_id indicado no existe' });
      }
      if (!referee.active) {
        return res.status(400).json({ message: 'No se puede asignar un árbitro inactivo' });
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
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const { event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes } = req.body;

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const nonEditable = ['completed', 'analyzed', 'cancelled', 'archived'];
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
    if (isNaN(fightDate.getTime())) {
      return res.status(400).json({ message: 'La fecha proporcionada no es válida' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fightDate < today) {
      return res.status(400).json({ message: 'La fecha debe ser hoy o posterior' });
    }

    const validRounds = [4, 6, 8, 10, 12];
    const rounds = Number(total_rounds);
    if (!Number.isInteger(rounds) || !validRounds.includes(rounds)) {
      return res.status(400).json({ message: 'total_rounds debe ser 4, 6, 8, 10 o 12' });
    }

    if (referee_id) {
      console.log('TRACE update BODY:', req.body);
      console.log('TRACE update referee_id:', referee_id);
      console.log('TRACE update typeof referee_id:', typeof referee_id);
      const refId = parseInt(referee_id, 10);
      console.log('TRACE update refId (parseInt):', refId);
      if (!Number.isInteger(refId) || refId < 1) {
        return res.status(400).json({ message: 'referee_id inválido' });
      }
      const referee = await Referee.getById(refId);
      console.log('TRACE update Referee encontrado:', referee);
      if (!referee) {
        return res.status(400).json({ message: 'El referee_id indicado no existe' });
      }
      if (!referee.active) {
        return res.status(400).json({ message: 'No se puede asignar un árbitro inactivo' });
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

exports.activate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (fight.status !== 'pending') {
      return res.status(400).json({ message: 'Solo se puede activar una pelea en estado pending' });
    }

    const assignedCount = await JudgeAssignment.getCount(id);
    if (assignedCount < 3) {
      return res.status(400).json({ message: 'Se necesitan al menos 3 jueces designados para activar la pelea' });
    }

    const updated = await Fight.activate(id);
    if (!updated) {
      return res.status(409).json({ message: 'No se pudo activar la pelea' });
    }

    const assignments = await JudgeAssignment.getByFight(id);
    await Promise.all(
      assignments.map((a) =>
        Notification.create({
          userId: a.judge_id,
          type: 'status_change',
          title: 'Pelea lista para comenzar',
          message: `La pelea "${fight.event_name}" está activa. Ya podés cargar tu tarjeta de puntuación.`,
          referenceType: 'fight',
          referenceId: Number(id),
        })
      )
    );

    res.json({
      message: 'Pelea activada correctamente.',
      fight: { ...updated, assigned_judges: assignments },
    });
  } catch (err) {
    next(err);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
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

exports.registerResult = async (req, res, next) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ message: 'Solo el Supervisor puede registrar el resultado oficial de la pelea.' });
    }

    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const { result_type, winner, round, time } = req.body;
    const type = String(result_type || '').trim().toLowerCase();
    if (!RESULT_TYPES.includes(type)) {
      return res.status(400).json({ message: `result_type debe ser uno de: ${RESULT_TYPES.join(', ')}` });
    }

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (fight.status === 'archived' || fight.status === 'cancelled') {
      return res.status(400).json({ message: 'No se puede registrar el resultado de una pelea archivada o cancelada.' });
    }
    if (fight.result_type) {
      return res.status(409).json({ message: 'Esta pelea ya tiene un resultado oficial registrado.' });
    }

    let resultWinner = null;
    if (type === 'nc') {
      if (winner && String(winner).trim()) {
        return res.status(400).json({ message: 'Una pelea sin decisión (NC) no tiene ganador.' });
      }
    } else {
      const name = String(winner || '').trim();
      if (!name) {
        return res.status(400).json({ message: 'Debe indicar el ganador de la pelea.' });
      }
      const red = fight.boxer_red.trim().toLowerCase();
      const blue = fight.boxer_blue.trim().toLowerCase();
      if (name.toLowerCase() !== red && name.toLowerCase() !== blue) {
        return res.status(400).json({ message: 'El ganador debe ser uno de los boxeadores de la pelea.' });
      }
      resultWinner = name;
    }

    let resultRound = null;
    let resultTime = null;
    if (EARLY_RESULT_TYPES.includes(type)) {
      resultRound = Number(round);
      if (!Number.isInteger(resultRound) || resultRound < 1 || resultRound > Number(fight.total_rounds)) {
        return res.status(400).json({ message: `round debe ser un entero entre 1 y ${fight.total_rounds}.` });
      }
      resultTime = String(time || '').trim();
      if (!/^[0-9]{1,2}:[0-5][0-9]$/.test(resultTime)) {
        return res.status(400).json({ message: 'time debe tener formato m:ss (ej: 2:35).' });
      }
    }

    const updated = await Fight.registerResult(id, {
      result_type: type,
      result_winner: resultWinner,
      result_round: resultRound,
      result_time: resultTime,
      result_registered_by: req.user.id,
    });

    res.json({
      message: type === 'decision'
        ? 'Resultado oficial por decisión registrado correctamente.'
        : `Pelea finalizada por ${type.toUpperCase()} en el round ${resultRound}.`,
      fight: updated,
    });
  } catch (err) {
    next(err);
  }
};

const computeWinner = (scoreRed, scoreBlue) => {
  if (scoreRed > scoreBlue) return 'red';
  if (scoreBlue > scoreRed) return 'blue';
  return 'draw';
};

exports.getAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (fight.status !== 'analyzed') {
      return res.status(400).json({ message: 'La pelea debe estar analizada para ver el análisis.' });
    }

    const officialCard = await OfficialCard.findByFight(Number(id));
    const analysisResults = await Fight.getAnalysisSummary(Number(id));
    const roundDetail = await Fight.getRoundDetail(Number(id));

    const officialRounds = (officialCard?.rounds || []).map((r) => ({
      round_number: r.round_number,
      score_red: r.final_score_red,
      score_blue: r.final_score_blue,
      winner: computeWinner(r.final_score_red, r.final_score_blue),
    }));

    const judges = analysisResults.map((ar) => {
      const judgeRounds = roundDetail
        .filter((r) => r.judge_id === ar.judge_id)
        .map((r) => {
          const matchExact = r.judge_score_red === r.official_score_red && r.judge_score_blue === r.official_score_blue;
          const officialWinner = computeWinner(r.official_score_red, r.official_score_blue);
          const judgeWinner = computeWinner(r.judge_score_red, r.judge_score_blue);
          return {
            round_number: r.round_number,
            score_red: r.judge_score_red,
            score_blue: r.judge_score_blue,
            winner: judgeWinner,
            match_exact: matchExact,
            match_winner: officialWinner === judgeWinner,
          };
        });

      const exactMatches = judgeRounds.filter((r) => r.match_exact).length;
      const exactErrors = judgeRounds.filter((r) => !r.match_exact).length;
      const winnerMatches = judgeRounds.filter((r) => r.match_winner).length;
      const winnerErrors = judgeRounds.filter((r) => !r.match_winner).length;

      return {
        id: ar.judge_id,
        name: ar.judge_name,
        rounds: judgeRounds,
        total_score_red: judgeRounds.reduce((sum, r) => sum + r.score_red, 0),
        total_score_blue: judgeRounds.reduce((sum, r) => sum + r.score_blue, 0),
        exact_matches: exactMatches,
        exact_errors: exactErrors,
        exact_match_pct: judgeRounds.length > 0 ? Math.round((exactMatches / judgeRounds.length) * 100) : 0,
        winner_matches: winnerMatches,
        winner_errors: winnerErrors,
        winner_match_pct: judgeRounds.length > 0 ? Math.round((winnerMatches / judgeRounds.length) * 100) : 0,
      };
    });

    const totalRounds = officialRounds.length;
    let roundsOk = 0;
    let roundsError = 0;
    judges.forEach((j) => {
      j.rounds.forEach((r) => {
        if (r.match_exact) roundsOk++; else roundsError++;
      });
    });

    const fightsOk = judges.filter((j) => j.exact_errors === 0).length;
    const fightsError = judges.filter((j) => j.exact_errors > 0).length;

    const perRoundSummary = officialRounds.map((or) => {
      let ok = 0, errors = 0, winnerOk = 0, winnerErrors = 0;
      judges.forEach((j) => {
        const jr = j.rounds.find((r) => r.round_number === or.round_number);
        if (jr) {
          if (jr.match_exact) ok++; else errors++;
          if (jr.match_winner) winnerOk++; else winnerErrors++;
        }
      });
      return { round_number: or.round_number, errors, ok, winner_errors: winnerErrors, winner_ok: winnerOk };
    });

    const response = {
      fight: {
        id: fight.id,
        event_name: fight.event_name,
        boxer_red: fight.boxer_red,
        boxer_blue: fight.boxer_blue,
        scheduled_date: fight.scheduled_date,
        total_rounds: fight.total_rounds,
        status: fight.status,
        venue: fight.venue,
        weight_class: fight.weight_class,
      },
      summary: {
        total_judges: judges.length,
        total_rounds: totalRounds,
        rounds_ok: roundsOk,
        rounds_error: roundsError,
        fights_ok: fightsOk,
        fights_error: fightsError,
      },
      official_card: {
        rounds: officialRounds,
        total_score_red: officialCard?.total_score_red || 0,
        total_score_blue: officialCard?.total_score_blue || 0,
      },
      judges,
      per_round_summary: perRoundSummary,
    };

    if (req.user.role === 'judge') {
      const myAnalysis = judges.find((j) => j.id === req.user.id);
      if (!myAnalysis) {
        return res.status(403).json({ message: 'No tienes análisis disponible para esta pelea.' });
      }
      return res.json({
        ...response,
        summary: {
          ...response.summary,
          total_judges: 1,
          rounds_ok: myAnalysis.exact_matches,
          rounds_error: myAnalysis.exact_errors,
          fights_ok: myAnalysis.exact_errors === 0 ? 1 : 0,
          fights_error: myAnalysis.exact_errors > 0 ? 1 : 0,
        },
        judges: [myAnalysis],
        per_round_summary: perRoundSummary.map((pr) => {
          const jr = myAnalysis.rounds.find((r) => r.round_number === pr.round_number);
          return {
            round_number: pr.round_number,
            ok: jr?.match_exact ? 1 : 0,
            errors: jr?.match_exact ? 0 : 1,
            winner_ok: jr?.match_winner ? 1 : 0,
            winner_errors: jr?.match_winner ? 0 : 1,
          };
        }),
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
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
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

exports.archive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const archived = await Fight.archive(id);
    if (!archived) {
      return res.status(409).json({ message: 'La pelea ya se encuentra archivada' });
    }

    res.json({ message: 'Pelea archivada correctamente.' });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { searchEvent, dateFrom, dateTo, weightClass } = req.query;
    const fights = await Fight.getHistory({ searchEvent, dateFrom, dateTo, weightClass });
    res.json(fights);
  } catch (err) {
    next(err);
  }
};
