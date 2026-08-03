import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById } from '../../services/fightService';
import { getMyScorecard, createScorecard, saveRound, finalizeScorecard } from '../../services/scoringService';
import { getEffectiveTotalRounds, isEarlyResult, RESULT_TYPE_LABELS } from '../../utils/fightResult';
import BackButton from '../../components/common/BackButton';
import { PageActionButton } from '../../components/detail/PageActions';
import { ConfirmModal } from '../../components/common/modals';
import DeductionSelect from '../../components/common/DeductionSelect';
import { CalendarIcon, MapPinIcon, UserGroupIcon, CheckBadgeIcon, BoltIcon, CheckIcon, ChatBubbleOvalLeftIcon, ChartBarIcon, ClockIcon, ExclamationTriangleIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const roundFromServer = (rs) => ({
  score_red: rs.score_red,
  score_blue: rs.score_blue,
  deduction_red: Number(rs.deduction_red || 0),
  deduction_blue: Number(rs.deduction_blue || 0),
  final_score_red: rs.final_score_red,
  final_score_blue: rs.final_score_blue,
  notes: rs.notes || '',
});

// Puntaje final del round considerando el descuento (se muestra en vivo en la carga)
const computeFinal = (score, deduction) =>
  score != null && score !== '' ? Number(score) - Number(deduction || 0) : null;

const inputRedBase = "w-full px-3 py-3 text-center rounded-xl text-lg font-extrabold text-red-700 dark:text-red-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-red-300 dark:hover:border-red-900/60 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 focus:shadow-md disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:opacity-70";

const inputBlueBase = "w-full px-3 py-3 text-center rounded-xl text-lg font-extrabold text-blue-700 dark:text-blue-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-900/60 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:shadow-md disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:opacity-70";

const notesInputBase = "w-full px-4 py-3.5 rounded-xl text-sm text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-wbo-700 focus:ring-4 focus:ring-wbo-700/10 focus:shadow-md disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:opacity-70";

const SuccessHero = ({ submittedAt }) => (
  <div className="bg-gradient-to-br from-white via-white to-wbo-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-wbo-700 shadow-lg p-8 sm:p-10 text-center animate-[fadeIn_0.4s_ease-out]">
    <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5 animate-[scaleIn_0.5s_ease-out] shadow-md">
      <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-3 m-0 tracking-tight">Tarjeta enviada correctamente</h2>
    <p className="text-base text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto mb-6 m-0">
      La puntuación fue registrada exitosamente y ya no puede modificarse.
    </p>
    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 border border-wbo-200/60 dark:border-wbo-800/30 text-sm font-semibold text-wbo-800 dark:text-wbo-300 shadow-sm">
      <svg className="w-4 h-4 text-wbo-600 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Enviada el {submittedAt}
    </div>
  </div>
);

const accentMap = {
  red: { border: 'border-t-red-500', iconBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-700 dark:text-red-400', valueColor: 'text-red-700 dark:text-red-400', hoverRing: 'hover:ring-red-200/50' },
  blue: { border: 'border-t-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-400', hoverRing: 'hover:ring-blue-200/50' },
  amber: { border: 'border-t-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-700 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-400', hoverRing: 'hover:ring-amber-200/50' },
  emerald: { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-700 dark:text-emerald-400', valueColor: 'text-emerald-700 dark:text-emerald-400', hoverRing: 'hover:ring-emerald-200/50' },
};

const ResultCard = ({ label, value, icon, accent = 'red' }) => {
  const a = accentMap[accent];
  return (
    <div className={`bg-gradient-to-br from-white to-slate-50/60 dark:from-[#111827] dark:to-[#141d2f] rounded-2xl border border-slate-100 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-sm p-5 sm:p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
      <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center mx-auto mb-3 transition-transform duration-200 group-hover:scale-110`}>
        <svg className={`w-5 h-5 ${a.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <p className={`text-3xl sm:text-4xl font-extrabold ${a.valueColor} mb-0.5 m-0`}>{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-[#64748B] uppercase tracking-wider m-0">{label}</p>
    </div>
  );
};

const FightSummaryCard = ({ fight, scoreCard, roleLabel }) => {
  const infoItems = [
    { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight.scheduled_date) },
    { icon: MapPinIcon, label: 'Lugar', value: fight.venue || '\u2014' },
    { icon: UserGroupIcon, label: 'Rol', value: roleLabel },
    { icon: CheckBadgeIcon, label: 'Estado', value: 'Finalizada' },
  ];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-[#111827] dark:to-[#141d2f] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md p-6 sm:p-8 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-[#1E293B]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Resumen del Combate</h3>
          <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Detalles de la pelea</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {infoItems.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-100 dark:border-[#1E293B] transition-all duration-200 hover:shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 flex items-center justify-center shrink-0">
              <item.icon className="w-4.5 h-4.5 text-wbo-700 dark:text-wbo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-0.5 m-0">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate m-0">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoundBadge = ({ roundNumber }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-wbo-50 dark:bg-wbo-900/20 text-wbo-700 dark:text-wbo-300 ring-1 ring-wbo-200/60 dark:ring-wbo-800/40">
    R{roundNumber}
  </span>
);

const RoundsTable = ({ fight, roundData, totalRounds }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden animate-[fadeIn_0.55s_ease-out]">
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B]">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Puntuación por Round</h3>
        <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Detalle de cada asalto</p>
      </div>
    </div>
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-wbo-700 text-white">
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Round</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-red-200">{fight.boxer_red}</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-blue-200">{fight.boxer_blue}</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
          {Array.from({ length: totalRounds }, (_, i) => {
            const rn = i + 1;
            const data = roundData[rn] || {};
            return (
              <tr key={rn} className={`transition-colors duration-150 hover:bg-wbo-50/40 dark:hover:bg-[#1A2435] ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-[#0B1120]/40' : ''}`}>
                <td className="px-5 py-3.5"><RoundBadge roundNumber={rn} /></td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-base font-extrabold text-red-700 dark:text-red-400 tabular-nums">{data.final_score_red ?? '\u2014'}</span>
                  {data.deduction_red > 0 && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[9px] font-bold align-middle">-{data.deduction_red}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-base font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{data.final_score_blue ?? '\u2014'}</span>
                  {data.deduction_blue > 0 && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-bold align-middle">-{data.deduction_blue}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-500 dark:text-[#64748B] text-xs italic max-w-[220px] truncate">{data.notes || '\u2014'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const DraftRoundBadge = ({ roundNumber }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-wbo-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-2.5 0-4.5 2-4.5 4.5V9H6a2 2 0 00-2 2v4a2 2 0 002 2h1.5v3h9v-3H18a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5V6.5C16.5 4 14.5 2 12 2z" />
    </svg>
    Round {roundNumber}
  </span>
);

const DraftHeader = ({ fight, allComplete }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
    <div className="relative bg-gradient-to-r from-wbo-800 via-wbo-700 to-wbo-800 px-6 py-6 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-inner">
          <svg className="w-7 h-7 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-2.5 0-4.5 2-4.5 4.5V9H6a2 2 0 00-2 2v4a2 2 0 002 2h1.5v3h9v-3H18a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5V6.5C16.5 4 14.5 2 12 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-300 mb-1 m-0">Tarjeta de Puntuación</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 leading-tight tracking-tight">
            {fight.boxer_red} <span className="text-red-300 font-semibold">vs</span> {fight.boxer_blue}
          </h1>
          <p className="text-sm text-red-100/90 mt-0.5 m-0">{fight.event_name}</p>
        </div>
        <div className="ml-auto shrink-0 hidden sm:block">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ring-1 ${
            allComplete
              ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30'
              : 'bg-amber-500/15 text-amber-200 ring-amber-400/30'
          }`}>
            {allComplete ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
            {allComplete ? 'Lista para enviar' : 'En carga'}
          </span>
        </div>
      </div>
    </div>
    <div className="px-6 py-4 sm:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-[#0B1120] border-t border-slate-100 dark:border-[#1E293B]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm">
          <CalendarIcon className="w-4 h-4 text-wbo-700 dark:text-wbo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Fecha</p>
          <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] truncate m-0">{formatDate(fight.scheduled_date)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-4 h-4 text-gold dark:text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Categoría</p>
          <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] truncate m-0">{fight.weight_class || '\u2014'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm">
          <BoltIcon className="w-4 h-4 text-wbo-700 dark:text-wbo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Rounds</p>
          <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] m-0">{getEffectiveTotalRounds(fight)} rounds</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${
          allComplete
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
        }`}>
          {allComplete ? <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Tarjeta</p>
          <p className={`text-sm font-bold m-0 truncate ${allComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {allComplete ? 'Lista para enviar' : 'En carga'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ProgressCard = ({ completedRounds, totalRounds, progressPct, allComplete }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md p-5 sm:p-6 animate-[fadeIn_0.35s_ease-out]">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
          <BoltIcon className="w-5 h-5 text-wbo-700 dark:text-wbo-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Progreso de la carga</h3>
          <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">
            {allComplete ? '¡Todos los rounds cargados!' : `${completedRounds} de ${totalRounds} rounds cargados`}
          </p>
        </div>
      </div>
      <span className="text-2xl font-extrabold text-wbo-700 dark:text-wbo-400 tabular-nums shrink-0">{progressPct}%</span>
    </div>
    <div className="w-full h-3.5 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-wbo-600 to-wbo-700'}`}
        style={{ width: `${progressPct}%` }}
      />
    </div>
    <p className={`text-xs font-semibold mt-2.5 m-0 flex items-center gap-1.5 ${allComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
      {allComplete ? (
        <>
          <CheckIcon className="w-4 h-4 shrink-0" />
          Tarjeta lista para enviar
        </>
      ) : (
        <>
          {progressPct}% completado
          {totalRounds - completedRounds > 0 && <> · {totalRounds - completedRounds} {totalRounds - completedRounds === 1 ? 'round pendiente' : 'rounds pendientes'}</>}
        </>
      )}
    </p>
  </div>
);

const SummarySidebar = ({ completedRounds, totalRounds, allComplete }) => {
  const items = [
    { label: 'Rounds completados', value: `${completedRounds} / ${totalRounds}`, strong: true },
    { label: 'Total cargados', value: `${totalRounds} rounds` },
    { label: 'Pendientes', value: `${totalRounds - completedRounds} ${totalRounds - completedRounds === 1 ? 'round' : 'rounds'}` },
  ];
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md overflow-hidden sticky top-6">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
          <ChartBarIcon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Resumen</h3>
      </div>
      <div className="p-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-0.5 m-0">{item.label}</p>
            <p className={`text-base font-extrabold m-0 ${item.strong ? 'text-slate-900 dark:text-[#F8FAFC]' : 'text-slate-600 dark:text-[#94A3B8]'}`}>{item.value}</p>
          </div>
        ))}
        <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-1.5 m-0">Estado</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${
            allComplete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40'
          }`}>
            {allComplete ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
            {allComplete ? 'Lista para enviar' : 'En carga'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ActionButtons = ({ navigate }) => (
  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[fadeIn_0.6s_ease-out]">
    <button
      onClick={() => navigate('/dashboard')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      Volver al Dashboard
    </button>
    <button
      onClick={() => navigate('/judges/assignments')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1F2937] border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:border-red-200 dark:hover:border-red-800/40 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Mis Designaciones
    </button>
  </div>
);

const ScoreFight = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [scoreCard, setScoreCard] = useState(null);
  const [roundData, setRoundData] = useState({});
  const [roundErrors, setRoundErrors] = useState({});
  const [savingRound, setSavingRound] = useState(null);
  const [justSavedRound, setJustSavedRound] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restriction, setRestriction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const totalRounds = fight ? getEffectiveTotalRounds(fight) : 0;
  const earlyEnded = fight ? isEarlyResult(fight) : false;
  const isFinalized = scoreCard?.status === 'finalized';

  const completedRounds = Object.keys(roundData).filter(
    (r) => roundData[r]?.score_red >= 1 && roundData[r]?.score_blue >= 1
      && (roundData[r]?.score_red - (roundData[r]?.deduction_red || 0)) >= 1
      && (roundData[r]?.score_blue - (roundData[r]?.deduction_blue || 0)) >= 1
  ).length;
  const allComplete = completedRounds >= totalRounds && totalRounds > 0;
  const progressPct = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0;

  const timersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setRestriction(null);

        const fightRes = await getFightById(fightId, token);
        if (cancelled) return;
        const f = fightRes.data;
        setFight(f);

        if (user.role !== 'judge') {
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        let myRes;
        try {
          myRes = await getMyScorecard(fightId, token);
        } catch (err) {
          if (cancelled) return;
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        if (cancelled) return;

        if (myRes.data.score_card && myRes.data.score_card.status === 'finalized') {
          setScoreCard(myRes.data.score_card);
          const rd = {};
          myRes.data.round_scores.forEach((rs) => {
            rd[rs.round_number] = roundFromServer(rs);
          });
          setRoundData(rd);
          setLoading(false);
          return;
        }

        if (!isEarlyResult(f) && f.status !== 'active') {
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        if (!myRes.data.score_card) {
          const createRes = await createScorecard(fightId, token);
          if (cancelled) return;
          setScoreCard(createRes.data.score_card);
          setRoundData({});
        } else {
          setScoreCard(myRes.data.score_card);
          const rd = {};
          myRes.data.round_scores.forEach((rs) => {
            rd[rs.round_number] = roundFromServer(rs);
          });
          setRoundData(rd);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err.response?.data?.message || 'Error al cargar la tarjeta';
        setRestriction(msg);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [fightId, token, user]);

  const updateRound = useCallback((roundNum, field, value) => {
    if (isFinalized) return;
    setRoundData((prev) => {
      const current = prev[roundNum] || { score_red: null, score_blue: null, notes: '' };
      return { ...prev, [roundNum]: { ...current, [field]: value } };
    });
    setRoundErrors((prev) => {
      const next = { ...prev };
      delete next[roundNum];
      return next;
    });
  }, [isFinalized]);

  const handleBlur = useCallback(async (roundNum) => {
    if (isFinalized) return;
    const data = roundData[roundNum];
    if (!data || data.score_red == null || data.score_blue == null) return;

    const sRed = Number(data.score_red);
    const sBlue = Number(data.score_blue);

    if (sRed < 1 || sRed > 10) {
      setRoundErrors((prev) => ({ ...prev, [roundNum]: 'score_red debe estar entre 1 y 10' }));
      return;
    }
    if (sBlue < 1 || sBlue > 10) {
      setRoundErrors((prev) => ({ ...prev, [roundNum]: 'score_blue debe estar entre 1 y 10' }));
      return;
    }

    setSavingRound(roundNum);
    try {
      await saveRound(scoreCard.id, { round_number: roundNum, ...data }, token);
      setJustSavedRound(roundNum);
      if (timersRef.current[roundNum]) clearTimeout(timersRef.current[roundNum]);
      timersRef.current[roundNum] = setTimeout(() => {
        setJustSavedRound((prev) => (prev === roundNum ? null : prev));
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar';
      if (msg.includes('finalizada')) {
        setError('La tarjeta ya fue enviada y no puede modificarse.');
      } else {
        setRoundErrors((prev) => ({ ...prev, [roundNum]: msg }));
      }
    } finally {
      setSavingRound((prev) => (prev === roundNum ? null : prev));
    }
  }, [roundData, scoreCard, token, isFinalized]);

  const handleDeductionChange = useCallback(async (roundNum, field, value) => {
    if (isFinalized) return;
    const data = roundData[roundNum] || { score_red: null, score_blue: null, notes: '' };
    const next = { ...data, [field]: Number(value) };

    const sRed = next.score_red != null && next.score_red !== '' ? Number(next.score_red) : null;
    const sBlue = next.score_blue != null && next.score_blue !== '' ? Number(next.score_blue) : null;

    if (
      (sRed != null && sRed - next.deduction_red < 1) ||
      (sBlue != null && sBlue - next.deduction_blue < 1)
    ) {
      setRoundErrors((prev) => ({
        ...prev,
        [roundNum]: 'El descuento no puede dejar un puntaje por debajo de 1',
      }));
      return;
    }

    setRoundData((prev) => ({ ...prev, [roundNum]: next }));
    setRoundErrors((prev) => {
      const n = { ...prev };
      delete n[roundNum];
      return n;
    });

    if (sRed == null || sBlue == null || sRed < 1 || sRed > 10 || sBlue < 1 || sBlue > 10) return;

    setSavingRound(roundNum);
    try {
      await saveRound(scoreCard.id, { round_number: roundNum, ...next }, token);
      setJustSavedRound(roundNum);
      if (timersRef.current[roundNum]) clearTimeout(timersRef.current[roundNum]);
      timersRef.current[roundNum] = setTimeout(() => {
        setJustSavedRound((prev) => (prev === roundNum ? null : prev));
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar';
      setRoundErrors((prev) => ({ ...prev, [roundNum]: msg }));
    } finally {
      setSavingRound((prev) => (prev === roundNum ? null : prev));
    }
  }, [roundData, scoreCard, token, isFinalized]);

  const handleFinalize = async () => {
    setFinalizing(true);
    setError(null);
    try {
      const res = await finalizeScorecard(scoreCard.id, token);
      setScoreCard(res.data.scorecard);
      setShowConfirmModal(false);
      navigate(`/scoring/${fightId}`, {
        state: { toast: { type: 'success', message: 'Tu tarjeta fue enviada correctamente y quedó lista para su revisión.' } },
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar la tarjeta');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-wbo-700 mx-auto" />
          <span className="ml-3 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando tarjeta...</span>
        </div>
      </div>
    );
  }

  if (restriction) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-6 text-center">
          <p className="text-amber-800 dark:text-amber-300 font-medium m-0">{restriction}</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-lg text-sm font-semibold hover:bg-wbo-800 transition-colors"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!fight || !scoreCard) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-slate-400 dark:text-[#64748B] py-10 text-center m-0">No se pudo cargar la información de la pelea.</p>
      </div>
    );
  }

  const roleLabel = user?.role === 'judge' ? 'Juez' : user?.role || '\u2014';
  const diff = scoreCard?.total_score_red != null && scoreCard?.total_score_blue != null
    ? Math.abs(scoreCard.total_score_red - scoreCard.total_score_blue)
    : '\u2014';

  if (isFinalized) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 space-y-8 md:space-y-10 animate-[fadeIn_0.3s_ease-out]">

        {/* ── Fight Header Card ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 sm:p-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 leading-tight tracking-tight">
                {fight.event_name}
              </h1>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 m-0">
                {fight.boxer_red} <span className="text-slate-400 dark:text-slate-500 font-normal">vs</span> {fight.boxer_blue}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800/50 shrink-0 self-start sm:self-center">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Finalizada
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Fecha:</span> {formatDate(fight.scheduled_date)}
              </span>
            </div>
            {fight.weight_class && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Categoría:</span> {fight.weight_class}
                </span>
              </div>
            )}
            {fight.venue && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Lugar:</span> {fight.venue}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        {earlyEnded && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 m-0">
                Pelea finalizada por {RESULT_TYPE_LABELS[fight.result_type] || fight.result_type} en el round {fight.result_round}.
              </p>
              <p className="text-xs text-red-600/90 dark:text-red-400/90 m-0 mt-0.5">
                Tarjeta puntuada sobre los {totalRounds} rounds efectivamente disputados.
              </p>
            </div>
          </div>
        )}

        <SuccessHero submittedAt={formatDateTime(scoreCard.submitted_at)} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-[fadeIn_0.5s_ease-out]">
          <ResultCard
            label="Total Rojo"
            value={scoreCard.total_score_red}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            accent="red"
          />
          <ResultCard
            label="Total Azul"
            value={scoreCard.total_score_blue}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            accent="blue"
          />
          <ResultCard
            label="Ganador"
            value={scoreCard.winner || 'Empate'}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            accent="amber"
          />
          <ResultCard
            label="Diferencia"
            value={diff === '\u2014' ? diff : `${diff} pts`}
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            accent="emerald"
          />
        </div>

        <div className="animate-[fadeIn_0.6s_ease-out]">
          <RoundsTable fight={fight} roundData={roundData} totalRounds={totalRounds} />
        </div>

        <div className="animate-[fadeIn_0.6s_ease-out]">
          <FightSummaryCard fight={fight} scoreCard={scoreCard} roleLabel={roleLabel} />
        </div>

        <ActionButtons navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16 animate-[fadeIn_0.4s_ease-out]">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="mb-1">
          <BackButton fallbackRoute="/scoring/live" />
        </div>

        <DraftHeader fight={fight} allComplete={allComplete} />

        {earlyEnded && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 m-0">
                La pelea finalizó por {RESULT_TYPE_LABELS[fight.result_type] || fight.result_type} en el round {fight.result_round}.
              </p>
              <p className="text-xs text-red-600/90 dark:text-red-400/90 m-0 mt-0.5">
                Solo se puntúan los rounds efectivamente disputados (hasta el round {totalRounds}). Los rounds posteriores están bloqueados.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-6">

            <ProgressCard
              completedRounds={completedRounds}
              totalRounds={totalRounds}
              progressPct={progressPct}
              allComplete={allComplete}
            />

            {/* ── Puntuación por Round ── */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden animate-[fadeIn_0.4s_ease-out]">
              <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Puntuación por Round</h3>
                  <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Completá la puntuación de cada boxeador</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {Array.from({ length: totalRounds }, (_, i) => {
                  const rn = i + 1;
                  const data = roundData[rn] || {};
                  const saving = savingRound === rn;
                  const saved = justSavedRound === rn;
                  const err = roundErrors[rn];

                  return (
                    <div
                      key={rn}
                      className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[#334155] transition-all duration-200 animate-[fadeIn_0.4s_ease-out]"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#1E293B] rounded-t-2xl bg-slate-50/60 dark:bg-[#0B1120]/50 flex flex-wrap items-center justify-between gap-2">
                        <DraftRoundBadge roundNumber={rn} />
                        <div className="flex items-center gap-3 text-xs">
                          {saving && (
                            <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-medium">
                              <span className="animate-spin h-3 w-3 border-2 border-slate-300 dark:border-slate-600 border-t-slate-500 dark:border-t-slate-300 rounded-full" />
                              Guardando...
                            </span>
                          )}
                          {saved && (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                              <CheckIcon className="w-3.5 h-3.5" />
                              Guardado
                            </span>
                          )}
                          {err && (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold" title={err}>
                              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 grid grid-cols-2 xl:grid-cols-[1fr_1fr_1.6fr] gap-4">
                        <div>
                          <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-[10px] font-bold uppercase tracking-wide">Rojo</span>
                            <span className="truncate">{fight.boxer_red}</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={data.score_red ?? ''}
                            onChange={(e) => updateRound(rn, 'score_red', e.target.value === '' ? null : Number(e.target.value))}
                            onBlur={() => handleBlur(rn)}
                            disabled={isFinalized}
                            placeholder="10"
                            className={inputRedBase}
                          />
                          <div className="mt-2.5 block">
                            <span id={`ded-red-label-${rn}`} className="block text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] mb-1 leading-snug">Descuento (puntos)</span>
                            <DeductionSelect
                              value={data.deduction_red ?? 0}
                              onChange={(v) => handleDeductionChange(rn, 'deduction_red', v)}
                              disabled={isFinalized}
                              labelId={`ded-red-label-${rn}`}
                              listboxLabel={`Descuento (puntos) del boxeador rojo (${fight.boxer_red})`}
                            />
                          </div>
                          <p className={`mt-1 text-[11px] font-bold tabular-nums m-0 ${data.deduction_red > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-[#64748B]'}`}>
                            Final: {computeFinal(data.score_red, data.deduction_red) ?? '\u2014'}
                            {data.deduction_red > 0 && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[9px] font-bold align-middle">-{data.deduction_red}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-[10px] font-bold uppercase tracking-wide">Azul</span>
                            <span className="truncate">{fight.boxer_blue}</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={data.score_blue ?? ''}
                            onChange={(e) => updateRound(rn, 'score_blue', e.target.value === '' ? null : Number(e.target.value))}
                            onBlur={() => handleBlur(rn)}
                            disabled={isFinalized}
                            placeholder="10"
                            className={inputBlueBase}
                          />
                          <div className="mt-2.5 block">
                            <span id={`ded-blue-label-${rn}`} className="block text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] mb-1 leading-snug">Descuento (puntos)</span>
                            <DeductionSelect
                              value={data.deduction_blue ?? 0}
                              onChange={(v) => handleDeductionChange(rn, 'deduction_blue', v)}
                              disabled={isFinalized}
                              labelId={`ded-blue-label-${rn}`}
                              listboxLabel={`Descuento (puntos) del boxeador azul (${fight.boxer_blue})`}
                            />
                          </div>
                          <p className={`mt-1 text-[11px] font-bold tabular-nums m-0 ${data.deduction_blue > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-[#64748B]'}`}>
                            Final: {computeFinal(data.score_blue, data.deduction_blue) ?? '\u2014'}
                            {data.deduction_blue > 0 && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-bold align-middle">-{data.deduction_blue}</span>
                            )}
                          </p>
                        </div>
                        <div className="col-span-2 xl:col-span-1">
                          <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                            <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            Notas
                          </label>
                          <input
                            type="text"
                            value={data.notes || ''}
                            onChange={(e) => updateRound(rn, 'notes', e.target.value)}
                            onBlur={() => handleBlur(rn)}
                            disabled={isFinalized}
                            placeholder="Agregar observaciones del round..."
                            className={notesInputBase}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md p-5 sm:p-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#1E293B] mb-5">
                <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] m-0 leading-relaxed">
                  Revisá la puntuación antes de enviarla. Una vez enviada no podrá modificarse.
                </p>
              </div>
              <div className="flex justify-center">
                <PageActionButton
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!allComplete || finalizing}
                  loading={finalizing}
                  icon={CheckIcon}
                  className="px-10 py-3.5 text-base shadow-md"
                >
                  {finalizing ? 'Enviando tarjeta...' : 'Enviar Tarjeta Oficial'}
                </PageActionButton>
              </div>
            </div>

          </div>

          <aside className="hidden xl:block w-72 shrink-0">
            <SummarySidebar
              completedRounds={completedRounds}
              totalRounds={totalRounds}
              allComplete={allComplete}
            />
          </aside>
        </div>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => { if (!finalizing) setShowConfirmModal(false); }}
          onConfirm={handleFinalize}
          title="Enviar tarjeta final"
          description="Una vez enviada la tarjeta no podrás modificarla. ¿Deseás continuar?"
          confirmLabel={finalizing ? 'Enviando...' : 'Enviar'}
          type="warning"
          loading={finalizing}
        />
      </div>
    </div>
  );
};

export default ScoreFight;
