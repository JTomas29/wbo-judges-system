import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightAnalysis } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';
import {
  CalendarIcon,
  MapPinIcon,
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  HashtagIcon,
  TrophyIcon,
  CheckBadgeIcon,
  ScaleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const pageWrapper =
  'bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16';

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const abbreviate = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const WinnerBadge = ({ winner }) => {
  if (winner === 'red') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/50 shadow-sm">
        <span className="w-2 h-2 rounded-sm bg-red-500" />
        Rojo
      </span>
    );
  }
  if (winner === 'blue') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800/50 shadow-sm">
        <span className="w-2 h-2 rounded-sm bg-blue-500" />
        Azul
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm">
      Empate
    </span>
  );
};

const LoadingState = () => (
  <div className={`${pageWrapper} flex items-center justify-center`}>
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-wbo-700 mx-auto" />
      <span className="block mt-4 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando análisis de la pelea...</span>
    </div>
  </div>
);

const ErrorState = ({ message, onBack }) => (
  <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md animate-[fadeIn_0.3s_ease-out]">
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
        <ExclamationTriangleIcon className="w-7 h-7 text-red-500 dark:text-red-400" />
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
  <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md animate-[fadeIn_0.3s_ease-out]">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-5">
        <ChartBarIcon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
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

const statAccents = {
  blue: { border: 'border-t-blue-500', chip: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400', value: 'text-blue-700 dark:text-blue-400' },
  violet: { border: 'border-t-violet-500', chip: 'bg-violet-50 dark:bg-violet-900/20', color: 'text-violet-600 dark:text-violet-400', value: 'text-violet-700 dark:text-violet-400' },
  emerald: { border: 'border-t-emerald-500', chip: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' },
  red: { border: 'border-t-red-500', chip: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-600 dark:text-red-400', value: 'text-red-700 dark:text-red-400' },
  gold: { border: 'border-t-gold', chip: 'bg-gold/10', color: 'text-gold dark:text-gold-light', value: 'text-gold dark:text-gold-light' },
  amber: { border: 'border-t-amber-500', chip: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-500', value: 'text-amber-600 dark:text-amber-500' },
};

const statItems = [
  { key: 'total_judges', label: 'Jueces analizados', icon: UserGroupIcon, accent: 'blue' },
  { key: 'total_rounds', label: 'Rounds analizados', icon: ChartBarIcon, accent: 'violet' },
  { key: 'rounds_ok', label: 'Rounds exactos', icon: CheckBadgeIcon, accent: 'emerald' },
  { key: 'rounds_error', label: 'Rounds con error', icon: ExclamationTriangleIcon, accent: 'red' },
  { key: 'fights_ok', label: 'Tarjetas perfectas', icon: TrophyIcon, accent: 'gold' },
  { key: 'fights_error', label: 'Tarjetas con error', icon: XCircleIcon, accent: 'amber' },
];

const StatCard = ({ icon: Icon, label, value, accent = 'slate', delay = 0 }) => {
  const a = statAccents[accent];
  return (
    <div
      className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-md p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 animate-[fadeIn_0.4s_ease-out] group`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-9 h-9 rounded-xl ${a.chip} flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110`}>
        <Icon className={`w-4.5 h-4.5 ${a.color}`} />
      </div>
      <p className={`text-2xl sm:text-3xl font-extrabold ${a.value} m-0 leading-none tabular-nums`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-[#64748B] uppercase tracking-wider mt-1.5 m-0">{label}</p>
    </div>
  );
};

const AnalysisHeader = ({ fight }) => {
  const infoItems = [
    { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight?.scheduled_date) },
    { icon: MapPinIcon, label: 'Lugar', value: fight?.venue || '\u2014' },
    { icon: BoltIcon, label: 'Categoría', value: fight?.weight_class || '\u2014' },
    { icon: HashtagIcon, label: 'Rounds', value: `${fight?.total_rounds ?? 0} rounds` },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      <div className="relative bg-gradient-to-r from-wbo-800 via-wbo-700 to-wbo-800 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <ChartBarIcon className="w-7 h-7 text-red-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-300 mb-1 m-0">Análisis de Pelea</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 leading-tight tracking-tight">
              {fight?.boxer_red} <span className="text-red-300 font-semibold">vs</span> {fight?.boxer_blue}
            </h1>
            <p className="text-sm text-red-100/90 mt-0.5 m-0">{fight?.event_name}</p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gold/15 text-gold-light ring-1 ring-gold/30">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-light" />
              Analizada
            </span>
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
    </div>
  );
};

const SectionCard = ({ Icon, title, description, children, delay = 0 }) => (
  <div
    className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden animate-[fadeIn_0.45s_ease-out]"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">{title}</h3>
        {description && <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

const RoundBadge = ({ roundNumber }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-wbo-50 dark:bg-wbo-900/20 text-wbo-700 dark:text-wbo-300 ring-1 ring-wbo-200/60 dark:ring-wbo-800/40">
    R{roundNumber}
  </span>
);

const OfficialCardTable = ({ fight, card }) => {
  const overallWinner =
    card.total_score_red > card.total_score_blue ? 'red' : card.total_score_blue > card.total_score_red ? 'blue' : 'draw';

  return (
    <SectionCard Icon={ClipboardDocumentCheckIcon} title="Resultado Oficial" description="Puntajes de la tarjeta oficial">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-wbo-700 to-wbo-800 text-white">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Round</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-red-200">{fight.boxer_red}</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-blue-200">{fight.boxer_blue}</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Ganador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
            {card.rounds.map((r, i) => (
              <tr key={r.round_number} className={`transition-colors duration-150 hover:bg-wbo-50/40 dark:hover:bg-[#1A2435] ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-[#0B1120]/40' : ''}`}>
                <td className="px-5 py-3"><RoundBadge roundNumber={r.round_number} /></td>
                <td className="px-5 py-3 text-center text-base font-extrabold text-red-700 dark:text-red-400 tabular-nums">{r.score_red}</td>
                <td className="px-5 py-3 text-center text-base font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{r.score_blue}</td>
                <td className="px-5 py-3 text-center"><WinnerBadge winner={r.winner} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50/80 dark:bg-amber-900/10 border-t-2 border-amber-200/60 dark:border-amber-800/30">
              <td className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Total</td>
              <td className="px-5 py-3.5 text-center text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tabular-nums">{card.total_score_red}</td>
              <td className="px-5 py-3.5 text-center text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tabular-nums">{card.total_score_blue}</td>
              <td className="px-5 py-3.5 text-center"><WinnerBadge winner={overallWinner} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
};

const CoincidenceBadge = ({ matchExact, matchWinner }) => {
  if (matchExact) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/50 shadow-sm">
        <CheckIcon className="w-3 h-3" />
        Exacto
      </span>
    );
  }
  if (matchWinner) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/50 shadow-sm">
        <ScaleIcon className="w-3 h-3" />
        Ganador
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/50 shadow-sm">
      <XCircleIcon className="w-3 h-3" />
      Error
    </span>
  );
};

const RoundComparisonCard = ({ round, judges, summary }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[#334155] transition-all duration-200 animate-[fadeIn_0.4s_ease-out] overflow-hidden">
    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/60 dark:bg-[#0B1120]/50 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <RoundBadge roundNumber={round.round_number} />
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-sm font-extrabold tabular-nums">{round.score_red}</span>
        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">–</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-sm font-extrabold tabular-nums">{round.score_blue}</span>
      </div>
      <WinnerBadge winner={round.winner} />
    </div>
    <div className="divide-y divide-slate-100 dark:divide-[#1E293B]">
      {judges.map((j) => {
        const jr = j.rounds.find((r) => r.round_number === round.round_number);
        if (!jr) return null;
        return (
          <div key={j.id} className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 hover:bg-wbo-50/30 dark:hover:bg-[#1A2435]/40 transition-colors duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                {initials(j.name)}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{abbreviate(j.name)}</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tabular-nums">
                <span className="text-red-600 dark:text-red-400">{jr.score_red}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-blue-600 dark:text-blue-400">{jr.score_blue}</span>
              </span>
              <CoincidenceBadge matchExact={jr.match_exact} matchWinner={jr.match_winner} />
            </div>
          </div>
        );
      })}
    </div>
    {summary && (
      <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 dark:border-[#1E293B] bg-slate-50/60 dark:bg-[#0B1120]/40 flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <CheckBadgeIcon className="w-3.5 h-3.5" />
          {summary.ok} exactos
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500 dark:text-red-400">
          <XCircleIcon className="w-3.5 h-3.5" />
          {summary.errors} errores
        </span>
        {summary.winner_ok !== undefined && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <ScaleIcon className="w-3.5 h-3.5" />
            {summary.winner_ok} mismo ganador
          </span>
        )}
      </div>
    )}
  </div>
);

const ProgressBar = ({ pct, gradient }) => (
  <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-700 ${gradient}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

const JudgePerformanceCard = ({ judge, index }) => {
  const perfect = judge.exact_errors === 0;
  return (
    <div
      className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-5 animate-[fadeIn_0.45s_ease-out]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-wbo-700 to-wbo-800 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
          {initials(judge.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate m-0">{judge.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-extrabold tabular-nums">{judge.total_score_red}</span>
            <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">–</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-extrabold tabular-nums">{judge.total_score_blue}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 shrink-0 ${
          perfect
            ? 'bg-gold/10 text-gold dark:text-gold-light ring-gold/30'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40'
        }`}>
          {perfect ? (
            <>
              <TrophyIcon className="w-3.5 h-3.5" />
              Perfecta
            </>
          ) : (
            <>
              <XCircleIcon className="w-3.5 h-3.5" />
              {judge.exact_errors} {judge.exact_errors === 1 ? 'error' : 'errores'}
            </>
          )}
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-500" />
              Precisión exacta
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{judge.exact_match_pct}%</span>
          </div>
          <ProgressBar pct={judge.exact_match_pct} gradient="bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1.5 m-0">
            {judge.exact_matches} de {judge.exact_matches + judge.exact_errors} rounds idénticos
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              <ScaleIcon className="w-3.5 h-3.5 text-blue-500" />
              Mismo ganador
            </span>
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{judge.winner_match_pct}%</span>
          </div>
          <ProgressBar pct={judge.winner_match_pct} gradient="bg-gradient-to-r from-blue-500 to-blue-600" />
          <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1.5 m-0">
            {judge.winner_matches} de {judge.winner_matches + judge.winner_errors} rounds con el mismo ganador
          </p>
        </div>
      </div>
    </div>
  );
};

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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onBack={() => navigate(-1)} />;
  if (!data?.fight) return <EmptyState onBack={() => navigate(-1)} />;

  const { fight, summary, official_card, judges, per_round_summary } = data;

  const visibleJudges =
    user?.role === 'judge'
      ? judges.filter((j) => j.id === user.judge_id)
      : judges;

  return (
    <div className={`${pageWrapper} animate-[fadeIn_0.3s_ease-out]`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-1">
          <BackButton fallbackRoute="/fights" />
        </div>

        <AnalysisHeader fight={fight} />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {statItems.map((s, i) => (
            <StatCard key={s.key} icon={s.icon} label={s.label} value={summary[s.key] ?? 0} accent={s.accent} delay={i * 60} />
          ))}
        </div>

        {official_card && (
          <OfficialCardTable fight={fight} card={official_card} />
        )}

        {official_card && visibleJudges.length > 0 && (
          <SectionCard Icon={ScaleIcon} title="Comparación por Round" description="Tarjeta oficial vs cada juez, round por round">
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {official_card.rounds.map((r) => {
                const pr = per_round_summary.find((p) => p.round_number === r.round_number);
                return <RoundComparisonCard key={r.round_number} round={r} judges={visibleJudges} summary={pr} />;
              })}
            </div>
          </SectionCard>
        )}

        {visibleJudges.length > 0 && (
          <SectionCard Icon={ArrowTrendingUpIcon} title="Desempeño de los Jueces" description="Precisión y coincidencia de cada tarjeta">
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleJudges.map((j, i) => (
                <JudgePerformanceCard key={j.id} judge={j} index={i} />
              ))}
            </div>
          </SectionCard>
        )}

        {visibleJudges.length === 0 && (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-12 text-center animate-[fadeIn_0.3s_ease-out]">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <UserGroupIcon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm m-0">No hay análisis disponible para los jueces de esta pelea.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FightAnalysis;
