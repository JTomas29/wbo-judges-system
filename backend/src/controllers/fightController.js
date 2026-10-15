// ─── fightController.js — Gestión de peleas ───
// Responsabilidad: núcleo del ciclo de vida de una pelea: alta, edición,
// activación, finalización, resultado oficial, análisis de tarjetas,
// archivado e historial, además de la consulta detallada por id. Es el
// controlador que más reglas de negocio concentra del sistema.

const Fight = require('../models/Fight');
const Referee = require('../models/Referee');
const OfficialCard = require('../models/OfficialCard');
const OfficialJudgeCard = require('../models/OfficialJudgeCard');
const JudgeAssignment = require('../models/JudgeAssignment');
const Notification = require('../models/Notification');

// Todos los tipos de resultado válidos de una pelea.
const RESULT_TYPES = ['decision', 'ko', 'tko', 'rtd', 'dq', 'nc'];
// Subtipo: resultados que terminan la pelea antes de los rounds previstos.
const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// GET /api/fights — Lista todas las peleas.
// Devuelve: 200 con el array de peleas.
// Errores: sólo del servidor.
exports.getAll = async (req, res, next) => {
  try {
    const fights = await Fight.getAll();
    res.json(fights);
  } catch (err) {
    next(err);
  }
};

// Valida que un id sea entero positivo; devuelve mensaje de error o null.
const validateFightId = (id) => {
  const num = parseInt(id, 10);
  if (!Number.isInteger(num) || num < 1) return 'ID de pelea inválido';
  return null;
};

