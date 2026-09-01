// Configuración del modo demo para el portfolio.
// Intercepta TODAS las llamadas axios (tanto el axios default como la instancia `api`)
// y responde con datos mock en memoria (Opción A: se resetean al recargar).
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import api from '../services/api';
import {
  mockUsers,
  mockReferees,
  mockFights,
  mockAssignments,
  mockJudgeStats,
  mockAnalysis,
} from '../data/mockData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ── Estado en memoria (Opción A) ─────────────────────────────
const state = {
  users: mockUsers.map((u) => ({ ...u })),
  referees: mockReferees.map((r) => ({ ...r })),
  fights: mockFights.map((f) => ({ ...f, assigned_judges: (f.assigned_judges || []).map((j) => ({ ...j })) })),
  assignments: {},
  scorecards: {}, // fightId -> { judgeId -> scorecard }
  officialCards: {},
  officialJudgeCards: {},
  analysis: mockAnalysis,
  nextIds: { fight: 100, scorecard: 100, assignment: 100 },
};
// copia profunda simple de assignments
Object.keys(mockAssignments).forEach((judgeId) => {
  state.assignments[judgeId] = mockAssignments[judgeId].map((a) => ({ ...a }));
});

const findUser = (email) => state.users.find((u) => u.email === email.toLowerCase());
const authUser = (req) => {
  const token = req?.headers?.Authorization || '';
  const t = String(token).replace('Bearer ', '');
  return state.users.find((u) => `${u.id}-${u.email}` === t) || null;
};

function publicUser(u) {
  const { password: _pw, ...rest } = u;
  return rest;
}

const nowISO = () => new Date().toISOString();

