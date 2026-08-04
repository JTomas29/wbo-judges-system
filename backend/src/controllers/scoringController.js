const ScoreCard = require('../models/ScoreCard');
const RoundScore = require('../models/RoundScore');
const Fight = require('../models/Fight');
const JudgeAssignment = require('../models/JudgeAssignment');

const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// Normaliza el descuento enviado por el frontend: solo 0, 1 o 2 puntos.
// Devuelve null si el valor no es válido.
const toDeduction = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 2) return null;
  return n;
};

const hasEarlyResult = (fight) =>
  !!fight && EARLY_RESULT_TYPES.includes(fight.result_type);

// Rounds que el juez efectivamente debe puntuar: si la pelea terminó
// anticipadamente, solo hasta el round de la finalización.
const getEffectiveTotalRounds = (fight) => {
  if (hasEarlyResult(fight) && fight.result_round) return Number(fight.result_round);
  return Number(fight?.total_rounds) || 0;
};

// La tarjeta se puede cargar mientras la pelea está activa, o cuando
// terminó anticipadamente (los jueces completan hasta result_round).
const isFightScoreable = (fight) => {
  if (!fight) return false;
  if (fight.status === 'active') return true;
  return fight.status === 'completed' && hasEarlyResult(fight);
};

exports.createOrGetScorecard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const judgeId = req.user.id;

    if (req.user.role !== 'judge') {
      return res.status(403).json({ message: 'Solo los jueces pueden crear tarjetas de puntuación' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (!isFightScoreable(fight)) {
      return res.status(400).json({ message: 'La pelea no está en estado activo' });
    }

    const assignment = await JudgeAssignment.findOne(fightId, judgeId);
    if (!assignment) {
      return res.status(403).json({ message: 'No tienes una asignación para esta pelea' });
    }

    //aca esta el problema de que se debe confirmar antes la asignacion para poder puntuar, si no se confirma no se puede puntuar
    ///if (assignment.status !== 'confirmed') {
    //  return res.status(403).json({ message: 'Debes confirmar la asignación antes de puntuar' });
    //

    const scoreCard = await ScoreCard.findOrCreate(fightId, judgeId);
    const roundScores = await ScoreCard.getRoundScores(scoreCard.id);

    res.json({ score_card: scoreCard, round_scores: roundScores });
  } catch (err) {
    next(err);
  }
};

exports.getMyScorecard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const judgeId = req.user.id;

    const scoreCard = await ScoreCard.findByFightAndJudge(fightId, judgeId);

    if (!scoreCard) return res.json({ score_card: null, round_scores: [] });

    const roundScores = await ScoreCard.getRoundScores(scoreCard.id);
    res.json({ score_card: scoreCard, round_scores: roundScores });
  } catch (err) {
    next(err);
  }
};

