import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getScorecards, completeFight } from '../../services/fightService';
import { getEffectiveTotalRounds } from '../../utils/fightResult';
import BackButton from '../../components/common/BackButton';
import {
  CalendarIcon,
  MapPinIcon,
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  HashtagIcon,
  InboxIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const statusBadge = (status) => {
  if (!status) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
      <ClockIcon className="w-3.5 h-3.5" />
      Pendiente
    </span>
  );
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/40">
      <ClockIcon className="w-3.5 h-3.5" />
      En progreso
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800/40">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Recibido
    </span>
  );
};

const fightStatusBadge = (status) => {
  if (!status) return null;
  const map = {
    pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-200 ring-amber-400/30', dot: 'bg-amber-300' },
    active: { label: 'En vivo', cls: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30', dot: 'bg-emerald-300' },
    completed: { label: 'Completada', cls: 'bg-slate-500/15 text-slate-200 ring-slate-400/30', dot: 'bg-slate-300' },
    analyzed: { label: 'Analizada', cls: 'bg-gold/15 text-gold-light ring-gold/30', dot: 'bg-gold-light' },
    archived: { label: 'Archivada', cls: 'bg-slate-500/15 text-slate-200 ring-slate-400/30', dot: 'bg-slate-300' },
  };
  const m = map[status] || { label: status, cls: 'bg-slate-500/15 text-slate-200 ring-slate-400/30', dot: 'bg-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ring-1 ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
};

const statAccents = {
  red: { border: 'border-t-wbo-700', chip: 'bg-wbo-50 dark:bg-wbo-900/20', color: 'text-wbo-700 dark:text-wbo-400', value: 'text-wbo-700 dark:text-wbo-400' },
  blue: { border: 'border-t-blue-500', chip: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-700 dark:text-blue-400', value: 'text-blue-700 dark:text-blue-400' },
  emerald: { border: 'border-t-emerald-500', chip: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' },
  amber: { border: 'border-t-amber-500', chip: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-500', value: 'text-amber-600 dark:text-amber-500' },
};

const StatCard = ({ icon: Icon, label, value, suffix = '', accent = 'slate', delay = 0 }) => {
  const a = statAccents[accent];
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-md p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 animate-[fadeIn_0.4s_ease-out] group`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-9 h-9 rounded-xl ${a.chip} flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110`}>
        <Icon className={`w-4.5 h-4.5 ${a.color}`} />
      </div>
      <p className={`text-2xl sm:text-3xl font-extrabold ${a.value} m-0 leading-none tabular-nums`}>
        {value}
        {suffix && <span className="text-sm font-bold text-slate-400 dark:text-[#64748B] ml-1">{suffix}</span>}
      </p>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-[#64748B] uppercase tracking-wider mt-1.5 m-0">{label}</p>
    </div>
  );
};

const LiveHeader = ({ fight, maxCompleted, roundsPct, onRefresh }) => {
  const isActive = fight?.status === 'active';
  const infoItems = [
    { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight?.scheduled_date) },
    { icon: MapPinIcon, label: 'Lugar', value: fight?.venue || '\u2014' },
    { icon: BoltIcon, label: 'Categoría', value: fight?.weight_class || '\u2014' },
    { icon: HashtagIcon, label: 'Rounds', value: `${maxCompleted} / ${getEffectiveTotalRounds(fight)}` },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      <div className="relative bg-gradient-to-r from-wbo-800 via-wbo-700 to-wbo-800 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-7 h-7 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-300 mb-1 m-0">Puntuación en Vivo</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 leading-tight tracking-tight">
              {fight?.boxer_red} <span className="text-red-300 font-semibold">vs</span> {fight?.boxer_blue}
            </h1>
            <p className="text-sm text-red-100/90 mt-0.5 m-0">{fight?.event_name}</p>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            {isActive && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 text-white ring-1 ring-white/25 text-xs font-bold hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Actualizar
              </button>
            )}
            {fightStatusBadge(fight?.status)}
          </div>
        </div>
      </div>
      <div className="px-6 py-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-[#0B1120] border-t border-slate-100 dark:border-[#1E293B]">
        {infoItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm">
              <item.icon className="w-4 h-4 text-wbo-700 dark:text-wbo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">{item.label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] truncate m-0">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 sm:px-8 py-5">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
            <ChartBarIcon className="w-3.5 h-3.5 text-wbo-700 dark:text-wbo-400" />
            Progreso de la pelea
          </span>
          <span className="text-xs font-extrabold text-wbo-700 dark:text-wbo-400 tabular-nums">{roundsPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-wbo-600 to-wbo-700 rounded-full transition-all duration-700 ease-out" style={{ width: `${roundsPct}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-2 m-0">{maxCompleted} de {getEffectiveTotalRounds(fight)} rounds completados</p>
      </div>
    </div>
  );
};

const RoundBadges = ({ completed, total }) => (
  <div className="flex items-center justify-center gap-1 flex-wrap max-w-[200px] mx-auto">
    {Array.from({ length: total }, (_, i) => {
      const done = i < completed;
      return (
        <span
          key={i}
          className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors duration-200 ${
            done
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/40'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700'
          }`}
        >
          {i + 1}
        </span>
      );
    })}
  </div>
);

const ResultCell = ({ entry }) => {
  if (!entry.scorecard_status) return <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">Sin comenzar</span>;
  if (entry.scorecard_status === 'draft') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">En progreso</span>;

  const winner = entry.winner || 'Empate';
  return (
    <div className="leading-tight">
      <div className="flex items-center justify-end gap-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-sm font-extrabold tabular-nums">{entry.total_score_red}</span>
        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">–</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-sm font-extrabold tabular-nums">{entry.total_score_blue}</span>
      </div>
      <span className="block text-xs text-slate-500 mt-1 dark:text-[#94A3B8]">Ganador: {winner}</span>
    </div>
  );
};

const ScorecardsTable = ({ entries }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden animate-[fadeIn_0.45s_ease-out]">
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
        <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Tarjetas de Jueces</h3>
        <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Estado de cada tarjeta en tiempo real</p>
      </div>
    </div>
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#0B1120]">
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Juez</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Nivel</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Tipo</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Rounds</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Estado</th>
            <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
          {entries.length === 0 && (
            <tr>
              <td colSpan="6" className="px-4 py-10 text-center text-slate-400 dark:text-[#94A3B8]">
                <div className="flex flex-col items-center gap-2">
                  <UserGroupIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span>No hay jueces designados para esta pelea.</span>
                </div>
              </td>
            </tr>
          )}
          {entries.map((e, i) => (
            <tr key={e.judge_id} className={`transition-colors duration-150 hover:bg-wbo-50/40 dark:hover:bg-[#1A2435] ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-[#0B1120]/40' : ''}`}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-wbo-700 to-wbo-800 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                    {initials(e.judge_name)}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{e.judge_name}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold capitalize">{e.level}</span>
              </td>
              <td className="px-5 py-4 text-slate-500 dark:text-[#94A3B8] capitalize">{e.assignment_type}</td>
              <td className="px-5 py-4"><RoundBadges completed={e.completed_rounds || 0} total={e.total_rounds || 0} /></td>
              <td className="px-5 py-4 text-center">{statusBadge(e.scorecard_status)}</td>
              <td className="px-5 py-4 text-right"><ResultCell entry={e} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SummaryCard = ({ received, pendingCards, cardsPct, roundsPct, maxCompleted, totalRounds, lastUpdate }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md overflow-hidden sticky top-6 animate-[fadeIn_0.5s_ease-out]">
    <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
        <ChartBarIcon className="w-4 h-4 text-white" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Resumen</h3>
    </div>
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/70 dark:ring-emerald-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 m-0">Recibidas</p>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 m-0 tabular-nums">{received}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/70 dark:ring-amber-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 m-0">Pendientes</p>
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 m-0 tabular-nums">{pendingCards}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Tarjetas completadas</p>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{cardsPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${cardsPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Rounds completados</p>
          <span className="text-xs font-extrabold text-wbo-700 dark:text-wbo-400 tabular-nums">{roundsPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-wbo-600 to-wbo-700 rounded-full transition-all duration-700" style={{ width: `${roundsPct}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1.5 m-0">{maxCompleted} de {totalRounds} rounds</p>
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-1 m-0">Última actualización</p>
        <p className="text-sm font-bold text-slate-700 dark:text-[#94A3B8] m-0 flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          {lastUpdate ? formatDateTime(lastUpdate) : 'Sin recibos aún'}
        </p>
      </div>
    </div>
  </div>
);

const LiveScore = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';

  const fetchData = useCallback(async () => {
    try {
      if (!isStaff) {
        setError('El seguimiento en vivo solo está disponible para administradores y supervisores.');
        setLoading(false);
        return;
      }
      const [fightRes, scRes] = await Promise.all([
        getFightById(fightId, token),
        getScorecards(fightId, token),
      ]);
      setFight(fightRes.data);
      setEntries(scRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fightId, token, isStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh cada 30 segundos si hay drafts
  useEffect(() => {
    if (!entries.length) return;
    const hasDraft = entries.some((e) => e.scorecard_status === 'draft' || !e.scorecard_status);
    if (!hasDraft) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [entries, fetchData]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeFight(fightId, token);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al finalizar la pelea');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-[#94A3B8] py-16">
          <span className="animate-spin h-8 w-8 border-[3px] border-wbo-700 border-t-transparent rounded-full" />
          <p className="text-sm font-medium m-0">Cargando seguimiento en vivo...</p>
        </div>
      </div>
    );
  }

  if (error && !fight) {
    return (
      <div className="bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16">
        <div className="max-w-xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 shadow-md animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-red-700 dark:text-red-300 font-semibold m-0">{error}</p>
              <button
                className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 hover:shadow-md transition-all duration-200"
                onClick={() => navigate(-1)}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allFinalized = entries.length > 0 && entries.every((e) => e.scorecard_status === 'finalized');

  const maxCompleted = entries.length ? Math.max(...entries.map((e) => e.completed_rounds || 0)) : 0;
  const totalRounds = fight ? getEffectiveTotalRounds(fight) : 0;
  const currentRound = Math.min(maxCompleted + 1, Math.max(totalRounds, 1));
  const totalJudges = entries.length;
  const received = entries.filter((e) => e.scorecard_status === 'finalized').length;
  const pendingCards = totalJudges - received;
  const inProgress = entries.filter((e) => e.scorecard_status === 'draft').length;
  const cardsPct = totalJudges ? Math.round((received / totalJudges) * 100) : 0;
  const roundsPct = totalRounds ? Math.round((maxCompleted / totalRounds) * 100) : 0;
  const lastUpdate = entries.reduce((acc, e) => (e.submitted_at && e.submitted_at > acc ? e.submitted_at : acc), '');

  return (
    <div className="bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16 animate-[fadeIn_0.3s_ease-out]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-1">
          <BackButton />
        </div>

        <LiveHeader fight={fight} maxCompleted={maxCompleted} roundsPct={roundsPct} onRefresh={fetchData} />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out] flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={HashtagIcon} label="Round actual" value={currentRound} accent="amber" delay={0} />
          <StatCard icon={ChartBarIcon} label="Rounds completados" value={maxCompleted} suffix={totalRounds ? `/${totalRounds}` : ''} accent="emerald" delay={60} />
          <StatCard icon={DocumentCheckIcon} label="Tarjetas recibidas" value={received} accent="emerald" delay={120} />
          <StatCard icon={InboxIcon} label="Tarjetas pendientes" value={pendingCards} accent="amber" delay={180} />
          <StatCard icon={BoltIcon} label="Jueces en carga" value={inProgress} accent="blue" delay={240} />
          <StatCard icon={UserGroupIcon} label="Jueces designados" value={totalJudges} accent="red" delay={300} />
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <ScorecardsTable entries={entries} />
          </div>
          <aside className="hidden xl:block w-72 shrink-0">
            <SummaryCard
              received={received}
              pendingCards={pendingCards}
              cardsPct={cardsPct}
              roundsPct={roundsPct}
              maxCompleted={maxCompleted}
              totalRounds={totalRounds}
              lastUpdate={lastUpdate}
            />
          </aside>
        </div>

        {fight?.status === 'active' && (
          <div className="flex flex-col items-center gap-3">
            {allFinalized ? (
              <button
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-wbo-700 text-white rounded-xl text-base font-bold shadow-md hover:bg-wbo-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={completing}
                onClick={handleComplete}
              >
                {completing ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Finalizar pelea
                  </>
                )}
              </button>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-5 py-3 inline-flex items-center gap-2 shadow-sm">
                <ClockIcon className="w-4 h-4 shrink-0" />
                Esperando que todos los jueces finalicen sus tarjetas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveScore;
