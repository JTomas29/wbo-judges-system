import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../services/dashboardService';
import JudgeDashboard from './JudgeDashboard';

const statusColors = {
  scheduled: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Programada', icon: 'clock', border: 'border-amber-200 dark:border-amber-800/50' },
  active: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Activa', icon: 'zap', border: 'border-emerald-200 dark:border-emerald-800/50' },
  completed: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', label: 'Finalizada', icon: 'check', border: 'border-blue-200 dark:border-blue-800/50' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'Cancelada', icon: 'x', border: 'border-red-200 dark:border-red-800/50' },
};

const getStatusColor = (status) =>
  statusColors[status] || { bg: 'bg-slate-50 dark:bg-slate-700/30', text: 'text-slate-500 dark:text-slate-300', dot: 'bg-slate-400', label: status, border: 'border-slate-200 dark:border-slate-600' };

const judgeInitials = (name) =>
  name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '??';

const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const levelBadge = (level) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    senior: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold ${colors[level] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
      {level}
    </span>
  );
};

/* ─── Reusable sub-components ─── */

const StatusIcon = ({ type }) => {
  const paths = {
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    zap: 'M13 10V3L4 14h7v7l9-11h-7z',
    check: 'M5 13l4 4L19 7',
    x: 'M6 18L18 6M6 6l12 12',
  };
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type] || paths.check} />
    </svg>
  );
};

const AnimatedCounter = ({ value }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) { setDisplay(value); return; }
    hasAnimated.current = true;
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / 30));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(interval); }
      else setDisplay(start);
    }, duration / 30);
    return () => clearInterval(interval);
  }, [value]);

  return <span ref={ref}>{display}</span>;
};

const KpiIcon = ({ type }) => {
  const icons = {
    fights: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    active: 'M13 10V3L4 14h7v7l9-11h-7z',
    completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    judges: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[type] || icons.fights} />
    </svg>
  );
};

