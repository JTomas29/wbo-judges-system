const OfficialCard = require('../models/OfficialCard');
const Fight = require('../models/Fight');

const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

const getRequiredRounds = (fight) => {
  if (EARLY_RESULT_TYPES.includes(fight.result_type) && fight.result_round) {
    return Number(fight.result_round);
  }
  return Number(fight.total_rounds);
};

exports.get = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (req.user.role === 'judge' && fight.status !== 'analyzed') {
      return res.status(403).json({ message: 'La tarjeta oficial aún no está disponible para jueces.' });
    }

    const card = await OfficialCard.findByFight(fightId);
    res.json(card);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const { rounds } = req.body;

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    if (fight.status !== 'completed') {
      return res.status(400).json({ message: 'La pelea debe finalizar antes de cargar la tarjeta oficial.' });
    }

    const existing = await OfficialCard.findByFight(fightId);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una tarjeta oficial para esta pelea.' });
    }

    if (!rounds || !Array.isArray(rounds)) {
      return res.status(400).json({ message: 'Debe proporcionar un array de rounds.' });
    }

    const totalRounds = getRequiredRounds(fight);
    if (rounds.length !== totalRounds) {
      return res.status(400).json({ message: `Debe proporcionar exactamente ${totalRounds} rounds.` });
    }

    const seen = new Set();
    for (const r of rounds) {
      const rn = Number(r.round_number);
      if (!Number.isInteger(rn) || rn < 1 || rn > totalRounds) {
        return res.status(400).json({ message: `Número de round inválido: ${r.round_number}` });
      }
      if (seen.has(rn)) {
        return res.status(400).json({ message: `Round ${rn} duplicado.` });
      }
      seen.add(rn);

      const sRed = Number(r.score_red);
      const sBlue = Number(r.score_blue);
      if (sRed < 1 || sRed > 10 || !Number.isInteger(sRed)) {
        return res.status(400).json({ message: `score_red del round ${r.round_number} debe ser un entero entre 1 y 10.` });
      }
      if (sBlue < 1 || sBlue > 10 || !Number.isInteger(sBlue)) {
        return res.status(400).json({ message: `score_blue del round ${r.round_number} debe ser un entero entre 1 y 10.` });
      }

      const dRed = r.deduction_red === undefined || r.deduction_red === null || r.deduction_red === '' ? 0 : Number(r.deduction_red);
      const dBlue = r.deduction_blue === undefined || r.deduction_blue === null || r.deduction_blue === '' ? 0 : Number(r.deduction_blue);
      if (!Number.isInteger(dRed) || dRed < 0 || dRed > 2) {
        return res.status(400).json({ message: `deduction_red del round ${r.round_number} debe ser 0, 1 o 2.` });
      }
      if (!Number.isInteger(dBlue) || dBlue < 0 || dBlue > 2) {
        return res.status(400).json({ message: `deduction_blue del round ${r.round_number} debe ser 0, 1 o 2.` });
      }
      if (sRed - dRed < 1) {
        return res.status(400).json({ message: `El descuento rojo del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` });
      }
      if (sBlue - dBlue < 1) {
        return res.status(400).json({ message: `El descuento azul del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` });
      }

      r.deduction_red = dRed;
      r.deduction_blue = dBlue;
    }

    const card = await OfficialCard.create(fightId, rounds, req.user.id);

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};