// GET /api/fights/:id — Detalle completo de una pelea.
// Espera: req.params.id.
// Devuelve: 200 con la pelea y sus datos asociados (jueces asignados,
// tarjeta oficial, tarjetas oficiales de jueces y resumen de análisis).
// Errores: 400 (id inválido), 404 (no encontrada).
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // Se resuelven en paralelo los datos complementarios de la pelea para
    // armar una única respuesta.
    const [assignedJudges, officialCard, analysisSummary, officialJudgeCards] = await Promise.all([
      Fight.getAssignedJudges(id),
      Fight.getOfficialCard(id),
      Fight.getAnalysisSummary(id),
      OfficialJudgeCard.findByFight(id),
    ]);

    // Un juez sólo ve sus propias asignaciones, no las de sus colegas.
    const filteredJudges = req.user.role === 'judge'
      ? assignedJudges.filter((j) => j.id === req.user.id)
      : assignedJudges;

    res.json({
      ...fight,
      assigned_judges: filteredJudges,
      official_card: officialCard || null,
      official_judge_cards: officialJudgeCards,
      analysis_summary: analysisSummary,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/fights — Crea una pelea.
// Espera: req.body = { event_name, boxer_red, boxer_blue, scheduled_date,
// total_rounds, weight_class, venue, title, referee_id, broadcaster, notes }.
// Devuelve: 201 con la pelea creada.
// Errores: 400 (validaciones de campos, fecha, rounds o árbitro).
exports.create = async (req, res, next) => {
  try {
    const { event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes } = req.body;

    // Los datos centrales de la pelea son obligatorios.
    if (!event_name || !boxer_red || !boxer_blue || !scheduled_date || !total_rounds || !weight_class) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class' });
    }

    // Evita un enfrentamiento inválido: los dos boxeadores no pueden ser el
    // mismo (comparación case-insensitive para evitar engaños con mayúsculas).
    if (boxer_red.trim().toLowerCase() === boxer_blue.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Los nombres de los boxeadores no pueden ser iguales' });
    }

    // La fecha debe ser una fecha real y no puede ser pasada (hoy o futura).
    const fightDate = new Date(scheduled_date);
    if (isNaN(fightDate.getTime())) {
      return res.status(400).json({ message: 'La fecha proporcionada no es válida' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fightDate < today) {
      return res.status(400).json({ message: 'La fecha debe ser hoy o posterior' });
    }

    // Rounds permitidos por reglamento (cantidades pares típicas del boxeo).
    const validRounds = [4, 6, 8, 10, 12];
    const rounds = Number(total_rounds);
    if (!Number.isInteger(rounds) || !validRounds.includes(rounds)) {
      return res.status(400).json({ message: 'total_rounds debe ser 4, 6, 8, 10 o 12' });
    }

    // Si se indica árbitro, debe existir y estar activo para poder asignarlo.
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

    // Se crea la pelea con el supervisor autenticado como responsable.
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

    // Re-leemos la pelea para devolver el registro completo con defaults.
    const created = await Fight.getById(fightId);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// PUT /api/fights/:id — Actualiza una pelea.
// Espera: req.params.id; mismo cuerpo que create.
// Devuelve: 200 con la pelea actualizada.
// Errores: 400 (estado no editable/validaciones), 404 (no encontrada).
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const { event_name, boxer_red, boxer_blue, scheduled_date, total_rounds, weight_class, venue, title, referee_id, broadcaster, notes } = req.body;

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // Una vez que la pelea sale de 'pending'/'active' ya no puede editarse:
    // las tarjetas y el análisis dependen de datos inmutables.
    const nonEditable = ['completed', 'analyzed', 'cancelled', 'archived'];
    if (nonEditable.includes(fight.status)) {
      return res.status(400).json({ message: `No se puede editar una pelea en estado ${fight.status}` });
    }

    // Las mismas validaciones que en create (campos, boxeadores, fecha,
    // rounds y árbitro).
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

    // Se devuelve el registro actualizado completo.
    const updated = await Fight.getById(id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// POST /api/fights/:id/activate — Activa una pelea 'pending'.
// Espera: req.params.id.
// Devuelve: 200 con { message, fight } (incluye jueces asignados).
// Errores: 400 (estado no pending o menos de 3 jueces), 404 (no encontrada),
//          409 (no se pudo activar).
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

    // Regla de negocio: hacen falta al menos 3 jueces designados para poder
    // arrancar la pelea.
    const assignedCount = await JudgeAssignment.getCount(id);
    if (assignedCount < 3) {
      return res.status(400).json({ message: 'Se necesitan al menos 3 jueces designados para activar la pelea' });
    }

    const updated = await Fight.activate(id);
    if (!updated) {
      return res.status(409).json({ message: 'No se pudo activar la pelea' });
    }

    // Avisamos a los jueces de evaluación (no oficiales) que la pelea está
    // en marcha y pueden cargar sus tarjetas. Los oficiales puntúan en papel.
    const assignments = await JudgeAssignment.getByFight(id);
    await Promise.all(
      assignments
        .filter((a) => a.assignment_type !== 'official')
        .map((a) =>
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

// POST /api/fights/:id/complete — Finaliza una pelea activa.
// Espera: req.params.id.
// Devuelve: 200 con { message, fight }.
// Errores: 400 (no activa o faltan tarjetas finalizadas), 404 (no encontrada).
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

    // El supervisor cierra la pelea para cargar las tarjetas oficiales y la de
    // referencia en el momento que quiera; no se exige que todos los jueces de
    // evaluación hayan enviado su tarjeta.
    const updated = await Fight.complete(Number(id));

    res.json({ message: 'Pelea finalizada correctamente.', fight: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/fights/:id/result — Registra el resultado oficial de la pelea.
// Espera: req.params.id; req.body = { result_type, winner, round, time }.
// Devuelve: 200 con { message, fight }.
// Errores: 400 (validaciones), 403 (no supervisor),
//          404 (pelea no encontrada), 409 (resultado ya registrado).
exports.registerResult = async (req, res, next) => {
  try {
    // Sólo el supervisor registra el resultado oficial.
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ message: 'Solo el Supervisor puede registrar el resultado oficial de la pelea.' });
    }

    const { id } = req.params;
    const errMsg = validateFightId(id);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const { result_type, winner, round, time } = req.body;
    // El tipo se normaliza (minúsculas y sin espacios) para admitir variantes.
    const type = String(result_type || '').trim().toLowerCase();
    if (!RESULT_TYPES.includes(type)) {
      return res.status(400).json({ message: `result_type debe ser uno de: ${RESULT_TYPES.join(', ')}` });
    }

    const fight = await Fight.getById(id);
    if (!fight) return res.status(404).json({ message: 'Pelea no encontrada' });

    // No se puede registrar resultado sobre pelea archivada/cancelada, ni
    // registrar dos veces el mismo resultado.
    if (fight.status === 'archived' || fight.status === 'cancelled') {
      return res.status(400).json({ message: 'No se puede registrar el resultado de una pelea archivada o cancelada.' });
    }
    if (fight.result_type) {
      return res.status(409).json({ message: 'Esta pelea ya tiene un resultado oficial registrado.' });
    }

    // En un NC (no contest) no existe ganador; en el resto, el ganador debe
    // ser exactamente uno de los boxeadores de la pelea.
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

    // Para resultados anticipados se exige el round (1..total) y el tiempo en
    // formato m:ss (ej. 2:35).
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

// Determina el ganador de un round comparando los puntajes; 'red' | 'blue' |
// 'draw' (empate).
const computeWinner = (scoreRed, scoreBlue) => {
  if (scoreRed > scoreBlue) return 'red';
  if (scoreBlue > scoreRed) return 'blue';
  return 'draw';
};

// Categorías de coincidencia de una comparación juez vs tarjeta oficial.
const CATEGORY = {
  EXACT: 'exact',
  SAME_WINNER: 'same_winner',
  DIFFERENT: 'different',
};

// Clasifica UNA comparación en una sola categoría, con EXACT como categoría
// prioritaria:
//
//   1. ¿Los puntajes finales coinciden en ambos corners? -> 'exact'
//   2. ¿No coinciden pero el juez identificó al mismo ganador? -> 'same_winner'
//   3. En cualquier otro caso                           -> 'different'
//
// Una tarjeta EXACT es por definición del mismo ganador que la oficial, pero no
// debe contabilizarse dos veces: cuenta como EXACT y nunca como SAME (WINNER).
// Por eso SAME (WINNER) excluye explícitamente los rounds EXACT: se evalúa
// primero la coincidencia exacta y sólo si falla se mira el ganador.
//
// Ojo: esto NO modifica las métricas independientes exact_match_pct y
// winner_match_pct. winner_match_pct sigue siendo "coincidencia de ganador" y
// por definición incluye a los rounds EXACT (un EXACT siempre coincidió en el
// ganador). Sólo el conteo por categorías es exclusivo.
const classifyComparison = (matchExact, matchWinner) => {
  if (matchExact) return CATEGORY.EXACT;
  if (matchWinner) return CATEGORY.SAME_WINNER;
  return CATEGORY.DIFFERENT;
};

// GET /api/fights/:id/analysis — Análisis de la pelea (jueces vs oficial).
// Espera: req.params.id; requiere pelea en estado 'analyzed'.
// Devuelve: 200 con la comparativa detallada y resúmenes por round y juez.
// Errores: 400 (no analizada), 403 (juez sin análisis propio), 404 (pelea
// no encontrada).
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

    // Datos fuente del análisis: tarjeta oficial, resumen agregado por juez,
    // detalle de rounds por juez y rounds ignorados (los posteriores al de
    // finalización anticipada).
    const officialCard = await OfficialCard.findByFight(Number(id));
    const analysisResults = await Fight.getAnalysisSummary(Number(id));
    const roundDetail = await Fight.getRoundDetail(Number(id));
    const ignoredRounds = await Fight.countRoundsBeyondFinish(Number(id));

    // Rounds efectivos a considerar: hasta el de finalización si hubo
    // resultado anticipado, si no los rounds totales.
    const effectiveRounds = fight.result_round ? fight.result_round : fight.total_rounds;

    // Se proyecta la tarjeta oficial sólo hasta los rounds efectivos,
    // calculando el ganador de cada round con los puntajes finales.
    const officialRounds = (officialCard?.rounds || [])
      .filter((r) => r.round_number <= effectiveRounds)
      .map((r) => ({
        round_number: r.round_number,
        score_red: r.final_score_red,
        score_blue: r.final_score_blue,
        winner: computeWinner(r.final_score_red, r.final_score_blue),
      }));

    // Por cada juez analizado se arma su detalle de rounds comparado contra
    // la tarjeta oficial, con dos métricas: match_exact (mismos puntajes) y
    // match_winner (mismo ganador aunque difieran los puntajes).
    //
    // Además cada comparación queda clasificada en UNA categoría exclusiva
    // ('exact' | 'same_winner' | 'different'), de forma que los conteos por
    // categoría nunca se solapen entre sí.
    const judges = analysisResults.map((ar) => {
      const judgeRounds = roundDetail
        .filter((r) => r.judge_id === ar.judge_id)
        .map((r) => {
          const matchExact = r.judge_score_red === r.official_score_red && r.judge_score_blue === r.official_score_blue;
          const officialWinner = computeWinner(r.official_score_red, r.official_score_blue);
          const judgeWinner = computeWinner(r.judge_score_red, r.judge_score_blue);
          const matchWinner = officialWinner === judgeWinner;
          return {
            round_number: r.round_number,
            score_red: r.judge_score_red,
            score_blue: r.judge_score_blue,
            winner: judgeWinner,
            match_exact: matchExact,
            match_winner: matchWinner,
            // Categoría exclusiva: EXACT tiene prioridad sobre SAME (WINNER).
            category: classifyComparison(matchExact, matchWinner),
          };
        });

      // Acumulados del juez: aciertos/errores exactos y de ganador,
      // totales de puntos y porcentajes de acierto.
      //
      // Las dos métricas (exact y winner) son independientes: winner incluye a
      // los rounds exact, porque un EXACT siempre coincidió en el ganador. Los
      // contadores por categoría son excluyentes y siempre suman el total de
      // rounds del juez.
      const exactMatches = judgeRounds.filter((r) => r.category === CATEGORY.EXACT).length;
      const exactErrors = judgeRounds.filter((r) => r.category !== CATEGORY.EXACT).length;
      const sameWinnerMatches = judgeRounds.filter((r) => r.category === CATEGORY.SAME_WINNER).length;
      const differentMatches = judgeRounds.filter((r) => r.category === CATEGORY.DIFFERENT).length;
      const winnerMatches = judgeRounds.filter((r) => r.match_winner).length;
      const winnerErrors = judgeRounds.filter((r) => !r.match_winner).length;

      return {
        id: ar.judge_id,
        name: ar.judge_name,
        rounds: judgeRounds,
        total_score_red: judgeRounds.reduce((sum, r) => sum + r.score_red, 0),
        total_score_blue: judgeRounds.reduce((sum, r) => sum + r.score_blue, 0),
        rounds_total: judgeRounds.length,
        exact_matches: exactMatches,
        exact_errors: exactErrors,
        // Desglose exclusivo por categoría: suman rounds_total.
        same_winner_matches: sameWinnerMatches,
        different_matches: differentMatches,
        exact_match_pct: judgeRounds.length > 0 ? Math.round((exactMatches / judgeRounds.length) * 100) : 0,
        winner_matches: winnerMatches,
        winner_errors: winnerErrors,
        winner_match_pct: judgeRounds.length > 0 ? Math.round((winnerMatches / judgeRounds.length) * 100) : 0,
      };
    });

    // Resumen global de comparaciones: conteo EXCLUSIVO por categoría. Las tres
    // categorías son disjuntas, así que siempre suman el total de comparaciones.
    const totalRounds = officialRounds.length;
    let roundsOk = 0;
    let roundsError = 0;
    let sameWinnerTotal = 0;
    let differentTotal = 0;
    judges.forEach((j) => {
      roundsOk += j.exact_matches;
      roundsError += j.same_winner_matches + j.different_matches;
      sameWinnerTotal += j.same_winner_matches;
      differentTotal += j.different_matches;
    });

    // Total de comparaciones hechas (jueces x rounds efectivos).
    const comparisonsTotal = roundsOk + roundsError;

    // Inconsistencia GENERAL de la pelea: suma de los errores de todos los
    // jueces contra la tarjeta oficial de referencia.
    //
    // Incluye jueces de evaluación (score_cards) y jueces oficiales
    // (official_judge_cards), y sólo los rounds efectivos.
    //
    // Se deriva del desglose por categoría ya calculado arriba
    // (sameWinnerTotal + differentTotal) y NO de `SUM(analysis_results.errors)`
    // a propósito: `analysis_results` es un snapshot persistido al analizar la
    // pelea, así que puede quedar desactualizado si después se borran o editan
    // tarjetas (hay peleas históricas con filas huérfanas y cero comparaciones).
    // Tomar el snapshot haría que este número contradiga a los contadores de
    // EXACT / SAME / DIFFERENT que se muestran justo al lado. `errors` por juez
    // sigue disponible en `analysis_results` para consultas SQL.
    const generalInconsistency = sameWinnerTotal + differentTotal;

    // Resumen de "peleas": un juez cuenta como acierto si no tuvo ningún
    // error exacto a lo largo de toda la pelea.
    const fightsOk = judges.filter((j) => j.exact_errors === 0).length;
    const fightsError = judges.filter((j) => j.exact_errors > 0).length;

    // Resumen por round: para cada round oficial, cuántos jueces acertaron
    // exacto / ganador y cuántos erraron.
    const perRoundSummary = officialRounds.map((or) => {
      let ok = 0, errors = 0, winnerOk = 0, winnerErrors = 0;
      let sameWinner = 0, different = 0;
      judges.forEach((j) => {
        const jr = j.rounds.find((r) => r.round_number === or.round_number);
        if (jr) {
          // Métricas independientes: 'ok' es coincidencia exacta y 'winner_ok'
          // es coincidencia de ganador (incluye los rounds exactos).
          if (jr.match_exact) ok++; else errors++;
          if (jr.match_winner) winnerOk++; else winnerErrors++;
          // Conteo exclusivo por categoría.
          if (jr.category === CATEGORY.SAME_WINNER) sameWinner++;
          if (jr.category === CATEGORY.DIFFERENT) different++;
        }
      });
      return {
        round_number: or.round_number,
        errors, ok, winner_errors: winnerErrors, winner_ok: winnerOk,
        same_winner: sameWinner, different,
      };
    });

    // Armado de la respuesta con los datos de la pelea, resúmenes, tarjeta
    // oficial y detalle completo por juez.
    const response = {
      fight: {
        id: fight.id,
        event_name: fight.event_name,
        boxer_red: fight.boxer_red,
        boxer_blue: fight.boxer_blue,
        scheduled_date: fight.scheduled_date,
        total_rounds: fight.total_rounds,
        result_type: fight.result_type,
        result_round: fight.result_round,
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
        // Desglose EXCLUSIVO por categoría sobre todas las comparaciones
        // (jueces x rounds efectivos). Las tres categorías son disjuntas y
        // suman `comparisons_total`.
        comparisons_total: comparisonsTotal,
        exact: roundsOk,
        same_winner: sameWinnerTotal,
        different: differentTotal,
        // Inconsistencia general de la pelea = suma de errores de todos los
        // jueces contra la tarjeta oficial (ver arriba).
        general_inconsistency: generalInconsistency,
      },
      official_card: {
        rounds: officialRounds,
        total_score_red: officialCard?.total_score_red || 0,
        total_score_blue: officialCard?.total_score_blue || 0,
      },
      judges,
      per_round_summary: perRoundSummary,
      ignored_rounds: ignoredRounds,
    };

    // Si quien consulta es un juez, se le devuelve ÚNICAMENTE su propio
    // análisis (y con métricas individualizadas), no el de los colegas.
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
          comparisons_total: myAnalysis.rounds_total,
          exact: myAnalysis.exact_matches,
          same_winner: myAnalysis.same_winner_matches,
          different: myAnalysis.different_matches,
          // Para un juez, la inconsistencia general es la de su propio análisis.
          general_inconsistency: Number(myAnalysis.exact_errors || 0),
        },
        judges: [myAnalysis],
        per_round_summary: perRoundSummary.map((pr) => {
          const jr = myAnalysis.rounds.find((r) => r.round_number === pr.round_number);
          return {
            round_number: pr.round_number,
            ok: jr?.category === CATEGORY.EXACT ? 1 : 0,
            errors: jr?.category === CATEGORY.EXACT ? 0 : 1,
            winner_ok: jr?.match_winner ? 1 : 0,
            winner_errors: jr?.match_winner ? 0 : 1,
            same_winner: jr?.category === CATEGORY.SAME_WINNER ? 1 : 0,
            different: jr?.category === CATEGORY.DIFFERENT ? 1 : 0,
          };
        }),
      });
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

// POST /api/fights/:id/analyze — Ejecuta el análisis de la pelea.
// Espera: req.params.id; la pelea debe estar 'completed' con tarjeta oficial
// y todas las tarjetas de evaluación finalizadas.
// Devuelve: 200 con { fight_id, status, judges_analyzed, message }.
// Errores: 400 (estado inválido o pendientes de carga), 404 (no encontrada).
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

    // El análisis sólo requiere que exista la tarjeta oficial; la pelea puede
    // estar en curso o finalizada (no hace falta que esté en 'completed').
    if (!['active', 'completed'].includes(fight.status)) {
      return res.status(400).json({ message: 'La pelea debe estar en curso o finalizada antes de ejecutar el análisis.' });
    }

    // Sin tarjeta oficial no hay punto de referencia para comparar jueces.
    const officialCard = await Fight.getOfficialCard(id);
    if (!officialCard) {
      return res.status(400).json({ message: 'Debe existir una tarjeta oficial para poder analizar la pelea.' });
    }

    // El análisis compara las tarjetas de los jueces que hayan enviado; no se
    // exige que todos los jueces de evaluación hayan finalizado su tarjeta.
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

// POST /api/fights/:id/archive — Archiva una pelea (baja lógica).
// Espera: req.params.id.
// Devuelve: 200 con mensaje de éxito.
// Errores: 404 (no encontrada), 409 (ya archivada).
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

// GET /api/fights/history — Historial de peleas con filtros por query params.
// Espera: req.query = { searchEvent, dateFrom, dateTo, weightClass }.
// Devuelve: 200 con el array de peleas filtradas.
// Errores: sólo del servidor.
exports.getHistory = async (req, res, next) => {
  try {
    const { searchEvent, dateFrom, dateTo, weightClass } = req.query;
    const fights = await Fight.getHistory({ searchEvent, dateFrom, dateTo, weightClass });
    res.json(fights);
  } catch (err) {
    next(err);
  }
};
