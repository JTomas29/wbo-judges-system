const OfficialCard = require('../models/OfficialCard');
const Fight = require('../models/Fight');

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

    const totalRounds = Number(fight.total_rounds);
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
    }

    const card = await OfficialCard.create(fightId, rounds, req.user.id);
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};