exports.saveRound = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scoreCardId = parseInt(id, 10);
    if (!Number.isInteger(scoreCardId) || scoreCardId < 1) return res.status(400).json({ message: 'ID de tarjeta inválido' });
    const { round_number, score_red, score_blue, notes } = req.body;

    if (round_number == null || !Number.isInteger(Number(round_number)) || Number(round_number) < 1) {
      return res.status(400).json({ message: 'round_number debe ser un entero positivo' });
    }

    const scoreCard = await ScoreCard.findById(scoreCardId);
    if (!scoreCard) return res.status(404).json({ message: 'Tarjeta no encontrada' });

    if (scoreCard.judge_id !== req.user.id) {
      return res.status(403).json({ message: 'No puedes modificar una tarjeta que no te pertenece' });
    }

    if (scoreCard.status !== 'draft') {
      return res.status(400).json({ message: 'La tarjeta ya está finalizada y no se puede modificar' });
    }

    const fightForRound = await Fight.getById(scoreCard.fight_id);
    if (!fightForRound) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    const effectiveRounds = getEffectiveTotalRounds(fightForRound);
    if (Number(round_number) > effectiveRounds) {
      return res.status(400).json({
        message: hasEarlyResult(fightForRound)
          ? `La pelea finalizó oficialmente en el round ${effectiveRounds}. No es posible cargar puntuaciones posteriores.`
          : `round_number no puede superar los ${effectiveRounds} rounds de la pelea.`,
      });
    }

    if (score_red == null || score_blue == null) {
      return res.status(400).json({ message: 'score_red y score_blue son obligatorios' });
    }

    const sRed = Number(score_red);
    const sBlue = Number(score_blue);

    if (!Number.isInteger(sRed) || sRed < 1 || sRed > 10) {
      return res.status(400).json({ message: 'score_red debe ser un número entero entre 1 y 10' });
    }
    if (!Number.isInteger(sBlue) || sBlue < 1 || sBlue > 10) {
      return res.status(400).json({ message: 'score_blue debe ser un número entero entre 1 y 10' });
    }

    // Descuentos de puntos por round: 0, 1 o 2 puntos por boxeador.
    // El puntaje final se calcula en el servidor (no se confía en el frontend).
    const deductionRed = toDeduction(req.body.deduction_red);
    const deductionBlue = toDeduction(req.body.deduction_blue);

    if (deductionRed === null || deductionBlue === null) {
      return res.status(400).json({ message: 'El descuento debe ser 0, 1 o 2 puntos' });
    }

    const finalRed = sRed - deductionRed;
    const finalBlue = sBlue - deductionBlue;

    if (finalRed < 1) {
      return res.status(400).json({ message: 'El descuento no puede dejar al boxeador rojo con menos de 1 punto' });
    }
    if (finalBlue < 1) {
      return res.status(400).json({ message: 'El descuento no puede dejar al boxeador azul con menos de 1 punto' });
    }

    const round = await RoundScore.upsert({
      scoreCardId: scoreCardId,
      roundNumber: round_number,
      scoreRed: sRed,
      scoreBlue: sBlue,
      deductionRed,
      deductionBlue,
      notes: notes ?? null,
    });

    res.json(round);
  } catch (err) {
    next(err);
  }
};

exports.getAllScorecards = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const scorecards = await ScoreCard.getAllByFight(fightId);
    res.json(scorecards);
  } catch (err) {
    next(err);
  }
};

exports.finalizeScorecard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scoreCardId = parseInt(id, 10);
    if (!Number.isInteger(scoreCardId) || scoreCardId < 1) return res.status(400).json({ message: 'ID de tarjeta inválido' });

    const scoreCard = await ScoreCard.findById(scoreCardId);
    if (!scoreCard) return res.status(404).json({ message: 'Tarjeta no encontrada' });

    if (scoreCard.judge_id !== req.user.id) {
      return res.status(403).json({ message: 'No puedes finalizar una tarjeta que no te pertenece' });
    }

    if (scoreCard.status !== 'draft') {
      return res.status(400).json({ message: 'La tarjeta ya fue enviada y no puede modificarse.' });
    }

    const fight = await Fight.getById(scoreCard.fight_id);
    if (!fight || !isFightScoreable(fight)) {
      return res.status(400).json({ message: 'La pelea ya no está activa.' });
    }

    const roundCount = await ScoreCard.getRoundCount(scoreCardId);
    const requiredRounds = getEffectiveTotalRounds(fight);
    if (roundCount < requiredRounds) {
      return res.status(400).json({ message: `Debe completar los ${requiredRounds} rounds antes de enviar la tarjeta.` });
    }

    const finalized = await ScoreCard.finalize(scoreCardId);
    if (!finalized) {
      return res.status(400).json({ message: 'No se pudo finalizar la tarjeta.' });
    }

    res.json({ scorecard: finalized, message: 'Tarjeta enviada correctamente.' });
  } catch (err) {
    next(err);
  }
};
