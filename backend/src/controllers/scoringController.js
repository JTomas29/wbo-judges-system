// ─── scoringController.js — Tarjeta de puntuación del juez (asalto a asalto) ───
// Responsabilidad: manejar la tarjeta de puntuación de un juez: crearla u
// obtenerla, guardar cada asalto, listar tarjetas de una pelea y finalizar el
// envío. Cada round se valida contra el sistema de boxeo 10-point-must (ver
// `utils/scoringRules`); el descuento NO altera el puntaje del round y sólo se
// descuenta del total acumulado de la tarjeta.

const ScoreCard = require('../models/ScoreCard');
const RoundScore = require('../models/RoundScore');
const Fight = require('../models/Fight');
const JudgeAssignment = require('../models/JudgeAssignment');
const { toDeduction, validateRoundScore } = require('../utils/scoringRules');

// Tipos de resultado que cortan la pelea de forma anticipada.
const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// Verdadero si la pelea terminó por KO/TKO/RTD/DQ/NC.
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

// POST /api/scorecards/:id — Crea (o devuelve) la tarjeta del juez autenticado.
// Espera: req.params.id = pelea; req.user.id = juez (JWT).
// Devuelve: 200 con { score_card, round_scores }.
// Errores: 400 (id inválido/pelea no puntuable), 403 (no juez/sin
// asignación/juez oficial), 404 (pelea no encontrada).
exports.createOrGetScorecard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const judgeId = req.user.id;

    // Sólo los jueces cargan puntuaciones mediante la app.
    if (req.user.role !== 'judge') {
      return res.status(403).json({ message: 'Solo los jueces pueden crear tarjetas de puntuación' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });
    if (!isFightScoreable(fight)) {
      return res.status(400).json({ message: 'La pelea no está en estado activo' });
    }

    // El juez debe tener una asignación previa para poder puntuar.
    const assignment = await JudgeAssignment.findOne(fightId, judgeId);
    if (!assignment) {
      return res.status(403).json({ message: 'No tienes una asignación para esta pelea' });
    }

    // Los jueces oficiales puntúan en papel; su tarjeta la carga el
    // supervisor, por lo que no generan tarjeta en la app.
    if (assignment.assignment_type === 'official') {
      return res.status(403).json({ message: 'Los jueces oficiales puntúan en papel; su tarjeta es cargada por el Supervisor' });
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

// GET /api/scorecards/my/:id — Devuelve la tarjeta del juez autenticado para
// una pelea (sin crearla si no existe).
// Espera: req.params.id = pelea.
// Devuelve: 200 con { score_card, round_scores } (tarjeta null si no existe).
// Errores: 400 (id inválido).
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

// POST /api/scorecards/:id/rounds — Guarda la puntuación de un asalto.
// Espera: req.params.id = tarjeta; req.body = { round_number, score_red,
// score_blue, deduction_red, deduction_blue, notes }.
// Devuelve: 200 con el asalto guardado (upsert).
// Errores: 400 (validaciones de tarjeta/asalto/descuentos), 403 (tarjeta
// ajena), 404 (tarjeta/pelea no encontrada).
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

    // Cada juez sólo modifica su propia tarjeta.
    if (scoreCard.judge_id !== req.user.id) {
      return res.status(403).json({ message: 'No puedes modificar una tarjeta que no te pertenece' });
    }

    // Una vez finalizada, la tarjeta queda congelada.
    if (scoreCard.status !== 'draft') {
      return res.status(400).json({ message: 'La tarjeta ya está finalizada y no se puede modificar' });
    }

    const fightForRound = await Fight.getById(scoreCard.fight_id);
    if (!fightForRound) {
      return res.status(404).json({ message: 'Pelea no encontrada' });
    }

    // Se valida que el asalto no exceda los rounds efectivos (por si la
    // pelea terminó anticipadamente).
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

    // Sistema de boxeo 10-point-must: ambos puntajes enteros entre 6 y 10 y
    // obligatoriamente uno de los dos con 10 puntos. Nunca se acepta un round
    // sin puntaje base válido, sin importar el descuento.
    const scoreCheck = validateRoundScore(sRed, sBlue);
    if (!scoreCheck.valid) {
      return res.status(400).json({ message: scoreCheck.message, code: scoreCheck.code });
    }

    // Descuentos de puntos por round: 0, 1 o 2 puntos por boxeador. El descuento
    // NO modifica el puntaje base del round: se guarda aparte y la base lo
    // descuenta al sumar el total de la tarjeta (último conteo).
    const deductionRed = toDeduction(req.body.deduction_red);
    const deductionBlue = toDeduction(req.body.deduction_blue);

    if (deductionRed === null || deductionBlue === null) {
      return res.status(400).json({ message: 'El descuento debe ser 0, 1 o 2 puntos' });
    }

    // Persistimos (crea o actualiza según exista el asalto). `scoreRed`/`scoreBlue`
    // se guardan tal cual los tipeó el juez: el descuento vive únicamente en
    // deduction_red/deduction_blue y nunca pisa el puntaje del round.
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

// GET /api/scorecards/fight/:id — Lista todas las tarjetas de una pelea.
// Espera: req.params.id = pelea.
// Devuelve: 200 con el array de tarjetas.
// Errores: 400 (id inválido).
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

// PATCH /api/scorecards/:id/finalize — Envía (finaliza) la tarjeta.
// Espera: req.params.id = tarjeta.
// Devuelve: 200 con { scorecard, message }.
// Errores: 400 (tarjeta ya finalizada/incompleta/pelea no activa),
//          403 (tarjeta ajena), 404 (tarjeta no encontrada).
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

    // No se puede enviar si la pelea ya no está en condiciones de puntuarse.
    const fight = await Fight.getById(scoreCard.fight_id);
    if (!fight || !isFightScoreable(fight)) {
      return res.status(400).json({ message: 'La pelea ya no está activa.' });
    }

    // El envío exige haber completado todos los asaltos efectivos.
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
