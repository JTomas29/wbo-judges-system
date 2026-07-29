import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJudgeById, getJudgeAssignments, getMyAssignments } from '../../services/judgeService';
import { getJudgeStatistics } from '../../services/statisticsService';
import BackButton from '../../components/common/BackButton';
import DetailSection from '../../components/detail/DetailSection';
import { BoltIcon, UserGroupIcon, CheckBadgeIcon, ChartBarIcon, ArrowTrendingUpIcon, ShieldCheckIcon, ScaleIcon, TrophyIcon } from '@heroicons/react/24/outline';

const LEVEL_BADGE = {
  elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  senior: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
  junior: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
};

const FORMAT_DATE = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const getResultMeta = (pct) => {
  if (pct >= 80) return { label: 'Excelente', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800/50', bar: 'bg-gradient-to-r from-green-500 to-emerald-400' };
  if (pct >= 60) return { label: 'Bueno', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', bar: 'bg-gradient-to-r from-amber-500 to-yellow-400' };
  if (pct >= 40) return { label: 'Regular', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', bar: 'bg-gradient-to-r from-orange-500 to-amber-400' };
  return { label: 'Necesita mejorar', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', bar: 'bg-gradient-to-r from-red-500 to-rose-400' };
};

const performanceBadge = (pct) => {
  if (pct >= 80) return { emoji: '🥇', label: 'Excelente' };
  if (pct >= 60) return { emoji: '🥈', label: 'Muy bueno' };
  if (pct >= 40) return { emoji: '🥉', label: 'Bueno' };
  return { emoji: '📈', label: 'En progreso' };
};

const statAccents = {
  fights: { border: 'border-t-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400', icon: UserGroupIcon },
  rounds: { border: 'border-t-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-700 dark:text-amber-400', icon: BoltIcon },
  precision: { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-700 dark:text-emerald-400', icon: ChartBarIcon },
  level: { border: 'border-t-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-700 dark:text-violet-400', icon: ShieldCheckIcon },
};

const StatCard = ({ accent, label, value }) => {
  const a = statAccents[accent];
  const Icon = a.icon;
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${a.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B] m-0 leading-none">{label}</p>
          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mt-1 m-0 leading-tight truncate">{value}</p>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, size = 'md' }) => {
  const meta = getResultMeta(value);
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className={`w-full ${heights[size]} rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden`}>
      <div
        className={`${heights[size]} rounded-full ${meta.bar} transition-all duration-1000 ease-out`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

const DonutChart = ({ value, size = 120 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const meta = getResultMeta(value);
  const colorMap = {
    'bg-gradient-to-r from-green-500 to-emerald-400': '#10b981',
    'bg-gradient-to-r from-amber-500 to-yellow-400': '#f59e0b',
    'bg-gradient-to-r from-orange-500 to-amber-400': '#f97316',
    'bg-gradient-to-r from-red-500 to-rose-400': '#ef4444',
  };
  const strokeColor = colorMap[meta.bar] || '#10b981';

  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-[#1E293B]" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

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
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm p-8 flex flex-col items-center gap-3 border border-slate-200 dark:border-[#1E293B]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-[#374151] border-t-wbo-700" />
          <span className="text-slate-500 text-sm dark:text-[#94A3B8]">Cargando perfil...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm px-6 py-4 text-center border border-slate-200 dark:border-[#1E293B]">
          <p className="text-red-600 text-sm dark:text-red-300 m-0">{error}</p>
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

  const pBadge = performanceBadge(precision);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Hero: Judge Header ── */}
      <div className="bg-gradient-to-br from-white via-white to-wbo-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-2 border-t-wbo-700 shadow-md p-6 md:p-8">
        <BackButton fallbackRoute={isOwnProfile ? '/dashboard' : '/judges'} />
        <div className="mt-4 flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex items-start gap-5 flex-1 min-w-0">
            <div className="shrink-0">
              <div className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md ring-2 ring-red-300 dark:ring-red-700/50">
                {initials}
              </div>
            </div>
            <div className="min-w-0 pt-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate dark:text-[#F8FAFC] m-0">{judge?.name}</h1>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 shadow-sm">
                  <span>{pBadge.emoji}</span>
                  <span>{pBadge.label}</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 dark:text-[#94A3B8] m-0">{judge?.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50">
                  Juez
                </Badge>
                <Badge className={LEVEL_BADGE[judge?.level] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}>
                  {judge?.level || '—'}
                </Badge>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${judge?.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${judge?.is_active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {judge?.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {stats && totalFights > 0 && (
            <div className="shrink-0 w-full lg:w-auto lg:min-w-[420px]">
              <div className="border-t border-slate-100 dark:border-[#1E293B] pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-6 lg:border-slate-100 lg:dark:border-[#1E293B]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{totalFights}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Peleas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{totalRounds}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Rounds</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{precision}%</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Precisión</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={precision} size="sm" />
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="shrink-0 flex items-center gap-3 py-4 px-6">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-red-800" />
              <span className="text-sm text-slate-500">Cargando estadísticas...</span>
            </div>
          )}

          {!loading && stats && totalFights === 0 && (
            <div className="shrink-0 py-4 px-6 text-center">
              <p className="text-sm text-slate-400 dark:text-[#64748B] m-0">Aún no hay datos de rendimiento.</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5 m-0">Complete su primera pelea para ver estadísticas.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      {totalAssigned > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard accent="fights" label="Pendientes" value={pendingConfirm} />
          <StatCard accent="rounds" label="Confirmadas" value={confirmedCount} />
          <StatCard accent="precision" label="Activas" value={activeScoring} />
          <StatCard accent="level" label="Analizadas" value={analyzedCount} />
        </div>
      )}

      {/* ── Rendimiento General ── */}
      {stats && totalFights > 0 && (
        <div className="bg-gradient-to-br from-white to-wbo-50/20 dark:from-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-violet-500 shadow-md p-6 md:p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <TrophyIcon className="w-5 h-5 text-violet-700 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Rendimiento General</h3>
              <p className="text-[12px] text-slate-400 dark:text-[#64748B] m-0 mt-0.5">Estadísticas globales del juez</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row items-center gap-8">
            <div className="relative flex items-center justify-center">
              <DonutChart value={precision} size={140} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{precision}%</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider m-0">Precisión</p>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                  <UserGroupIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{totalFights}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Peleas</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-2">
                  <BoltIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{totalRounds}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Rounds</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheckIcon className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                </div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 capitalize">{judge?.level || '—'}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Nivel</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-2">
                  <CheckBadgeIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{analyzedCount}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Analizadas</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center mx-auto mb-2">
                  <ScaleIcon className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{stats?.history?.length || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Historial</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                </div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0">{pBadge.label}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mt-0.5 m-0">Consistencia</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance Bars ── */}
      {stats && totalFights > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Precisión General</span>
              <span className={`text-xs font-extrabold tabular-nums ${getResultMeta(precision).color}`}>{precision}%</span>
            </div>
            <ProgressBar value={precision} size="md" />
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Peleas Completadas</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-[#F8FAFC] tabular-nums">{totalFights}</span>
            </div>
            <ProgressBar value={Math.min(totalFights * 10, 100)} size="md" />
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Rounds Evaluados</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-[#F8FAFC] tabular-nums">{totalRounds}</span>
            </div>
            <ProgressBar value={Math.min(totalRounds * 5, 100)} size="md" />
          </div>
        </div>
      )}

      {/* ── Designaciones ── */}
      <DetailSection icon={UserGroupIcon} title="Designaciones" description="Historial de peleas asignadas">
        {assignments.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3 dark:bg-[#1F2937]">
              <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-[#94A3B8] m-0">Sin designaciones</p>
            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500 m-0">Este juez aún no tiene peleas asignadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const state = getFightState(a);
              const meta = STATE_META[state];
              return (
                <div key={a.fight_id} className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-[#0B1120] dark:border-[#1E293B] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate dark:text-[#F8FAFC] m-0">{a.event_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate dark:text-[#94A3B8] m-0">
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
      </DetailSection>

      {/* ── Historial de Rendimiento ── */}
      {stats?.history && stats.history.length > 0 && (
        <DetailSection icon={ChartBarIcon} title="Historial de Rendimiento" description="Precisión y resultados por pelea">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Pelea</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden sm:table-cell">Fecha</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Resultado</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Barra</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Acertados</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Errores</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.map((h) => {
                  const rMeta = getResultMeta(h.match_pct);
                  return (
                    <tr key={h.fight_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 truncate max-w-[200px] dark:text-[#F8FAFC]">{h.event_name}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell dark:text-[#94A3B8]">{FORMAT_DATE(h.scheduled_date)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${rMeta.bg} ${rMeta.color} border ${rMeta.border}`}>
                          {h.match_pct >= 80 ? '🥇' : h.match_pct >= 60 ? '🥈' : h.match_pct >= 40 ? '🥉' : '⚠'}
                          <span>{rMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px]">
                            <ProgressBar value={h.match_pct} size="sm" />
                          </div>
                          <span className={`text-xs font-extrabold tabular-nums ${rMeta.color}`}>{h.match_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm font-semibold hidden md:table-cell dark:text-[#94A3B8] tabular-nums">{h.matches}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-sm hidden md:table-cell dark:text-[#94A3B8] tabular-nums">{h.errors}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

    </div>
  );
};

export default JudgeProfile;
