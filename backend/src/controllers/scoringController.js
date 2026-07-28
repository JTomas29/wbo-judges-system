const ScoreCard = require('../models/ScoreCard');
const RoundScore = require('../models/RoundScore');
const Fight = require('../models/Fight');
const JudgeAssignment = require('../models/JudgeAssignment');

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
    if (fight.status !== 'active') {
      return res.status(400).json({ message: 'La pelea no está en estado activo' });
    }

    const assignment = await JudgeAssignment.findOne(fightId, judgeId);
    if (!assignment) {
      return res.status(403).json({ message: 'No tienes una asignación para esta pelea' });
    }
    if (assignment.status !== 'confirmed') {
      return res.status(403).json({ message: 'Debes confirmar la asignación antes de puntuar' });
    }

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
    const { round_number, score_red, score_blue, referee_score, referee_notes } = req.body;

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

    if (referee_score != null) {
      const refScore = Number(referee_score);
      if (!Number.isInteger(refScore) || refScore < 1 || refScore > 10) {
        return res.status(400).json({ message: 'referee_score debe ser un número entero entre 1 y 10' });
      }
    }

    const round = await RoundScore.upsert({
      scoreCardId: scoreCardId,
      roundNumber: round_number,
      scoreRed: sRed,
      scoreBlue: sBlue,
      refereeScore: referee_score ?? null,
      refereeNotes: referee_notes ?? null,
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
    if (!fight || fight.status !== 'active') {
      return res.status(400).json({ message: 'La pelea ya no está activa.' });
    }

    const roundCount = await ScoreCard.getRoundCount(scoreCardId);
    if (roundCount < fight.total_rounds) {
      return res.status(400).json({ message: 'Debe completar todos los rounds antes de enviar la tarjeta.' });
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
