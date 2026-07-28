import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightAnalysis } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const abbreviate = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const Skeleton = () => (
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-7 animate-fadeIn">
    <div className="space-y-3">
      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      <div className="h-9 w-72 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      <div className="h-5 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
      ))}
    </div>
    <div className="h-52 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
  </div>
);

const ErrorState = ({ message, onBack }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg px-10 py-12 text-center max-w-md w-full mx-4">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-slate-800 dark:text-[#F8FAFC] font-semibold text-base leading-relaxed m-0">{message}</p>
      <button
        onClick={onBack}
        className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
      >
        Volver
      </button>
    </div>
  </div>
);

const EmptyState = ({ onBack }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg px-10 py-12 text-center max-w-md w-full mx-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4l2.25-2.25m0 0l2.25-2.25M12 13.5V3.75m0 0l2.25 2.25M12 3.75L9.75 6" />
        </svg>
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm m-0">No existen resultados para esta pelea.</p>
      <button
        onClick={onBack}
        className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
      >
        Volver
      </button>
    </div>
  </div>
);

const statConfig = {
  total_judges: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    ring: 'ring-blue-100 dark:ring-blue-800/40',
  },
  total_rounds: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    ring: 'ring-violet-100 dark:ring-violet-800/40',
  },
  rounds_ok: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    ring: 'ring-emerald-100 dark:ring-emerald-800/40',
  },
  rounds_error: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    ring: 'ring-red-100 dark:ring-red-800/40',
  },
  fights_ok: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.123-1.97.346-2.916.654a10.03 10.03 0 00-.723.779 6.48 6.48 0 01-.758-1.194 6.48 6.48 0 01-.384-2.456c0-.384.033-.76.097-1.13M12 10.5a3 3 0 11-6 0 3 3 0 016 0zm0 0v1.5m0-1.5c0 .621-.504 1.125-1.125 1.125H4.875c-.621 0-1.125-.504-1.125-1.125m11.25 0c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-5.25c-.621 0-1.125-.504-1.125-1.125v-5.25c0-.621.504-1.125 1.125-1.125" />
      </svg>
    ),
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    ring: 'ring-emerald-100 dark:ring-emerald-800/40',
  },
  fights_error: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    ring: 'ring-amber-100 dark:ring-amber-800/40',
  },
};

const statKeys = ['total_judges', 'total_rounds', 'rounds_ok', 'rounds_error', 'fights_ok', 'fights_error'];

