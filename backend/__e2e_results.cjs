const BASE = 'http://localhost:4000/api';

const readToken = (name) =>
  require('fs').readFileSync(`C:/Users/joako/AppData/Local/Temp/opencode/${name}.token`, 'utf8').trim();

const ADMIN = readToken('admin');
const SUPERVISOR = readToken('supervisor');
const JUDGE = readToken('judge');

const api = async (method, path, token, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

const log = (label, r) => console.log(label, '->', r.status, JSON.stringify(r.data));

(async () => {
  // 1) Crear pelea scratch de 10 rounds (fecha futura)
  const fightDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const created = await api('POST', '/fights', ADMIN, {
    event_name: 'SCRATCH TEST RESULTADOS',
    boxer_red: 'Boxeador Prueba Rojo',
    boxer_blue: 'Boxeador Prueba Azul',
    scheduled_date: fightDate,
    total_rounds: 10,
    weight_class: 'Peso Pesado',
    venue: 'TEST',
  });
  log('CREATE FIGHT', created);
  const fightId = created.data?.id;
  if (!fightId) return;

  // 2) Asignar juez 36
  const assigned = await api('POST', `/fights/${fightId}/assignments`, ADMIN, {
    judge_ids: [36],
    assignment_type: 'evaluator',
  });
  log('ASSIGN JUDGE', assigned);

  // 3) Crear scorecard (juez) -> la pelea debe estar activa; primero activar
  const activated = await api('POST', `/fights/${fightId}/activate`, ADMIN, {});
  log('ACTIVATE FIGHT', activated);

  const sc = await api('POST', `/fights/${fightId}/scorecards`, JUDGE, {});
  log('CREATE SCORECARD', sc);
  const scorecardId = sc.data?.score_card?.id;
  console.log('SCORECARD_ID:', scorecardId);

  // 4) Puntuar round 6 antes de resultado (debe pasar, es una pelea de 10 rounds)
  const r6 = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 6, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 6 (pre-result)', r6);

  // 5) Registrar KO round 5 (supervisor) -> debe pasar con fecha futura
  const result = await api('POST', `/fights/${fightId}/result`, SUPERVISOR, {
    result_type: 'ko', winner: 'Boxeador Prueba Rojo', round: 5, time: '2:35',
  });
  log('REGISTER KO R5', result);

  // 6) Reintentar round 6 -> debe fallar (pelea terminó en round 5)
  const r6b = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 6, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 6 (post-result, debe fallar)', r6b);

  // 7) Round 5 -> debe pasar
  const r5 = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 5, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 5 (debe pasar)', r5);

  // 8) Tarjeta oficial con 10 rounds -> debe fallar (solo 5)
  const rounds10 = Array.from({ length: 10 }, (_, i) => ({
    round_number: i + 1, score_red: 10, score_blue: 9,
  }));
  const oc10 = await api('POST', `/fights/${fightId}/official-card`, SUPERVISOR, { rounds: rounds10 });
  log('OFFICIAL CARD 10 rounds (debe fallar)', oc10);

  // 9) Tarjeta oficial con 5 rounds -> debe pasar
  const rounds5 = Array.from({ length: 5 }, (_, i) => ({
    round_number: i + 1, score_red: 10, score_blue: 9,
  }));
  const oc5 = await api('POST', `/fights/${fightId}/official-card`, SUPERVISOR, { rounds: rounds5 });
  log('OFFICIAL CARD 5 rounds (debe pasar)', oc5);

  // 10) Limpiar: archivar pelea
  const arch = await api('DELETE', `/fights/${fightId}`, ADMIN, {});
  log('ARCHIVE CLEANUP', arch);

  console.log('FIGHT_ID_FOR_REFERENCE:', fightId);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
