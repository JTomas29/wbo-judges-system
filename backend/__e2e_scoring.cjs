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
  const fightDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const created = await api('POST', '/fights', ADMIN, {
    event_name: 'SCRATCH SCORING CAP TEST',
    boxer_red: 'Rojo Cap Test',
    boxer_blue: 'Azul Cap Test',
    scheduled_date: fightDate,
    total_rounds: 8,
    weight_class: 'Welter',
    venue: 'TEST',
  });
  log('CREATE FIGHT', created);
  const fightId = created.data?.id;
  if (!fightId) return;

  for (const j of [10, 11, 36]) {
    const a = await api('POST', `/fights/${fightId}/assignments`, ADMIN, { judge_id: j, assignment_type: 'evaluator' });
    log(`ASSIGN judge ${j}`, a);
  }

  const act = await api('POST', `/fights/${fightId}/activate`, ADMIN, {});
  log('ACTIVATE', act);

  const sc = await api('POST', `/fights/${fightId}/scorecards`, JUDGE, {});
  log('CREATE SCORECARD (judge 36)', sc);
  const scorecardId = sc.data?.score_card?.id;
  console.log('SCORECARD_ID:', scorecardId);

  // saveRound round 4 antes de resultado (pelea de 8) -> debe pasar
  const pre = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 4, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 4 (pre-result, debe pasar)', pre);

  // Registrar TKO round 3
  const result = await api('POST', `/fights/${fightId}/result`, SUPERVISOR, {
    result_type: 'tko', winner: 'Rojo Cap Test', round: 3, time: '1:45',
  });
  log('REGISTER TKO R3', result);

  // saveRound round 4 post-result -> debe FALLAR
  const post4 = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 4, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 4 (post-result, debe fallar)', post4);

  // saveRound round 3 -> debe pasar
  const post3 = await api('POST', `/scorecards/${scorecardId}/rounds`, JUDGE, {
    round_number: 3, score_red: 10, score_blue: 9,
  });
  log('SAVE ROUND 3 (debe pasar)', post3);

  // finalizeScorecard con solo rounds 3 y 4 (no completos: 2/3) -> debe fallar
  const fin = await api('PATCH', `/scorecards/${scorecardId}/finalize`, JUDGE, {});
  log('FINALIZE con 2/3 rounds (debe fallar)', fin);

  const arch = await api('DELETE', `/fights/${fightId}`, ADMIN, {});
  log('CLEANUP ARCHIVE', arch);
  console.log('FIGHT_ID:', fightId);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
