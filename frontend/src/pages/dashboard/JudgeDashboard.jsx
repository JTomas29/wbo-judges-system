import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments, respondAssignment } from '../../services/judgeService';
import { getJudgeStatistics } from '../../services/statisticsService';

// ─── Reusable components ───
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-red-100 shadow-sm hover:border-red-300 hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const LEVEL_BADGE = {
  elite: 'bg-green-100 text-green-700',
  senior: 'bg-blue-100 text-blue-700',
  junior: 'bg-amber-100 text-amber-700',
};

const FORMAT_DATE = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TODAY_STR = () =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
  pending:    { label: 'Pendiente',   color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500', bar: 'bg-amber-500', step: 0 },
  confirmed:  { label: 'Confirmada',  color: 'text-blue-700',  bg: 'bg-blue-100',  dot: 'bg-blue-500',  bar: 'bg-blue-500',  step: 1 },
  active:     { label: 'Activa',      color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500', bar: 'bg-green-500', step: 2 },
  completed:  { label: 'Finalizada',  color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-400', bar: 'bg-slate-400', step: 3 },
  analyzed:   { label: 'Analizada',   color: 'text-red-700',   bg: 'bg-red-100',   dot: 'bg-red-500',   bar: 'bg-red-500',   step: 4 },
  rejected:   { label: 'Rechazada',   color: 'text-red-600',   bg: 'bg-red-100',   dot: 'bg-red-500',   bar: 'bg-red-500',   step: -1 },
};

const STATE_STEPS = ['pending', 'confirmed', 'active', 'completed', 'analyzed'];

const TimelineItem = ({ icon, label, date, done }) => (
  <div className="flex gap-3">
    <div className={`flex flex-col items-center ${done ? '' : 'opacity-40'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'bg-white border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-300'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icon} />
        </svg>
      </div>
      <div className="w-px flex-1 bg-red-100 mt-1" />
    </div>
    <div className={`pb-6 ${done ? '' : 'opacity-40'}`}>
      <p className={`text-sm font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{label}</p>
      {date && <p className="text-xs text-slate-400 mt-0.5">{date}</p>}
    </div>
  </div>
);

const StatBlock = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:border-red-200 hover:shadow-sm">
    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-2">
      <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{label}</p>
  </div>
);

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [loadingAsign, setLoadingAsign] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [responding, setResponding] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoadingAsign(true);
    setLoadingStats(true);
    setError(null);
    try {
      const [asignRes, statsRes] = await Promise.all([
        getMyAssignments(token),
        getJudgeStatistics(user.id, token),
      ]);
      setAssignments(asignRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos del dashboard');
    } finally {
      setLoadingAsign(false);
      setLoadingStats(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) loadData();
  }, [token, user, loadData]);

  const handleConfirm = async (fightId) => {
    setResponding(fightId);
    try {
      await respondAssignment(fightId, { response: 'confirmed' }, token);
      setAssignments((prev) =>
        prev.map((a) => (a.fight_id === fightId ? { ...a, assignment_status: 'confirmed' } : a))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Error al confirmar');
    } finally {
      setResponding(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Error al cargar</h3>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <button onClick={loadData} className="px-6 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-900 transition-all rounded-xl shadow-sm hover:shadow-md active:scale-[0.98]">Reintentar</button>
      </div>
    );
  }

  const totalAssigned = assignments.length;
  const pendingConfirm = assignments.filter((a) => a.assignment_status === 'pending').length;
  const confirmedCount = assignments.filter((a) => a.assignment_status === 'confirmed').length;
  const rejectedCount = assignments.filter((a) => a.assignment_status === 'rejected').length;
  const activeScoring = assignments.filter(
    (a) => a.assignment_status === 'confirmed' && a.fight_status === 'active' && a.scorecard_status !== 'finalized'
  ).length;
  const analyzedCount = assignments.filter((a) => a.assignment_status === 'confirmed' && a.fight_status === 'analyzed').length;

  const precision = stats?.avg_match_pct || 0;
  const totalFights = stats?.total_fights || 0;
  const totalRounds = stats?.total_rounds || 0;

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ─── 1. MI PERFIL (Premium Card) ─── */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Top section: Avatar + Info + Stats */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Avatar + Personal Info */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md">
                  {initials}
                </div>
              </div>
              <div className="min-w-0 pt-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">{user?.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <Badge className="bg-red-50 text-red-700 border border-red-200">
                    Juez
                  </Badge>
                  <Badge className={LEVEL_BADGE[user?.level] || 'bg-slate-100 text-slate-600'}>
                    {user?.level || '\u2014'}
                  </Badge>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user?.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                    {user?.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-3 capitalize">{TODAY_STR()}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Bienvenido de vuelta, {user?.name?.split(' ')[0] || 'Juez'}.{' '}
                  {pendingConfirm > 0
                    ? `Tenés ${pendingConfirm} designación${pendingConfirm > 1 ? 'es' : ''} pendiente${pendingConfirm > 1 ? 'es' : ''} por confirmar.`
                    : activeScoring > 0
                      ? `Tenés ${activeScoring} pelea${activeScoring > 1 ? 's' : ''} activa${activeScoring > 1 ? 's' : ''} para puntuar.`
                      : 'No hay novedades pendientes.'}
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

            {/* Stats loading state */}
            {loadingStats && (
              <div className="shrink-0 flex items-center gap-3 py-4 px-6">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-red-800" />
                <span className="text-sm text-slate-500">Cargando estadísticas...</span>
              </div>
            )}

            {/* Stats empty state */}
            {!loadingStats && stats && totalFights === 0 && (
              <div className="shrink-0 py-4 px-6 text-center">
                <p className="text-sm text-slate-400">Aún no hay datos de rendimiento.</p>
                <p className="text-xs text-slate-300 mt-0.5">Completá tu primera pelea para ver tus estadísticas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar: Meta info + actions */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Ingreso: {FORMAT_DATE(user?.created_at)}</span>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-200 transition-all active:scale-[0.97]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Editar perfil
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-200 transition-all active:scale-[0.97]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. DESIGNATIONS + TIMELINE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Mis Designaciones</h2>
              <p className="text-sm text-slate-500 mt-1">
                {assignments.length} pelea{assignments.length !== 1 ? 's' : ''} asignada{assignments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/judges/confirmation')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-800 hover:bg-red-900 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
              Ver todas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Counter mini-cards */}
          {assignments.length > 0 && (
            <div className="flex gap-3 mb-7 overflow-x-auto pb-1">
              {[
                { label: 'Pendientes', value: pendingConfirm, color: 'bg-amber-500', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                { label: 'Confirmadas', value: confirmedCount, color: 'bg-emerald-500', icon: 'M5 13l4 4L19 7' },
                { label: 'Rechazadas', value: rejectedCount, color: 'bg-red-500', icon: 'M6 18L18 6M6 6l12 12' },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 min-w-[140px]">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 leading-none">{c.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.color} ml-auto`} />
                </div>
              ))}
            </div>
          )}

          {loadingAsign ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-red-800" />
              <span className="text-sm text-slate-500">Cargando designaciones...</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">No tenés designaciones aún</p>
              <p className="text-xs text-slate-400 mt-1">Cuando un administrador te asigne una pelea aparecerá aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {assignments.slice(0, 4).map((a) => {
                const state = getFightState(a);
                const meta = STATE_META[state];
                const currentStep = meta.step;
                const progressText = currentStep >= 0 ? `Paso ${currentStep + 1} de 5` : '';

                const borderAccent = {
                  pending: 'border-l-amber-500',
                  confirmed: 'border-l-emerald-500',
                  active: 'border-l-blue-500',
                  completed: 'border-l-slate-400',
                  analyzed: 'border-l-violet-500',
                  rejected: 'border-l-red-500',
                }[state] || 'border-l-slate-300';

                return (
                  <div key={a.fight_id} className={`group bg-white rounded-2xl border border-slate-200 border-l-[5px] ${borderAccent} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-red-300`}>
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 truncate leading-tight">{a.event_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {[a.weight_class, a.venue].filter(Boolean).join(' · ') || 'Sin detalles'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${meta.bg} ${meta.color} rounded-full`}>
                            {meta.label}
                          </Badge>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-red-50 text-slate-300 hover:text-red-700 transition-all shrink-0"
                            onClick={() => navigate(`/scoring/${a.fight_id}`)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="px-5 pb-3">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Fecha</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900">{FORMAT_DATE(a.scheduled_date)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Boxeador rojo</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 truncate">{a.boxer_red}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Boxeador azul</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 truncate">{a.boxer_blue}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Lugar</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 truncate">{a.venue || '\u2014'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-5 pb-5 pt-1">
                      {state === 'pending' && (
                        <button disabled={responding === a.fight_id}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => handleConfirm(a.fight_id)}>
                          {responding === a.fight_id ? 'Confirmando...' : 'Confirmar participación'}
                        </button>
                      )}
                      {state === 'confirmed' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl">{progressText} · Esperando inicio</div>
                      )}
                      {state === 'active' && a.scorecard_status === 'finalized' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl">{progressText} · Tarjeta enviada</div>
                      )}
                      {state === 'active' && a.scorecard_status !== 'finalized' && (
                        <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
                          onClick={() => navigate(`/scoring/${a.fight_id}`)}>
                          Puntuar pelea
                        </button>
                      )}
                      {state === 'completed' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl">{progressText} · Esperando análisis</div>
                      )}
                      {state === 'analyzed' && (
                        <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-red-300 text-red-700 text-xs font-semibold rounded-xl hover:bg-red-50 hover:border-red-500 transition-all active:scale-[0.97]"
                          onClick={() => navigate(`/analysis/${a.fight_id}`)}>
                          Ver análisis
                        </button>
                      )}
                      {state === 'rejected' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl">Rechazada</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Actividad Reciente</h2>
          {assignments.length > 0 || stats?.total_fights > 0 ? (
            <div>
              {pendingConfirm === 0 && totalAssigned > 0 && (
                <TimelineItem icon="M5 13l4 4L19 7" label="Confirmaste participación" date={FORMAT_DATE(new Date())} done />
              )}
              <TimelineItem icon="M5 13l4 4L19 7" label="Tarjeta enviada" date={null} done={analyzedCount > 0} />
              <TimelineItem icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Pelea analizada" date={null} done={analyzedCount > 0} />
              <TimelineItem icon="M13 10V3L4 14h7v7l9-11h-7z" label={`Nivel ${stats?.level || '\u2014'}`} date={null} done={!!stats?.level} />
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">Sin actividad reciente</p>
              <p className="text-xs text-slate-400 mt-1">Tus acciones aparecerán aquí.</p>
            </div>
          )}
        </Card>
      </div>

      {/* ─── 3. QUICK ACTIONS ─── */}
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Mis Designaciones', path: '/judges/confirmation', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', primary: true },
            { label: 'Mis Estadísticas', path: '/analysis/statistics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { label: 'Mi Perfil', path: '/judges/confirmation', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          ].map((btn) => (
            <button key={btn.label} onClick={() => navigate(btn.path)}
              className={`group relative overflow-hidden rounded-xl p-4 sm:p-5 text-left transition-all duration-300 active:scale-[0.98] ${
                btn.primary
                  ? 'bg-red-800 hover:bg-red-900 shadow-sm hover:shadow-md'
                  : 'bg-white border border-slate-300 hover:border-red-300 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${
                btn.primary ? 'bg-white/15' : 'bg-red-50'
              }`}>
                <svg className={`w-5 h-5 ${btn.primary ? 'text-white' : 'text-red-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={btn.icon} />
                </svg>
              </div>
              <p className={`text-sm font-bold ${btn.primary ? 'text-white' : 'text-slate-900'}`}>{btn.label}</p>
            </button>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default JudgeDashboard;