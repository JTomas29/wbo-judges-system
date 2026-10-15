// ─── officialJudgeCardController.js — Tarjetas oficiales de jueces ───
// Responsabilidad: gestión de las tarjetas de puntuación de los jueces
// 'official' (los que puntúan en papel). El supervisor las carga en el
// sistema una vez finalizada la pelea. Permite listar, consultar, crear y
// actualizar estas tarjetas.

const OfficialJudgeCard = require('../models/OfficialJudgeCard');
const Fight = require('../models/Fight');
const User = require('../models/User');
const JudgeAssignment = require('../models/JudgeAssignment');

// Tipos de resultado que terminan la pelea antes de completar los asaltos.
const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// Rounds efectivos a puntuar según el resultado de la pelea.
const getRequiredRounds = (fight) => {
  if (EARLY_RESULT_TYPES.includes(fight.result_type) && fight.result_round) {
    return Number(fight.result_round);
  }
  return Number(fight.total_rounds);
};

// Valida y normaliza el array de rounds. Devuelve { error } o { rounds }.
const validateRounds = (rounds, totalRounds) => {
  if (!rounds || !Array.isArray(rounds)) {
    return { error: 'Debe proporcionar un array de rounds.' };
  }

  // La cantidad de asaltos debe coincidir con los rounds efectivos.
  if (rounds.length !== totalRounds) {
    return { error: `Debe proporcionar exactamente ${totalRounds} rounds.` };
  }

  // Validación por asalto: número válido, sin duplicados.
  const seen = new Set();
  for (const r of rounds) {
    const rn = Number(r.round_number);
    if (!Number.isInteger(rn) || rn < 1 || rn > totalRounds) {
      return { error: `Número de round inválido: ${r.round_number}` };
    }
    if (seen.has(rn)) {
      return { error: `Round ${rn} duplicado.` };
    }
    seen.add(rn);

    // Puntajes enteros entre 1 y 10 (sistema 10-point-must).
    const sRed = Number(r.score_red);
    const sBlue = Number(r.score_blue);
    if (sRed < 1 || sRed > 10 || !Number.isInteger(sRed)) {
      return { error: `score_red del round ${r.round_number} debe ser un entero entre 1 y 10.` };
    }
    if (sBlue < 1 || sBlue > 10 || !Number.isInteger(sBlue)) {
      return { error: `score_blue del round ${r.round_number} debe ser un entero entre 1 y 10.` };
    }

    // Descuentos opcionales de 0 a 2 puntos por boxeador.
    const dRed = r.point_deduction_red === undefined || r.point_deduction_red === null || r.point_deduction_red === '' ? 0 : Number(r.point_deduction_red);
    const dBlue = r.point_deduction_blue === undefined || r.point_deduction_blue === null || r.point_deduction_blue === '' ? 0 : Number(r.point_deduction_blue);
    if (!Number.isInteger(dRed) || dRed < 0 || dRed > 2) {
      return { error: `point_deduction_red del round ${r.round_number} debe ser 0, 1 o 2.` };
    }
    if (!Number.isInteger(dBlue) || dBlue < 0 || dBlue > 2) {
      return { error: `point_deduction_blue del round ${r.round_number} debe ser 0, 1 o 2.` };
    }
    // El mínimo después del descuento es 1 punto.
    if (sRed - dRed < 1) {
      return { error: `El descuento rojo del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` };
    }
    if (sBlue - dBlue < 1) {
      return { error: `El descuento azul del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` };
    }

    // Normalizamos el descuento a 0 exacto antes de persistir.
    r.point_deduction_red = dRed;
    r.point_deduction_blue = dBlue;
  }

  return { rounds };
};

// GET /api/fights/:id/official-judge-cards
// Lista las tarjetas oficiales de todos los jueces de una pelea.
// Espera: req.params.id = pelea.
// Devuelve: 200 con el array de tarjetas.
// Errores: 400 (id inválido), 404 (pelea no encontrada).
exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    const cards = await OfficialJudgeCard.findByFight(fightId);
    res.json(cards);
  } catch (err) {
    next(err);
  }
};

