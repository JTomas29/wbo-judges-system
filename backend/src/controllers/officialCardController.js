// ─── officialCardController.js — Tarjeta oficial de la pelea ───
// Responsabilidad: cargar y consultar la tarjeta oficial de puntuación de
// una pelea (la que define el resultado por asalto). Sólo puede existir una
// por pelea y se crea luego de que ésta finaliza.

const OfficialCard = require('../models/OfficialCard');
const Fight = require('../models/Fight');

// Tipos de resultado que cortan la pelea antes de completar los asaltos
// previstos: en esos casos la tarjeta se mide hasta el round de finalización.
const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// Calcula cuántos asaltos debe cubrir la tarjeta oficial: si la pelea
// terminó anticipadamente, sólo hasta dicho round; si no, los rounds totales.
const getRequiredRounds = (fight) => {
  if (EARLY_RESULT_TYPES.includes(fight.result_type) && fight.result_round) {
    return Number(fight.result_round);
  }
  return Number(fight.total_rounds);
};

// GET /api/fights/:id/official-card
// Devuelve la tarjeta oficial de una pelea (o null si aún no existe).
// Espera: req.params.id = pelea.
// Devuelve: 200 con la tarjeta (o null).
// Errores: 400 (id inválido), 403 (juez sin estar analizada la pelea),
//          404 (pelea no encontrada).
exports.get = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // Los jueces sólo pueden ver la tarjeta oficial una vez que el análisis
    // fue liberado ('analyzed'); antes se considera información reservada.
    if (req.user.role === 'judge' && fight.status !== 'analyzed') {
      return res.status(403).json({ message: 'La tarjeta oficial aún no está disponible para jueces.' });
    }

    const card = await OfficialCard.findByFight(fightId);
    res.json(card);
  } catch (err) {
    next(err);
  }
};

// POST /api/fights/:id/official-card
// Crea la tarjeta oficial de la pelea (una única por pelea).
// Espera: req.params.id = pelea; req.body = { rounds: [...] }.
// Devuelve: 201 con la tarjeta creada.
// Errores: 400 (validaciones de rounds/estado), 404 (pelea no encontrada),
//          409 (ya existe tarjeta oficial).
exports.create = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fightId = parseInt(id, 10);
    if (!Number.isInteger(fightId) || fightId < 1) return res.status(400).json({ message: 'ID de pelea inválido' });
    const { rounds } = req.body;

    const fight = await Fight.getById(fightId);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // La tarjeta oficial se puede cargar con la pelea en curso o finalizada;
    // no se exige que los demás jueces hayan enviado su tarjeta.
    if (!['active', 'completed', 'analyzed'].includes(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar en curso o finalizada antes de cargar la tarjeta oficial.' });
    }

    // Integridad: sólo una tarjeta oficial por pelea.
    const existing = await OfficialCard.findByFight(fightId);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una tarjeta oficial para esta pelea.' });
    }

    if (!rounds || !Array.isArray(rounds)) {
      return res.status(400).json({ message: 'Debe proporcionar un array de rounds.' });
    }

    // La cantidad de asaltos debe coincidir con los rounds efectivos de la
    // pelea (totales o hasta el round de finalización).
    const totalRounds = getRequiredRounds(fight);
    if (rounds.length !== totalRounds) {
      return res.status(400).json({ message: `Debe proporcionar exactamente ${totalRounds} rounds.` });
    }

    // Validación asalto por asalto de la tarjeta oficial.
    const seen = new Set();
    for (const r of rounds) {
      // El número de round debe ser válido y no repetirse.
      const rn = Number(r.round_number);
      if (!Number.isInteger(rn) || rn < 1 || rn > totalRounds) {
        return res.status(400).json({ message: `Número de round inválido: ${r.round_number}` });
      }
      if (seen.has(rn)) {
        return res.status(400).json({ message: `Round ${rn} duplicado.` });
      }
      seen.add(rn);

      // Puntajes 10-point-must: enteros entre 1 y 10.
      const sRed = Number(r.score_red);
      const sBlue = Number(r.score_blue);
      if (sRed < 1 || sRed > 10 || !Number.isInteger(sRed)) {
        return res.status(400).json({ message: `score_red del round ${r.round_number} debe ser un entero entre 1 y 10.` });
      }
      if (sBlue < 1 || sBlue > 10 || !Number.isInteger(sBlue)) {
        return res.status(400).json({ message: `score_blue del round ${r.round_number} debe ser un entero entre 1 y 10.` });
      }

      // Descuentos opcionales (0, 1 o 2 puntos); los vacíos se interpretan como 0.
      const dRed = r.deduction_red === undefined || r.deduction_red === null || r.deduction_red === '' ? 0 : Number(r.deduction_red);
      const dBlue = r.deduction_blue === undefined || r.deduction_blue === null || r.deduction_blue === '' ? 0 : Number(r.deduction_blue);
      if (!Number.isInteger(dRed) || dRed < 0 || dRed > 2) {
        return res.status(400).json({ message: `deduction_red del round ${r.round_number} debe ser 0, 1 o 2.` });
      }
      if (!Number.isInteger(dBlue) || dBlue < 0 || dBlue > 2) {
        return res.status(400).json({ message: `deduction_blue del round ${r.round_number} debe ser 0, 1 o 2.` });
      }
      // El descuento no puede dejar un puntaje menor a 1.
      if (sRed - dRed < 1) {
        return res.status(400).json({ message: `El descuento rojo del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` });
      }
      if (sBlue - dBlue < 1) {
        return res.status(400).json({ message: `El descuento azul del round ${r.round_number} no puede dejar el puntaje por debajo de 1.` });
      }

      // Normalizamos el valor antes de persistir para que use 0 exacto.
      r.deduction_red = dRed;
      r.deduction_blue = dBlue;
    }

    // Persistimos la tarjeta junto con el usuario que la cargó.
    const card = await OfficialCard.create(fightId, rounds, req.user.id);

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};
