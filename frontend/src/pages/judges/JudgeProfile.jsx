import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJudgeById, getJudgeAssignments, getMyAssignments } from '../../services/judgeService';
import { getJudgeStatistics } from '../../services/statisticsService';
import BackButton from '../../components/common/BackButton';

const LEVEL_BADGE = {
  elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  senior: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
  junior: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
};

const FORMAT_DATE = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const StatBlock = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:border-red-200 hover:shadow-sm dark:bg-[#111827] dark:border-[#1E293B]">
    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-2 dark:bg-[#1F2937]">
      <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-2xl font-bold text-slate-900 leading-none dark:text-[#F8FAFC]">{value}</p>
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1 dark:text-[#94A3B8]">{label}</p>
  </div>
);

const getFightState = (a) => {
  if (a.assignment_status === 'pending') return 'pending';
  if (a.assignment_status === 'confirmed') {
    if (a.fight_status === 'pending') return 'confirmed';
    if (a.fight_status === 'active') return 'active';
    if (a.fight_status === 'completed') return 'completed';
    if (a.fight_status === 'analyzed') return 'analyzed';
  }
  return 'rejected';
};

const STATE_META = {
  pending:    { label: 'Pendiente',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30 dark:border dark:border-amber-800/50' },
  confirmed:  { label: 'Confirmada',  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/30 dark:border dark:border-blue-800/50' },
  active:     { label: 'Activa',      color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30 dark:border dark:border-green-800/50' },
  completed:  { label: 'Finalizada',  color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/30 dark:border dark:border-slate-600/50' },
  analyzed:   { label: 'Analizada',   color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-100 dark:bg-red-900/30 dark:border dark:border-red-800/50' },
  rejected:   { label: 'Rechazada',   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30 dark:border dark:border-red-800/50' },
};

const JudgeProfile = () => {
  const { judgeId, userId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [judge, setJudge] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const targetJudgeId = parseInt(judgeId || userId, 10);
  const isOwnProfile = user?.id === targetJudgeId;

  useEffect(() => {
    if (user?.role === 'judge' && user.id !== targetJudgeId) {
      navigate(`/profile/${user.id}`, { replace: true });
    }
  }, [user, targetJudgeId, navigate]);

  const loadData = useCallback(async () => {
    if (!token || !targetJudgeId) return;
    setLoading(true);
    setError(null);

    try {
      if (user?.role === 'judge') {
        if (user.id !== targetJudgeId) return;
        setJudge(user);
        const [assignRes, statsRes] = await Promise.allSettled([
          getMyAssignments(token),
          getJudgeStatistics(targetJudgeId, token),
        ]);
        setAssignments(assignRes.status === 'fulfilled' ? (assignRes.value.data || []) : []);
        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
      } else {
        const [judgeRes, assignRes, statsRes] = await Promise.allSettled([
          getJudgeById(targetJudgeId, token),
          getJudgeAssignments(targetJudgeId, token),
          getJudgeStatistics(targetJudgeId, token),
        ]);

        if (judgeRes.status === 'rejected') {
          const status = judgeRes.reason?.response?.status;
          if (status === 404) { setError('Juez no encontrado'); return; }
          if (status === 403) { setError('No tenés permiso para ver este perfil'); return; }
          setError(judgeRes.reason?.response?.data?.message || 'Error al cargar perfil');
          return;
        }
        setJudge(judgeRes.value.data);
        setAssignments(assignRes.status === 'fulfilled' ? (assignRes.value.data || []) : []);
        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  }, [token, targetJudgeId, user, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center gap-3 dark:bg-[#111827]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-wbo-700 dark:border-[#374151]" />
          <span className="text-slate-500 text-sm dark:text-[#94A3B8]">Cargando perfil...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm px-6 py-4 text-center dark:bg-red-900/30 dark:border dark:border-red-800/50">
          <p className="text-red-600 text-sm dark:text-red-300">{error}</p>
          <BackButton fallbackRoute={isOwnProfile ? '/dashboard' : '/judges'} />
        </div>
      </div>
    );
  }

  const totalAssigned = assignments.length;
  const pendingConfirm = assignments.filter((a) => a.assignment_status === 'pending').length;
  const confirmedCount = assignments.filter((a) => a.assignment_status === 'confirmed').length;
  const analyzedCount = assignments.filter((a) => a.assignment_status === 'confirmed' && a.fight_status === 'analyzed').length;
  const activeScoring = assignments.filter(
    (a) => a.assignment_status === 'confirmed' && a.fight_status === 'active' && a.scorecard_status !== 'finalized'
  ).length;

  const precision = stats?.avg_match_pct || 0;
  const totalFights = stats?.total_fights || 0;
  const totalRounds = stats?.total_rounds || 0;

  const initials = judge?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fadeIn">

      <div className="mb-4">
        <BackButton fallbackRoute={isOwnProfile ? '/dashboard' : '/judges'} />
      </div>

      {/* ─── Profile Card ─── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden dark:bg-[#111827] dark:border-[#1E293B]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Avatar + Info */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md">
                  {initials}
                </div>
              </div>
              <div className="min-w-0 pt-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate dark:text-[#F8FAFC]">{judge?.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5 dark:text-[#94A3B8]">{judge?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <Badge className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50">
                    Juez
                  </Badge>
                  <Badge className={LEVEL_BADGE[judge?.level] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}>
                    {judge?.level || '\u2014'}
                  </Badge>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${judge?.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${judge?.is_active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    {judge?.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-3 dark:text-[#94A3B8]">
                  Ingreso: {FORMAT_DATE(judge?.created_at)}
                </p>
              </div>
            </div>

            {/* Right: Stats blocks */}
            {stats && totalFights > 0 && (
              <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[420px]">
                <StatBlock
                  label="Precisión"
                  value={`${precision}%`}
                  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <StatBlock
                  label="Peleas evaluadas"
                  value={totalFights}
                  icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
                <StatBlock
                  label="Rounds evaluados"
                  value={totalRounds}
                  icon="M13 10V3L4 14h7v7l9-11h-7z"
                />
                <StatBlock
                  label="Peleas analizadas"
                  value={analyzedCount}
                  icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </div>
            )}

            {/* Stats loading */}
            {loading && (
              <div className="shrink-0 flex items-center gap-3 py-4 px-6">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-red-800" />
                <span className="text-sm text-slate-500">Cargando estadísticas...</span>
              </div>
            )}

            {/* Stats empty */}
            {!loading && stats && totalFights === 0 && (
              <div className="shrink-0 py-4 px-6 text-center">
                <p className="text-sm text-slate-400">Aún no hay datos de rendimiento.</p>
                <p className="text-xs text-slate-300 mt-0.5">Completó su primera pelea para ver estadísticas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Assignment Counters ─── */}
      {totalAssigned > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            { label: 'Pendientes', value: pendingConfirm, color: 'bg-amber-500' },
            { label: 'Confirmadas', value: confirmedCount, color: 'bg-emerald-500' },
            { label: 'Activas', value: activeScoring, color: 'bg-blue-500' },
            { label: 'Analizadas', value: analyzedCount, color: 'bg-violet-500' },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 min-w-[130px] dark:bg-[#111827] dark:border-[#1E293B]">
              <div>
                <p className="text-xl font-bold text-slate-900 leading-none dark:text-[#F8FAFC]">{c.value}</p>
                <p className="text-xs text-slate-500 mt-0.5 dark:text-[#94A3B8]">{c.label}</p>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${c.color} ml-auto`} />
            </div>
          ))}
        </div>
      )}

      {/* ─── Assignments History ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 dark:bg-[#111827] dark:border-[#1E293B]">
        <h2 className="text-lg font-bold text-slate-900 mb-5 dark:text-[#F8FAFC]">Designaciones</h2>
        {assignments.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3 dark:bg-[#1F2937]">
              <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-[#94A3B8]">Sin designaciones</p>
            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Este juez aún no tiene peleas asignadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const state = getFightState(a);
              const meta = STATE_META[state];
              return (
                <div key={a.fight_id} className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-[#0B1120] dark:border-[#1E293B]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate dark:text-[#F8FAFC]">{a.event_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate dark:text-[#94A3B8]">
                      {a.boxer_red} vs {a.boxer_blue} · {FORMAT_DATE(a.scheduled_date)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Performance History ─── */}
      {stats?.history && stats.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 dark:bg-[#111827] dark:border-[#1E293B]">
          <h2 className="text-lg font-bold text-slate-900 mb-5 dark:text-[#F8FAFC]">Rendimiento</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8]">Pelea</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden sm:table-cell">Fecha</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8]">Precisión</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Acertados</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Errores</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.map((h) => (
                  <tr key={h.fight_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
                    <td className="py-3 px-4 font-semibold text-slate-800 truncate max-w-[200px] dark:text-[#F8FAFC]">{h.event_name}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs hidden sm:table-cell dark:text-[#94A3B8]">{FORMAT_DATE(h.scheduled_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                        h.match_pct >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : h.match_pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {h.match_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs hidden md:table-cell dark:text-[#94A3B8]">{h.matches}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs hidden md:table-cell dark:text-[#94A3B8]">{h.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default JudgeProfile;