// ── Rutas ────────────────────────────────────────────────────
// La instancia `api` resuelve URLs relativas (baseURL aplicada por axios).
// El axios default resuelve URLs absolutas con API_URL. Ambas se normalizan
// para que coincidan con estas rutas relativas.
// Convierte una ruta en una RegExp anclada al final. La instancia `api`
// reporta `config.url` relativo (ej: /fights) mientras que el axios default
// reporta la URL absoluta (ej: http://localhost:4000/api/fights). Una regex
// anclada al final coincide con ambos.
function normalize(path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}$`);
}

// Recopila los handlers para (method, matcher) -> handler genérico
// Se registran SIEMPRE con un delay para simular red.

const attach = (mock) => {
  // ── AUTH ──
  mock.onPost(normalize('/auth/login')).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const user = findUser(body.email);
    if (!user || user.password !== body.password) {
      return [401, { message: 'Credenciales inválidas' }];
    }
    // token derivado de id y email (para revalidar en /auth/me)
    const token = `${user.id}-${user.email}`;
    return [200, { message: 'Inicio de sesión exitoso', token, user: publicUser(user) }];
  });

  mock.onGet(normalize('/auth/me')).reply((config) => {
    const user = authUser(config);
    if (!user) return [401, { message: 'No autorizado' }];
    return [200, { user: publicUser(user) }];
  });

  mock.onPost(normalize('/auth/register')).reply((config) => ({
    message: 'Usuario registrado exitosamente',
  }));

  // ── DASHBOARD ──
  mock.onGet(normalize('/dashboard')).reply(() => {
    const active = state.fights.filter((f) => f.status === 'active').length;
    const completed = state.fights.filter((f) => f.status === 'completed' || f.status === 'analyzed').length;
    const recent = state.fights.map((f) => ({
      id: f.id,
      event_name: f.event_name,
      boxer_red: f.boxer_red,
      boxer_blue: f.boxer_blue,
      scheduled_date: f.scheduled_date,
      status: f.status,
      total_rounds: f.total_rounds,
      confirmed_judges: f.confirmed_judges,
    })).slice(0, 4);
    const activeJudges = Object.values(mockJudgeStats)
      .filter((s) => s.total_fights > 0)
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        name: s.name,
        email: state.users.find((u) => u.id === s.id)?.email,
        avg_match_pct: s.avg_match_pct,
        total_analyzed: s.total_fights,
        total_matches: s.total_rounds,
        total_errors: Math.round(s.total_rounds * (1 - s.avg_match_pct / 100)),
      }));
    return [200, {
      stats: {
        total_fights: state.fights.length,
        active_fights: active,
        completed_fights: completed,
        total_judges: state.users.filter((u) => u.role === 'judge' && u.is_active).length,
      },
      recent_fights: recent,
      active_judges: activeJudges,
    }];
  });

  // ── FIGHTS ──
  mock.onGet(normalize('/fights')).reply(() => {
    const list = state.fights.map((f) => ({
      id: f.id,
      event_name: f.event_name,
      boxer_red: f.boxer_red,
      boxer_blue: f.boxer_blue,
      scheduled_date: f.scheduled_date,
      weight_class: f.weight_class,
      venue: f.venue,
      title: f.title,
      broadcaster: f.broadcaster,
      referee_id: f.referee_id,
      referee_name: f.referee ? `${f.referee.first_name} ${f.referee.last_name}` : null,
      status: f.status,
      min_judges_required: f.min_judges_required,
      total_rounds: f.total_rounds,
      result_type: f.result_type,
      result_winner: f.result_winner,
      result_round: f.result_round,
      result_time: f.result_time,
      result_registered_at: f.result_registered_at,
      created_at: f.created_at,
      confirmed_judges: f.confirmed_judges,
    }));
    return [200, list];
  });

  mock.onGet(normalize('/fights/history')).reply(() => {
    const archived = state.fights.filter((f) => f.status === 'archived');
    return [200, archived.map((f) => ({
      id: f.id,
      event_name: f.event_name,
      boxer_red: f.boxer_red,
      boxer_blue: f.boxer_blue,
      scheduled_date: f.scheduled_date,
      weight_class: f.weight_class,
      venue: f.venue,
      title: f.title,
      broadcaster: f.broadcaster,
      status: f.status,
      total_rounds: f.total_rounds,
      archived_at: nowISO(),
      created_at: f.created_at,
      avg_match_pct: 0,
      total_matches: 0,
      total_errors: 0,
    }))];
  });

  mock.onGet(/\/fights\/(\d+)\/analysis$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/analysis$/);
    const fightId = Number(idMatch[1]);
    const analysis = state.analysis[fightId];
    if (!analysis) return [400, { message: 'La pelea debe estar analizada para ver el análisis.' }];
    return [200, analysis];
  });

  mock.onGet(/\/fights\/(\d+)\/scorecards\/mine$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/scorecards\/mine$/);
    const fightId = Number(idMatch[1]);
    const user = authUser(config);
    const judgeId = user?.id;
    const sc = state.scorecards[fightId]?.[judgeId];
    if (sc) return [200, sc];
    return [404, { message: 'No scorecard yet' }];
  });

  mock.onGet(/\/fights\/(\d+)\/scorecards$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/scorecards$/);
    const fightId = Number(idMatch[1]);
    const list = Object.values(state.scorecards[fightId] || {});
    return [200, list];
  });

  mock.onGet(/\/fights\/(\d+)\/official-card$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/official-card$/);
    const fightId = Number(idMatch[1]);
    const oc = state.officialCards[fightId];
    if (!oc) return [404, { message: 'No official card yet' }];
    return [200, oc];
  });

  mock.onGet(/\/fights\/(\d+)\/official-judge-cards$/).reply((config) => {
    return [200, []];
  });

  mock.onGet(/\/fights\/official-judge-cards\/(\d+)$/).reply(() => [404, { message: 'Not found' }]);

  mock.onGet(/\/fights\/(\d+)\/assignments$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/assignments$/);
    const fightId = Number(idMatch[1]);
    const fight = state.fights.find((f) => f.id === fightId);
    return [200, fight ? fight.assigned_judges : []];
  });

  // getById (debe ir DESPUÉS de las rutas /fights/:id/... más específicas)
  mock.onGet(/\/fights\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)$/);
    const fightId = Number(idMatch[1]);
    const fight = state.fights.find((f) => f.id === fightId);
    if (!fight) return [404, { message: 'Pelea no encontrada' }];
    const user = authUser(config);
    const filtered = user?.role === 'judge'
      ? (fight.assigned_judges || []).filter((j) => j.id === user.id)
      : fight.assigned_judges || [];
    return [200, {
      ...fight,
      assigned_judges: filtered,
      official_card: state.officialCards[fightId] || null,
      official_judge_cards: [],
      analysis_summary: [],
    }];
  });

  mock.onPost(/\/fights\/(\d+)\/activate$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/activate$/);
    const fightId = Number(idMatch[1]);
    const fight = state.fights.find((f) => f.id === fightId);
    if (!fight) return [404, { message: 'Pelea no encontrada' }];
    if (fight.status !== 'pending') return [400, { message: 'Solo se puede activar una pelea en estado pending' }];
    if (fight.confirmed_judges < 3) return [400, { message: 'Se necesitan al menos 3 jueces designados para activar la pelea' }];
    fight.status = 'active';
    return [200, { message: 'Pelea activada correctamente.', fight: { ...fight, status: 'active' } }];
  });

  mock.onPost(/\/fights\/(\d+)\/complete$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/complete$/);
    const fightId = Number(idMatch[1]);
    const fight = state.fights.find((f) => f.id === fightId);
    if (!fight) return [404, { message: 'Pelea no encontrada' }];
    fight.status = 'completed';
    return [200, { message: 'Pelea finalizada correctamente.', fight: { ...fight, status: 'completed' } }];
  });

  mock.onPost(/\/fights\/(\d+)\/assignments$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/assignments$/);
    const fightId = Number(idMatch[1]);
    const body = JSON.parse(config.data || '{}');
    const fight = state.fights.find((f) => f.id === fightId);
    if (!fight) return [404, { message: 'Pelea no encontrada' }];
    const judge = state.users.find((u) => u.id === Number(body.judge_id));
    if (!judge) return [400, { message: 'El usuario indicado no existe' }];
    fight.assigned_judges = fight.assigned_judges || [];
    if (fight.assigned_judges.some((j) => j.id === judge.id)) return [400, { message: 'El juez ya está asignado a esta pelea' }];
    fight.assigned_judges.push({
      id: judge.id,
      name: judge.name,
      email: judge.email,
      level: judge.level,
      assignment_type: body.assignment_type,
    });
    fight.confirmed_judges = fight.assigned_judges.length;
    fight.min_judges_required = fight.confirmed_judges;
    return [201, { id: state.nextIds.assignment++, fight_id: fightId, judge_id: judge.id, assignment_type: body.assignment_type, assigned_at: nowISO() }];
  });

  mock.onDelete(/\/fights\/(\d+)\/assignments\/(\d+)$/).reply((config) => {
    const m = config.url.match(/\/fights\/(\d+)\/assignments\/(\d+)$/);
    const fightId = Number(m[1]);
    const judgeId = Number(m[2]);
    const fight = state.fights.find((f) => f.id === fightId);
    if (fight) {
      fight.assigned_judges = (fight.assigned_judges || []).filter((j) => j.id !== judgeId);
      fight.confirmed_judges = fight.assigned_judges.length;
      fight.min_judges_required = fight.confirmed_judges;
    }
    return [204];
  });

  mock.onPost(normalize('/fights')).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const id = state.nextIds.fight++;
    const fight = {
      id,
      event_name: body.event_name,
      boxer_red: body.boxer_red,
      boxer_blue: body.boxer_blue,
      scheduled_date: body.scheduled_date,
      total_rounds: Number(body.total_rounds),
      weight_class: body.weight_class,
      venue: body.venue || null,
      title: body.title || null,
      broadcaster: body.broadcaster || null,
      notes: body.notes || null,
      referee_id: body.referee_id || null,
      referee: body.referee_id ? state.referees.find((r) => r.id === Number(body.referee_id)) : null,
      status: 'pending',
      min_judges_required: 0,
      confirmed_judges: 0,
      assigned_judges: [],
      created_at: nowISO(),
    };
    state.fights.push(fight);
    return [201, { ...fight }];
  });

  mock.onPut(/\/fights\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)$/);
    const fightId = Number(idMatch[1]);
    const fight = state.fights.find((f) => f.id === fightId);
    if (!fight) return [404, { message: 'Pelea no encontrada' }];
    const body = JSON.parse(config.data || '{}');
    Object.assign(fight, {
      event_name: body.event_name, boxer_red: body.boxer_red, boxer_blue: body.boxer_blue,
      scheduled_date: body.scheduled_date, total_rounds: Number(body.total_rounds),
      weight_class: body.weight_class, venue: body.venue, title: body.title,
      broadcaster: body.broadcaster, referee_id: body.referee_id || null,
      referee: body.referee_id ? state.referees.find((r) => r.id === Number(body.referee_id)) : null,
    });
    return [200, { ...fight }];
  });

  mock.onDelete(/\/fights\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)$/);
    const fightId = Number(idMatch[1]);
    state.fights = state.fights.filter((f) => f.id !== fightId);
    return [200, { message: 'Pelea eliminada' }];
  });

  // ── JUDGES ──
  mock.onGet(normalize('/judges')).reply(() => {
    return [200, state.users
      .filter((u) => u.role === 'judge')
      .map((u) => publicUser(u))];
  });

  mock.onGet(/\/judges\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/judges\/(\d+)$/);
    const jid = Number(idMatch[1]);
    const u = state.users.find((x) => x.id === jid && x.role === 'judge');
    if (!u) return [404, { message: 'Juez no encontrado' }];
    const stats = mockJudgeStats[jid] || { total_fights: 0, total_rounds: 0, avg_match_pct: 0, last_5_avg: 0 };
    return [200, { ...publicUser(u), ...stats }];
  });

  mock.onPut(/\/judges\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/judges\/(\d+)$/);
    const jid = Number(idMatch[1]);
    const body = JSON.parse(config.data || '{}');
    const u = state.users.find((x) => x.id === jid);
    if (u) {
      if (body.name) u.name = body.name;
      if (body.email) u.email = body.email;
      if (body.level) u.level = body.level;
      if (typeof body.is_active === 'boolean') u.is_active = body.is_active;
    }
    return [200, u ? publicUser(u) : { message: 'Juez no encontrado' }];
  });

  mock.onDelete(/\/judges\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/judges\/(\d+)$/);
    const jid = Number(idMatch[1]);
    state.users = state.users.filter((u) => u.id !== jid);
    return [200, { message: 'Juez eliminado' }];
  });

  mock.onGet(/\/judges\/(\d+)\/assignments$/).reply(() => [200, []]);
  mock.onGet(normalize('/me/assignments')).reply((config) => {
    const user = authUser(config);
    if (!user) return [401, { message: 'No autorizado' }];
    return [200, state.assignments[user.id] || []];
  });

  // ── STATISTICS ──
  mock.onGet(normalize('/statistics')).reply((config) => {
    const user = authUser(config);
    let rows = Object.values(mockJudgeStats);
    if (user?.role === 'judge') rows = rows.filter((s) => s.id === user.id);
    const map = rows.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      total_fights: s.total_fights,
      total_rounds: s.total_rounds,
      avg_match_pct: s.avg_match_pct,
      last_5_avg: s.last_5_avg,
    })).sort((a, b) => b.avg_match_pct - a.avg_match_pct);
    return [200, map];
  });

  mock.onGet(/\/statistics\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/statistics\/(\d+)$/);
    const jid = Number(idMatch[1]);
    const s = mockJudgeStats[jid];
    if (!s) return [404, { message: 'Juez no encontrado' }];
    return [200, { ...s, history: [] }];
  });

  // ── SCORING ──
  mock.onPost(/\/fights\/(\d+)\/scorecards$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/scorecards$/);
    const fightId = Number(idMatch[1]);
    const user = authUser(config);
    const judgeId = user?.id;
    state.scorecards[fightId] = state.scorecards[fightId] || {};
    if (!state.scorecards[fightId][judgeId]) {
      state.scorecards[fightId][judgeId] = {
        id: state.nextIds.scorecard++,
        fight_id: fightId,
        judge_id: judgeId,
        status: 'in_progress',
        rounds: [],
      };
    }
    return [200, state.scorecards[fightId][judgeId]];
  });

  mock.onPost(/\/scorecards\/(\d+)\/rounds$/).reply((config) => {
    const idMatch = config.url.match(/\/scorecards\/(\d+)\/rounds$/);
    const scId = Number(idMatch[1]);
    const body = JSON.parse(config.data || '{}');
    for (const fightId of Object.keys(state.scorecards)) {
      for (const judgeId of Object.keys(state.scorecards[fightId])) {
        const sc = state.scorecards[fightId][judgeId];
        if (sc.id === scId) {
          const existing = sc.rounds.findIndex((r) => r.round_number === Number(body.round_number));
          const round = {
            id: state.nextIds.scorecard++,
            round_number: Number(body.round_number),
            score_red: Number(body.score_red),
            score_blue: Number(body.score_blue),
          };
          if (existing >= 0) sc.rounds[existing] = round;
          else sc.rounds.push(round);
          return [200, sc];
        }
      }
    }
    return [404, { message: 'Scorecard no encontrada' }];
  });

  mock.onPatch(/\/scorecards\/(\d+)\/finalize$/).reply((config) => {
    const idMatch = config.url.match(/\/scorecards\/(\d+)\/finalize$/);
    const scId = Number(idMatch[1]);
    for (const fightId of Object.keys(state.scorecards)) {
      for (const judgeId of Object.keys(state.scorecards[fightId])) {
        const sc = state.scorecards[fightId][judgeId];
        if (sc.id === scId) {
          sc.status = 'finalized';
          return [200, sc];
        }
      }
    }
    return [404, { message: 'Scorecard no encontrada' }];
  });

  // ── OFICIAL CARDS ──
  mock.onPost(/\/fights\/(\d+)\/official-card$/).reply((config) => {
    const idMatch = config.url.match(/\/fights\/(\d+)\/official-card$/);
    const fightId = Number(idMatch[1]);
    const body = JSON.parse(config.data || '{}');
    state.officialCards[fightId] = {
      id: fightId,
      fight_id: fightId,
      total_score_red: Number(body.total_score_red || 0),
      total_score_blue: Number(body.total_score_blue || 0),
      winner: body.winner || null,
      rounds: body.rounds || [],
    };
    return [200, state.officialCards[fightId]];
  });

  mock.onPost(/\/fights\/(\d+)\/official-judge-cards$/).reply(() => [201, {}]);
  mock.onPut(/\/fights\/official-judge-cards\/(\d+)$/).reply(() => [200, {}]);

  // ── ANALISIS (legacy endpoint) ──
  mock.onGet(normalize('/analysis/statistics')).reply(() => [200, Object.values(mockJudgeStats)]);
  mock.onGet(/\/analysis\/fight\/(\d+)$/).reply(() => [200, []]);

  // ── NOTIFICATIONS (instancia api) ──
  mock.onGet(normalize('/notifications')).reply(() => [200, []]);
  mock.onGet(normalize('/notifications/unread-count')).reply(() => [200, { count: 0 }]);
  mock.onPatch(normalize('/notifications/read-all')).reply(() => [200, {}]);
  mock.onPatch(/\/notifications\/(\d+)\/read$/).reply(() => [200, {}]);
  mock.onDelete(/\/notifications\/(\d+)$/).reply(() => [204]);
  mock.onDelete(normalize('/notifications')).reply(() => [204]);

  // ── REFEREES (instancia api y axios) ──
  mock.onGet(normalize('/referees')).reply(() => [200, state.referees.map((r) => ({ ...r, name: `${r.first_name} ${r.last_name}` }))]);
  mock.onPost(normalize('/referees')).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const id = state.referees.length + 100;
    const r = { id, first_name: body.first_name, last_name: body.last_name, license_number: body.license_number, federation: body.federation, active: body.active !== false };
    state.referees.push(r);
    return [201, r];
  });
  mock.onPut(/\/referees\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/referees\/(\d+)$/);
    const rid = Number(idMatch[1]);
    const r = state.referees.find((x) => x.id === rid);
    if (r) {
      const body = JSON.parse(config.data || '{}');
      Object.assign(r, { first_name: body.first_name, last_name: body.last_name, license_number: body.license_number, federation: body.federation, active: body.active !== false });
    }
    return r ? [200, r] : [404, { message: 'Referee no encontrado' }];
  });
  mock.onDelete(/\/referees\/(\d+)$/).reply((config) => {
    const idMatch = config.url.match(/\/referees\/(\d+)$/);
    const rid = Number(idMatch[1]);
    state.referees = state.referees.filter((r) => r.id !== rid);
    return [200, { message: 'Referee dado de baja' }];
  });

  mock.onGet(normalize('/referees/ranking')).reply(() => [200, []]);
  mock.onGet(/\/referees\/(\d+)\/profile$/).reply(() => [200, {}]);

  // ── REFEREE EVALUATIONS ──
  mock.onGet(/\/referee-evaluations\/fight\/(\d+)$/).reply(() => [200, []]);
  mock.onPost(normalize('/referee-evaluations')).reply(() => [200, {}]);
  mock.onPut(/\/referee-evaluations\/(\d+)$/).reply(() => [200, {}]);
  mock.onDelete(/\/referee-evaluations\/(\d+)$/).reply(() => [204]);

  // ── FALLBACK ──
  mock.onAny().reply((config) => {
    console.warn(`[demo] Endpoint no mockeado: ${config.method.toUpperCase()} ${config.url}`);
    return [404, { message: 'No implementado en modo demo', url: config.url }];
  });
};

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export function setupMocks() {
  const mockAxios = new MockAdapter(axios, { delayResponse: delay });
  const mockApi = new MockAdapter(api, { delayResponse: delay });
  attach(mockAxios);
  attach(mockApi);
  console.info('[demo] Modo demo activado: axios-mock-adapter interceptando llamadas');
}