const StatCard = ({ statKey, value }) => {
  const cfg = statConfig[statKey];
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
      <div className={`w-10 h-10 rounded-xl ${cfg.bg} ring-1 ${cfg.ring} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}>
        <span className={cfg.color}>{cfg.icon}</span>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-none m-0 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5 m-0">{statConfig[statKey].label}</p>
    </div>
  );
};

statConfig.total_judges.label = 'Jueces';
statConfig.total_rounds.label = 'Rounds';
statConfig.rounds_ok.label = 'Rounds OK';
statConfig.rounds_error.label = 'Rounds Error';
statConfig.fights_ok.label = 'Peleas OK';
statConfig.fights_error.label = 'Con Error';

const WinnerBadge = ({ winner }) => {
  if (winner === 'red') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Rojo
      </span>
    );
  }
  if (winner === 'blue') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Azul
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600">
      Empate
    </span>
  );
};

const EvaluationMatrix = ({
  title,
  subtitle,
  judges,
  perRoundSummary,
  summary,
  matchField,
  errorField,
  okField,
  judgeTotalErrors,
  judgeTotalOk,
  totalLabel,
  renderJudgeTotal,
}) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
    <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E293B]">
      <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] m-0">{title}</h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">{subtitle}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[500px]">
        <thead>
          <tr className="bg-wbo-700 text-white">
            <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider first:rounded-tl-2xl">#</th>
            {judges.map((j) => (
              <th key={j.id} className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider">
                {abbreviate(j.name)}
              </th>
            ))}
            <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-red-200">Errores</th>
            <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-200 last:rounded-tr-2xl">OK</th>
          </tr>
        </thead>
        <tbody>
          {perRoundSummary.map((pr, idx) => (
            <tr
              key={pr.round_number}
              className={`border-b border-slate-100 dark:border-[#1E293B] last:border-0 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                idx % 2 === 0 ? 'bg-white dark:bg-[#111827]' : 'bg-slate-50/50 dark:bg-[#0B1120]'
              }`}
            >
              <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300 tabular-nums text-xs">
                R{pr.round_number}
              </td>
              {judges.map((j) => {
                const jr = j.rounds.find((r) => r.round_number === pr.round_number);
                const matched = jr?.[matchField];
                return (
                  <td key={j.id} className="py-3 px-4 text-center">
                    {matched ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/50">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/50">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        ERROR
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="py-3 px-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-bold tabular-nums ring-1 ${
                  pr[errorField] > 0
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800/50'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/50'
                }`}>
                  {pr[errorField]}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-bold tabular-nums ring-1 ${
                  pr[okField] === summary.total_judges
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/50'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800/50'
                }`}>
                  {pr[okField]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-[#1E293B]">
            <td className="py-3.5 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 first:rounded-bl-2xl">
              {totalLabel}
            </td>
            {judges.map((j) => (
              <td key={j.id} className="py-3.5 px-4 text-center text-sm font-bold text-slate-800 dark:text-[#F8FAFC] tabular-nums">
                {renderJudgeTotal(j)}
              </td>
            ))}
            <td className="py-3.5 px-4 text-center text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
              {judges.reduce((sum, j) => sum + (j[judgeTotalErrors] ?? 0), 0)}
            </td>
            <td className="py-3.5 px-4 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums last:rounded-br-2xl">
              {judges.reduce((sum, j) => sum + (j[judgeTotalOk] ?? 0), 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const FightAnalysis = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getFightAnalysis(fightId, token);
        if (cancelled) return;
        setData(res.data);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (status === 400 && msg) setError(msg);
        else if (status === 403 && msg) setError(msg);
        else setError(msg || 'Error al cargar el análisis');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fightId, token, user]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onBack={() => navigate(-1)} />;
  if (!data?.fight) return <EmptyState onBack={() => navigate(-1)} />;

  const { fight, summary, official_card, judges, per_round_summary } = data;

  const visibleJudges =
    user?.role === 'judge'
      ? judges.filter((j) => j.id === user.judge_id)
      : judges;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-8 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Header ── */}
      <div className="space-y-4">
        <BackButton fallbackRoute="/fights" />
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 md:p-6 transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight m-0 leading-tight">
                {fight.event_name}
              </h1>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1.5 m-0">
                {fight.boxer_red} <span className="text-slate-400 dark:text-slate-500 font-normal">vs</span> {fight.boxer_blue}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {formatDate(fight.scheduled_date)}
                </span>
                {fight.weight_class && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    {fight.weight_class}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  {fight.total_rounds} rounds
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800/50 shrink-0 self-start">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Analizada
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 1: Summary Stats ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 m-0">Resumen del análisis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {statKeys.map((key) => (
            <StatCard key={key} statKey={key} value={summary[key]} />
          ))}
        </div>
      </div>

      {/* ── Section 2: Official Card ── */}
      {official_card && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 m-0">Resultado oficial</h2>
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E293B] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-wbo-700/10 dark:bg-wbo-700/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] m-0">Tarjeta Oficial</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[360px]">
                <thead>
                  <tr className="bg-wbo-700 text-white">
                    <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider first:rounded-tl-2xl">#</th>
                    <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-300" />Rojo</span>
                    </th>
                    <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300" />Azul</span>
                    </th>
                    <th className="py-3 px-4 text-center text-[11px] font-bold uppercase tracking-wider last:rounded-tr-2xl">Ganador</th>
                  </tr>
                </thead>
                <tbody>
                  {official_card.rounds?.map((r, idx) => (
                    <tr
                      key={r.round_number}
                      className={`border-b border-slate-100 dark:border-[#1E293B] last:border-0 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        idx % 2 === 0 ? 'bg-white dark:bg-[#111827]' : 'bg-slate-50/50 dark:bg-[#0B1120]'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                        R{r.round_number}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-[#F8FAFC] tabular-nums text-base">
                        {r.score_red}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-[#F8FAFC] tabular-nums text-base">
                        {r.score_blue}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <WinnerBadge winner={r.winner} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-[#1E293B]">
                    <td className="py-4 px-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 first:rounded-bl-2xl">
                      TOTAL
                    </td>
                    <td className="py-4 px-4 text-center text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tabular-nums">
                      {official_card.total_score_red}
                    </td>
                    <td className="py-4 px-4 text-center text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tabular-nums">
                      {official_card.total_score_blue}
                    </td>
                    <td className="py-4 px-4 text-center last:rounded-br-2xl">
                      {official_card.total_score_red > official_card.total_score_blue ? (
                        <WinnerBadge winner="red" />
                      ) : official_card.total_score_blue > official_card.total_score_red ? (
                        <WinnerBadge winner="blue" />
                      ) : (
                        <WinnerBadge winner="draw" />
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Matrix match_exact ── */}
      {visibleJudges?.length > 0 && per_round_summary?.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 m-0">Evaluación</h2>
          <EvaluationMatrix
            title="Matriz de Evaluación"
            subtitle="Coincidencia exacta de puntajes por juez y round"
            judges={visibleJudges}
            perRoundSummary={per_round_summary}
            summary={summary}
            matchField="match_exact"
            errorField="errors"
            okField="ok"
            judgeTotalErrors="exact_errors"
            judgeTotalOk="exact_matches"
            totalLabel="TOTAL"
            renderJudgeTotal={(j) => `${j.total_score_red}-${j.total_score_blue}`}
          />
        </div>
      )}

      {/* ── Section 4: Matrix match_winner ── */}
      {visibleJudges?.length > 0 && per_round_summary?.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 m-0">Mismo Ganador</h2>
          <EvaluationMatrix
            title="Mismo Ganador"
            subtitle="Coincidencia del ganador por juez y round"
            judges={visibleJudges}
            perRoundSummary={per_round_summary}
            summary={summary}
            matchField="match_winner"
            errorField="winner_errors"
            okField="winner_ok"
            judgeTotalErrors="winner_errors"
            judgeTotalOk="winner_matches"
            totalLabel="TOTAL ROUNDS MISMO GANADOR"
            renderJudgeTotal={(j) => j.winner_matches ?? 0}
          />
        </div>
      )}

      {visibleJudges?.length === 0 && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4l2.25-2.25m0 0l2.25-2.25M12 13.5V3.75m0 0l2.25 2.25M12 3.75L9.75 6" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm m-0">No hay análisis disponible para los jueces de esta pelea.</p>
        </div>
      )}
    </div>
  );
};

export default FightAnalysis;