// GET /api/official-judge-cards/:cardId
// Devuelve una tarjeta oficial de juez puntual.
// Espera: req.params.cardId.
// Devuelve: 200 con la tarjeta.
// Errores: 400 (id inválido), 404 (tarjeta no encontrada).
exports.get = async (req, res, next) => {
  try {
    const cardId = parseInt(req.params.cardId, 10);
    if (!Number.isInteger(cardId) || cardId < 1) return res.status(400).json({ message: 'ID de tarjeta inválido' });

    const card = await OfficialJudgeCard.findById(cardId);
    if (!card) return res.status(404).json({ message: 'Tarjeta no encontrada' });

    res.json(card);
  } catch (err) {
    next(err);
  }
};

// POST /api/fights/:id/official-judge-cards
// Crea la tarjeta oficial de un juez para la pelea.
// Espera: req.params.id = pelea; req.body = { judge_id, rounds }.
// Devuelve: 201 con la tarjeta creada.
// Errores: 400 (validaciones), 404 (pelea/juez no encontrados),
//          409 (el juez ya tiene tarjeta en esta pelea).
exports.create = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });

    const { judge_id, rounds } = req.body;

    if (!judge_id) {
      return res.status(400).json({ message: 'Debe indicar el judge_id del juez oficial.' });
    }
    const judgeNum = parseInt(judge_id, 10);
    if (!Number.isInteger(judgeNum) || judgeNum < 1) {
      return res.status(400).json({ message: 'judge_id inválido' });
    }

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // Las tarjetas en papel se pueden cargar con la pelea en curso o finalizada;
    // no se exige que los demás jueces hayan enviado su tarjeta.
    if (!['active', 'completed', 'analyzed'].includes(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar en curso o finalizada antes de cargar las tarjetas de los jueces oficiales.' });
    }

    const judge = await User.findById(judgeNum);
    if (!judge || judge.role !== 'judge') {
      return res.status(400).json({ message: 'El juez indicado no existe o no tiene role judge.' });
    }

    // El juez debe estar designado como 'official' para esta pelea.
    const assignment = await JudgeAssignment.findOne(fightId, judgeNum);
    if (!assignment || assignment.assignment_type !== 'official') {
      return res.status(400).json({ message: 'El juez debe estar designado como oficial para esta pelea.' });
    }

    // Un juez sólo puede tener una tarjeta por pelea.
    const existing = await OfficialJudgeCard.findByFightAndJudge(fightId, judgeNum);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una tarjeta para este juez oficial en esta pelea.' });
    }

    const totalRounds = getRequiredRounds(fight);
    const validation = validateRounds(rounds, totalRounds);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const card = await OfficialJudgeCard.create(fightId, judgeNum, validation.rounds, req.user.id);
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};

// PUT /api/official-judge-cards/:cardId
// Reemplaza los asaltos de una tarjeta oficial de juez (corrección).
// Espera: req.params.cardId; req.body = { rounds }.
// Devuelve: 200 con la tarjeta actualizada.
// Errores: 400 (validaciones/estado de pelea), 404 (tarjeta/pelea no
// encontradas).
exports.update = async (req, res, next) => {
  try {
    const cardId = parseInt(req.params.cardId, 10);
    if (!Number.isInteger(cardId) || cardId < 1) return res.status(400).json({ message: 'ID de tarjeta inválido' });

    const { rounds } = req.body;

    const existing = await OfficialJudgeCard.findById(cardId);
    if (!existing) return res.status(404).json({ message: 'Tarjeta no encontrada' });

    const fight = await Fight.getById(existing.fight_id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // Se puede corregir mientras la pelea esté en curso, finalizada o analizada.
    if (!['active', 'completed', 'analyzed'].includes(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar en curso o finalizada antes de modificar las tarjetas de los jueces oficiales.' });
    }

    const totalRounds = getRequiredRounds(fight);
    const validation = validateRounds(rounds, totalRounds);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const card = await OfficialJudgeCard.update(cardId, validation.rounds);
    res.json(card);
  } catch (err) {
    next(err);
  }
};