/* ─── KPI Card ─── */
const KpiCard = ({ label, value, icon, trend, desc, color }) => (
  <div className={`group bg-white rounded-2xl border border-slate-200 ${color.top} shadow-sm p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:bg-[#111827] dark:border-[#1E293B]`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-11 h-11 rounded-full ${color.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm`}>
        <span className={color.text}><KpiIcon type={icon} /></span>
      </div>
      {trend && (
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          <svg className={`w-3 h-3 ${trend.up ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {trend.value}
        </span>
      )}
    </div>
    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none mb-1 dark:text-[#F8FAFC]">
      <AnimatedCounter value={value} />
    </p>
    <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">{label}</p>
    {desc && <p className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">{desc}</p>}
  </div>
);

/* ─── Quick Action Card ─── */
const QuickActionCard = ({ icon, title, desc, onClick, primary }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-start gap-4 p-4 rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] text-left w-full ${
      primary
        ? 'bg-red-800 border-red-800 hover:bg-red-900 hover:shadow-md text-white dark:bg-red-800 dark:border-red-800 dark:hover:bg-red-900'
        : 'bg-white border-slate-200 hover:shadow-md hover:border-red-200 text-slate-900 dark:bg-[#111827] dark:border-[#1E293B] dark:hover:border-red-800/50 dark:text-[#F8FAFC]'
    }`}
  >
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
      primary
        ? 'bg-white/15 group-hover:bg-white/20'
        : 'bg-red-50 group-hover:bg-red-100 dark:bg-[#1F2937] dark:group-hover:bg-[#1F2937]'
    }`}>
      <span className={primary ? 'text-white' : 'text-red-700'}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-bold transition-colors ${primary ? 'text-white' : 'text-slate-900 group-hover:text-red-800 dark:text-[#F8FAFC] dark:group-hover:text-red-400'}`}>{title}</p>
      <p className={`text-xs mt-0.5 ${primary ? 'text-red-100' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{desc}</p>
    </div>
    <svg className={`w-4 h-4 transition-all duration-200 shrink-0 mt-2 ${
      primary
        ? 'text-red-200 group-hover:text-white group-hover:translate-x-0.5'
        : 'text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 dark:text-slate-600 dark:group-hover:text-red-400'
    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const st = getStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm ${st.bg} ${st.text} border ${st.border || st.bg.replace('bg-', 'border-').replace('50', '200')}`}>
      <StatusIcon type={st.icon} />
      {st.label}
    </span>
  );
};

/* ─── System Status Item ─── */
const SystemStatusItem = ({ label, status, uptime }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 dark:border-[#1E293B]">
    <div className="flex items-center gap-2.5">
      <span className="relative flex w-2 h-2">
        {status === 'ok' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex rounded-full w-2 h-2 ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      </span>
      <span className="text-sm font-medium text-slate-700 dark:text-[#94A3B8]">{label}</span>
    </div>
    {uptime && <span className="text-[11px] text-slate-400 dark:text-slate-500">{uptime}</span>}
  </div>
);

/* ─── Judge Card ─── */
const JudgeCard = ({ judge, index }) => {
  const pct = judge.avg_match_pct !== null ? judge.avg_match_pct : 0;
  const colors = [
    { from: 'from-red-800', to: 'to-red-900', bar: 'bg-red-800' },
    { from: 'from-blue-600', to: 'to-blue-700', bar: 'bg-blue-600' },
    { from: 'from-emerald-600', to: 'to-emerald-700', bar: 'bg-emerald-600' },
  ];
  const c = colors[index % 3] || colors[0];
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.from} ${c.to} text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm`}>
          {judgeInitials(judge.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-red-800 transition-colors dark:text-[#F8FAFC] dark:group-hover:text-red-400">{judge.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {judge.level && levelBadge(judge.level)}
            {judge.level && <span className="text-slate-300 dark:text-slate-600">|</span>}
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{judge.total_analyzed || 0} peleas</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-800 dark:text-[#94A3B8]">{pct.toFixed(0)}%</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-500">Precisión</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-[#1F2937]">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ─── Main Dashboard Component ─── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboard(token);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  if (user?.role === 'judge') {
    return <JudgeDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 w-28 bg-slate-200 rounded-xl dark:bg-[#1F2937]" />)}
        </div>
        <div className="h-10 w-64 bg-slate-200 rounded-xl dark:bg-[#1F2937]" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-[150px] dark:bg-[#111827] dark:border-[#1E293B]">
              <div className="h-10 w-10 bg-slate-100 rounded-xl mb-4 dark:bg-[#1F2937]" />
              <div className="h-8 w-16 bg-slate-100 rounded mb-2 dark:bg-[#1F2937]" />
              <div className="h-3 w-24 bg-slate-100 rounded dark:bg-[#1F2937]" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 h-[420px] dark:bg-[#111827] dark:border-[#1E293B]" />
          <div className="xl:col-span-8 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 h-[320px] dark:bg-[#111827] dark:border-[#1E293B]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-5 h-[260px] dark:bg-[#111827] dark:border-[#1E293B]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 dark:bg-red-900/30">
          <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 dark:text-[#F8FAFC]">Error al cargar</h3>
        <p className="text-sm text-slate-500 mb-6 dark:text-[#94A3B8]">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { stats, recent_fights, active_judges } = data;
  const now = new Date().toLocaleString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const kpiCards = [
    { label: 'Total Peleas', value: stats.total_fights, icon: 'fights', desc: 'Peleas registradas en el sistema', color: { bg: 'bg-red-50', text: 'text-red-700', top: 'border-t-[3px] border-t-red-500' }, trend: null },
    { label: 'Peleas Activas', value: stats.active_fights, icon: 'active', desc: 'En curso actualmente', color: { bg: 'bg-emerald-50', text: 'text-emerald-700', top: 'border-t-[3px] border-t-emerald-500' }, trend: null },
    { label: 'Finalizadas', value: stats.completed_fights, icon: 'completed', desc: 'Completadas y analizadas', color: { bg: 'bg-blue-50', text: 'text-blue-700', top: 'border-t-[3px] border-t-blue-500' }, trend: null },
    { label: 'Jueces', value: stats.total_judges, icon: 'judges', desc: 'Registrados en el sistema', color: { bg: 'bg-amber-50', text: 'text-amber-700', top: 'border-t-[3px] border-t-amber-500' }, trend: null },
  ];

  const statusDistribution = ['pending', 'active', 'completed', 'cancelled'].map((st) => {
    const count = recent_fights.filter((f) => f.status === st).length;
    return { ...getStatusColor(st), key: st, count };
  }).filter((s) => s.count > 0);

  const maxStatusCount = Math.max(...statusDistribution.map((s) => s.count), 1);

  const isEmpty = recent_fights.length === 0 && active_judges.length === 0;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Header Section ── */}
      <div className="bg-gradient-to-b from-slate-50/80 to-transparent rounded-2xl -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-5 pb-6 sm:pt-6 sm:pb-7 -mt-5 sm:-mt-6 mb-2 dark:from-[#0B1120]/80 dark:to-transparent">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm dark:bg-[#111827] dark:border-[#1E293B]">
                <span className="relative flex w-2.5 h-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest dark:text-[#94A3B8]">Sistema Activo</span>
              </div>
              <span className="text-xs text-slate-300 dark:text-slate-600">/</span>
              <span className="text-xs text-slate-400 tracking-wide dark:text-slate-500">
                <span className="text-slate-500 font-medium dark:text-[#94A3B8]">WBO</span> / Dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.97] shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <button
                onClick={() => navigate('/fights/create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-800 to-red-900 rounded-xl hover:from-red-900 hover:to-red-950 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Pelea
              </button>
            </div>
          </div>

          {/* Title Row */}
          <div className="mt-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-red-800 to-red-600 hidden sm:block" />
            <div className="sm:pl-5">
              <h1 className="text-[30px] sm:text-[38px] font-extrabold text-slate-900 tracking-tight leading-tight dark:text-[#F8FAFC]">
                Panel de Control
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2 dark:text-slate-500">
                <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Última actualización: {now}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 dark:bg-[#1F2937]">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2 dark:text-[#F8FAFC]">No hay datos disponibles</h3>
          <p className="text-sm text-slate-400 mb-6 dark:text-slate-500">Aún no se han registrado peleas o jueces en el sistema.</p>
          {user?.role !== 'judge' && (
            <button
              onClick={() => navigate('/fights/create')}
              className="px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Crear primera pelea
            </button>
          )}
        </div>
      ) : (
        <>

          {/* ── Judge: Active fights section (kept as-is for logic preservation) ── */}
          {user?.role === 'judge' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Puntuación</p>
                  <h3 className="text-lg font-bold text-slate-900">Mis peleas activas</h3>
                </div>
              </div>
              {activeFightsLoading ? (
                <div className="flex items-center gap-2 py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-red-800" />
                  <span className="text-sm text-slate-400">Cargando...</span>
                </div>
              ) : activeFights.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">No tenés peleas activas</p>
                  <p className="text-xs text-slate-400">Cuando una pelea que confirmaste esté activa, aparecerá aquí.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeFights.map((a) => {
                    const isScored = a.scorecard_status === 'finalized';
                    return (
                      <div key={a.fight_id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 hover:bg-red-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{a.event_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.boxer_red} vs {a.boxer_blue}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(a.scheduled_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {a.venue ? ` \u00B7 ${a.venue}` : ''}
                          </p>
                        </div>
                        {isScored ? (
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <StatusIcon type="check" />
                              Tarjeta enviada
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Esperando a los demás jueces.</p>
                          </div>
                        ) : (
                          <button
                            className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-red-800 text-white rounded-lg text-xs font-semibold hover:bg-red-900 transition-all active:scale-[0.97] shadow-sm"
                            onClick={() => navigate(`/scoring/${a.fight_id}`)}
                          >
                            Puntuar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {kpiCards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

            {/* ── LEFT COLUMN ── */}
            <div className="xl:col-span-4 space-y-5">

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md dark:bg-[#111827] dark:border-[#1E293B]">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Acciones Rápidas</p>
                <h3 className="text-lg font-bold text-slate-900 mb-4 dark:text-[#F8FAFC]">Operaciones</h3>
                <div className="grid grid-cols-1 gap-3">
                  {user?.role !== 'judge' && (
                    <QuickActionCard
                      primary
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                      title="Nueva Pelea"
                      desc="Crear un nuevo combate en el sistema"
                      onClick={() => navigate('/fights/create')}
                    />
                  )}
                  {user?.role !== 'judge' && (
                    <QuickActionCard
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                      title="Ver Peleas"
                      desc="Listado completo de combates"
                      onClick={() => navigate('/fights')}
                    />
                  )}
                  {user?.role !== 'judge' && (
                    <QuickActionCard
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                      title="Ver Jueces"
                      desc="Gestionar el cuerpo de árbitros"
                      onClick={() => navigate('/judges')}
                    />
                  )}
                  {user?.role !== 'judge' && (
                    <QuickActionCard
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                      title="Ver Estadísticas"
                      desc="Análisis y rendimiento de jueces"
                      onClick={() => navigate('/analysis/statistics')}
                    />
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Estado del Sistema</p>
                <h3 className="text-lg font-bold text-slate-900 mb-3 dark:text-[#F8FAFC]">Servicios</h3>
                <div className="divide-y divide-slate-100">
                  <SystemStatusItem label="Base de datos" status="ok" uptime="Conectada" />
                  <SystemStatusItem label="API REST" status="ok" uptime="Activa" />
                  <SystemStatusItem label="Servidor" status="ok" uptime="Respondiendo" />
                  <SystemStatusItem label="Autenticación" status="ok" uptime="JWT activo" />
                </div>
              </div>

              {/* Status Distribution (mini chart) */}
              {statusDistribution.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Distribución</p>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 dark:text-[#F8FAFC]">Estado de peleas</h3>
                  <div className="space-y-3">
                    {statusDistribution.map((s) => (
                      <div key={s.key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                            <span className="text-sm font-medium text-slate-700 dark:text-[#94A3B8]">{s.label}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{s.count}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden dark:bg-[#1F2937]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${s.dot.replace('bg-', 'bg-')}`}
                            style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="xl:col-span-8 space-y-5">

              {/* Recent Activity Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
                <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between dark:border-[#1E293B]">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Actividad Reciente</p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Últimos Combates</h3>
                  </div>
                  {user?.role !== 'judge' && (
                    <button
                      onClick={() => navigate('/fights')}
                      className="group text-sm font-semibold text-red-700 hover:text-red-800 transition-colors shrink-0 flex items-center gap-1"
                    >
                      Ver todas
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {recent_fights.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-400">No hay peleas registradas aún.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-[#0B1120]/80">
                        <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                          <th className="text-left py-3.5 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8]">Combate</th>
                          <th className="text-left py-3.5 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Fecha</th>
                          <th className="text-left py-3.5 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden lg:table-cell">Rounds</th>
                          <th className="text-center py-3.5 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8] hidden lg:table-cell">Jueces</th>
                          <th className="text-left py-3.5 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wide dark:text-[#94A3B8]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent_fights.map((fight) => {
                          const st = getStatusColor(fight.status);
                          return (
                            <tr
                              key={fight.id}
                              className="border-b border-slate-100 hover:bg-red-50/40 transition-all duration-200 cursor-pointer dark:border-[#1E293B] dark:hover:bg-[#1A2435]"
                              onClick={() => navigate(`/fights/${fight.id}`)}
                            >
                              <td className="py-4 px-6">
                                <p className="text-sm font-bold text-slate-900 truncate dark:text-[#F8FAFC]">{fight.event_name}</p>
                                <p className="text-xs text-slate-500 mt-0.5 dark:text-[#94A3B8]">
                                  {fight.boxer_red} vs {fight.boxer_blue}
                                </p>
                              </td>
                              <td className="py-4 px-6 text-slate-500 whitespace-nowrap hidden md:table-cell text-xs dark:text-[#94A3B8]">{formatDate(fight.scheduled_date)}</td>
                              <td className="py-4 px-6 hidden lg:table-cell">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                  {fight.total_rounds} rounds
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center hidden lg:table-cell">
                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-red-800 text-white text-[11px] font-bold shadow-sm">
                                  {fight.confirmed_judges}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <StatusBadge status={fight.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between dark:border-[#1E293B]">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Mostrando <span className="font-semibold text-slate-600 dark:text-[#94A3B8]">{recent_fights.length}</span> de{' '}
                    <span className="font-semibold text-slate-600 dark:text-[#94A3B8]">{stats.total_fights}</span> peleas
                  </p>
                  <p className="text-xs text-slate-300 dark:text-slate-600">Temporada 2026</p>
                </div>
              </div>

              {/* Judges Detail Cards */}
              {active_judges.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Cuerpo de Árbitros</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Jueces Destacados</h3>
                    </div>
                    {user?.role !== 'judge' && (
                      <button
                        onClick={() => navigate('/judges')}
                        className="group text-sm font-semibold text-red-700 hover:text-red-800 transition-colors shrink-0 flex items-center gap-1"
                      >
                        Ver panel completo
                        <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {active_judges.slice(0, 3).map((judge, idx) => (
                      <JudgeCard key={judge.id} judge={judge} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline / Recent Activity Log */}
              {recent_fights.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 dark:text-[#94A3B8]">Actividad en Tiempo Real</p>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 dark:text-[#F8FAFC]">Eventos Recientes</h3>
                  <div className="space-y-0">
                    {recent_fights.slice(0, 5).map((fight, i) => {
                      const st = getStatusColor(fight.status);
                      const isLast = i === Math.min(recent_fights.length, 5) - 1;
                      const hour = fight.scheduled_date
                        ? new Date(fight.scheduled_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                        : '--:--';
                      return (
                        <div key={fight.id} className="relative flex gap-4 pb-4 last:pb-0 group/timeline">
                          {!isLast && <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-200 dark:bg-[#1E293B] group-last/timeline:hidden" />}
                          <div className={`relative w-6 h-6 rounded-full border-2 border-white dark:border-[#111827] shadow-sm flex items-center justify-center shrink-0 mt-0.5 ${st.bg} transition-transform duration-200 group-hover/timeline:scale-110`}>
                            <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate dark:text-[#F8FAFC]">{fight.event_name}</p>
                              <span className="text-[11px] text-slate-400 shrink-0 dark:text-slate-500">{hour}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 dark:text-[#94A3B8]">{fight.boxer_red} vs {fight.boxer_blue}</p>
                            <div className="mt-1">
                              <StatusBadge status={fight.status} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
