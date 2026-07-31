import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getOfficialCard, createOfficialCard } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';
import { ConfirmModal } from '../../components/common/modals';
import {
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  MapPinIcon,
  BoltIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const roundComplete = (r) =>
  r && Number(r.score_red) >= 1 && Number(r.score_red) <= 10 && Number(r.score_blue) >= 1 && Number(r.score_blue) <= 10;

const accentMap = {
  red: { border: 'border-t-red-500', iconBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-700 dark:text-red-400', valueColor: 'text-red-700 dark:text-red-400' },
  blue: { border: 'border-t-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-400' },
  gold: { border: 'border-t-gold', iconBg: 'bg-gold/10', iconColor: 'text-gold dark:text-gold-light', valueColor: 'text-gold dark:text-gold-light' },
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

const SuccessHero = () => (
  <div className="bg-gradient-to-br from-white via-white to-wbo-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-wbo-700 shadow-lg p-8 sm:p-10 text-center animate-[fadeIn_0.4s_ease-out]">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center mx-auto mb-5 animate-[scaleIn_0.5s_ease-out] shadow-md ring-1 ring-green-200/50 dark:ring-green-800/40">
      <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-3 m-0 tracking-tight">Tarjeta oficial cargada correctamente</h2>
    <p className="text-base text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto m-0">
      La tarjeta fue registrada exitosamente y ya no puede modificarse.
    </p>
  </div>
);

const FightHeaderCard = ({ fight }) => (
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
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/50 shrink-0 self-start sm:self-center">
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
          <svg className="w-4 h-4 text-gold dark:text-gold-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
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
);

const SectionCard = ({ Icon, title, description, children }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden animate-[fadeIn_0.6s_ease-out]">
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B]">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-wbo-700 dark:text-wbo-400" />
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

const RoundsResultTable = ({ fight, card }) => (
  <SectionCard Icon={ClipboardDocumentCheckIcon} title="Puntuación por Round" description="Detalle de cada asalto">
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-wbo-700 text-white">
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Round</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-red-200">{fight.boxer_red}</th>
            <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-blue-200">{fight.boxer_blue}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
          {card.rounds.map((r, i) => (
            <tr key={r.round_number} className={`transition-colors duration-150 hover:bg-wbo-50/40 dark:hover:bg-[#1A2435] ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-[#0B1120]/40' : ''}`}>
              <td className="px-5 py-3"><RoundBadge roundNumber={r.round_number} /></td>
              <td className="px-5 py-3 text-center text-base font-extrabold text-red-700 dark:text-red-400 tabular-nums">{r.score_red}</td>
              <td className="px-5 py-3 text-center text-base font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{r.score_blue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
);

const scoreRedInput = "w-full px-4 py-3.5 text-center rounded-xl text-lg font-extrabold text-red-700 dark:text-red-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-red-300 dark:hover:border-red-900/60 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 focus:shadow-md";

const scoreBlueInput = "w-full px-4 py-3.5 text-center rounded-xl text-lg font-extrabold text-blue-700 dark:text-blue-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-900/60 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:shadow-md";

const OfficialHeaderCard = ({ fight }) => {
  const infoItems = [
    { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight?.scheduled_date) },
    { icon: MapPinIcon, label: 'Lugar', value: fight?.venue || '\u2014' },
    { icon: BoltIcon, label: 'Categoría', value: fight?.weight_class || '\u2014' },
    { icon: ChartBarIcon, label: 'Rounds', value: `${fight?.total_rounds ?? 0} rounds` },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      <div className="relative bg-gradient-to-r from-wbo-800 via-wbo-700 to-wbo-800 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <ClipboardDocumentCheckIcon className="w-7 h-7 text-red-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-300 mb-1 m-0">Tarjeta Oficial</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 leading-tight tracking-tight">
              {fight?.boxer_red} <span className="text-red-300 font-semibold">vs</span> {fight?.boxer_blue}
            </h1>
            <p className="text-sm text-red-100/90 mt-0.5 m-0">{fight?.event_name}</p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Completada
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

const OfficialProgressCard = ({ completed, total, pct, allComplete }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md p-5 sm:p-6 animate-[fadeIn_0.35s_ease-out]">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-wbo-50 dark:bg-wbo-900/20 flex items-center justify-center shrink-0">
          <BoltIcon className="w-5 h-5 text-wbo-700 dark:text-wbo-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Progreso de la carga</h3>
          <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">
            {allComplete ? '¡Todos los rounds cargados!' : `${completed} de ${total} rounds cargados`}
          </p>
        </div>
      </div>
      <span className="text-2xl font-extrabold text-wbo-700 dark:text-wbo-400 tabular-nums shrink-0">{pct}%</span>
    </div>
    <div className="w-full h-3.5 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-wbo-600 to-wbo-700'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
    <p className={`text-xs font-semibold mt-2.5 m-0 flex items-center gap-1.5 ${allComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
      {allComplete ? (
        <>
          <CheckIcon className="w-4 h-4 shrink-0" />
          Tarjeta lista para guardar
        </>
      ) : (
        <>
          {pct}% completado
          {total - completed > 0 && <> · {total - completed} {total - completed === 1 ? 'round pendiente' : 'rounds pendientes'}</>}
        </>
      )}
    </p>
  </div>
);

const RoundInputCard = ({ roundNumber, data, boxerRed, boxerBlue, complete, onChange }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[#334155] transition-all duration-200 animate-[fadeIn_0.4s_ease-out]">
    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#1E293B] rounded-t-2xl bg-slate-50/60 dark:bg-[#0B1120]/50 flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-wbo-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-2.5 0-4.5 2-4.5 4.5V9H6a2 2 0 00-2 2v4a2 2 0 002 2h1.5v3h9v-3H18a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5V6.5C16.5 4 14.5 2 12 2z" />
        </svg>
        Round {roundNumber}
      </span>
      {complete && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="w-3.5 h-3.5" />
          Completado
        </span>
      )}
    </div>
    <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
          <span className="w-2.5 h-2.5 rounded-full bg-wbo-600 dark:bg-red-400 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-[10px] font-bold uppercase tracking-wide">Rojo</span>
          <span className="truncate">{boxerRed}</span>
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={data.score_red ?? ''}
          onChange={(e) => onChange('score_red', e.target.value)}
          placeholder="10"
          className={scoreRedInput}
        />
      </div>
      <div>
        <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-[10px] font-bold uppercase tracking-wide">Azul</span>
          <span className="truncate">{boxerBlue}</span>
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={data.score_blue ?? ''}
          onChange={(e) => onChange('score_blue', e.target.value)}
          placeholder="10"
          className={scoreBlueInput}
        />
      </div>
    </div>
  </div>
);

const OfficialSummaryCard = ({ completed, total, redTotal, blueTotal, allComplete }) => {
  const winner = redTotal > blueTotal ? 'Rojo' : blueTotal > redTotal ? 'Azul' : 'Empate';
  const winnerCls = redTotal > blueTotal
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/40'
    : blueTotal > redTotal
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/40'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700';
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 m-0">Completados</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 m-0 tabular-nums">{completed} <span className="text-sm font-bold text-emerald-500 dark:text-emerald-500">/ {total}</span></p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/70 dark:ring-amber-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 m-0">Pendientes</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 m-0 tabular-nums">{total - completed}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mb-2 m-0 flex items-center gap-1.5">
            <DocumentCheckIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Puntaje parcial
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-wbo-600 dark:bg-red-400" />
                Rojo
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-sm font-extrabold tabular-nums">{redTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                Azul
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-sm font-extrabold tabular-nums">{blueTotal}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0 flex items-center gap-1.5">
            <TrophyIcon className="w-3.5 h-3.5 text-gold dark:text-gold-light" />
            Ganador parcial
          </p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${winnerCls}`}>{winner}</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Rounds cargados</p>
            <span className="text-xs font-extrabold text-wbo-700 dark:text-wbo-400 tabular-nums">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${allComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-wbo-600 to-wbo-700'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-1.5 m-0">Estado de validación</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${
            allComplete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40'
          }`}>
            {allComplete ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
            {allComplete ? 'Lista para guardar' : 'Incompleta'}
          </span>
        </div>
      </div>
    </div>
  );
};

const SubmitButton = ({ onClick, disabled, saving }) => (
  <button
    onClick={onClick}
    disabled={disabled || saving}
    className="inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl text-base font-bold text-white bg-gradient-to-r from-wbo-700 to-wbo-800 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:from-wbo-800 hover:to-wbo-900 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
  >
    {saving ? (
      <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
    ) : (
      <CheckIcon className="w-5 h-5" />
    )}
    {saving ? 'Guardando...' : 'Guardar Tarjeta Oficial'}
  </button>
);

const OfficialCards = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [card, setCard] = useState(null);
  const [rounds, setRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const totalRounds = fight?.total_rounds || 0;

  const allComplete = totalRounds > 0 && Array.from({ length: totalRounds }, (_, i) => i + 1).every(
    (rn) => {
      const r = rounds[rn];
      return r && Number(r.score_red) >= 1 && Number(r.score_red) <= 10 && Number(r.score_blue) >= 1 && Number(r.score_blue) <= 10;
    }
  );

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isStaff) {
          setError('La tarjeta oficial solo está disponible para administradores y supervisores.');
          setLoading(false);
          return;
        }

        const fightRes = await getFightById(fightId, token);
        if (cancelled) return;
        const f = fightRes.data;
        setFight(f);

        if (f.status !== 'completed') {
          setError('La pelea debe finalizar antes de cargar la tarjeta oficial.');
          setLoading(false);
          return;
        }

        const cardRes = await getOfficialCard(fightId, token);
        if (cancelled) return;

        if (cardRes.data) {
          setCard(cardRes.data);
          const rd = {};
          cardRes.data.rounds.forEach((r) => {
            rd[r.round_number] = { score_red: r.score_red, score_blue: r.score_blue };
          });
          setRounds(rd);
        } else {
          const rd = {};
          Array.from({ length: f.total_rounds }, (_, i) => {
            rd[i + 1] = { score_red: '', score_blue: '' };
          });
          setRounds(rd);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Error al cargar la tarjeta oficial');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fightId, token, user, isStaff]);

  const handleChange = (rn, field, value) => {
    setRounds((prev) => ({
      ...prev,
      [rn]: { ...prev[rn], [field]: value === '' ? '' : Number(value) },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        rounds: Object.entries(rounds).map(([rn, data]) => ({
          round_number: Number(rn),
          score_red: Number(data.score_red),
          score_blue: Number(data.score_blue),
        })),
      };
      const res = await createOfficialCard(fightId, payload, token);
      setCard(res.data);
      setShowConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la tarjeta oficial');
    } finally {
      setSaving(false);
    }
  };

  const pageWrapper = "bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16";

  if (loading) {
    return (
      <div className={`${pageWrapper} flex items-center justify-center`}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-wbo-700 mx-auto" />
          <span className="ml-3 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando tarjeta oficial...</span>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">{error}</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!fight) {
    return <p className={`${pageWrapper} text-slate-400 dark:text-[#64748B] py-10 text-center`}>Pelea no encontrada.</p>;
  }

  if (!isStaff && !card) {
    return (
      <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">Solo el personal autorizado puede crear la tarjeta oficial.</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (card) {
    return (
      <div className={`${pageWrapper} animate-[fadeIn_0.3s_ease-out]`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-1">
            <BackButton fallbackRoute="/fights" />
          </div>

          <FightHeaderCard fight={fight} />

          {error && card && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]">
              <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
            </div>
          )}

          <SuccessHero />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 animate-[fadeIn_0.5s_ease-out]">
            <ResultCard
              label="Total Rojo"
              value={card.total_score_red}
              icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              accent="red"
            />
            <ResultCard
              label="Total Azul"
              value={card.total_score_blue}
              icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              accent="blue"
            />
            <ResultCard
              label="Ganador"
              value={card.winner || 'Empate'}
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              accent="gold"
            />
          </div>

          <RoundsResultTable fight={fight} card={card} />
        </div>
      </div>
    );
  }

  const completed = Array.from({ length: totalRounds }, (_, i) => i + 1).filter((rn) => roundComplete(rounds[rn])).length;
  const pct = totalRounds ? Math.round((completed / totalRounds) * 100) : 0;
  const redTotal = Array.from({ length: totalRounds }, (_, i) => i + 1).reduce((acc, rn) => acc + (Number(rounds[rn]?.score_red) || 0), 0);
  const blueTotal = Array.from({ length: totalRounds }, (_, i) => i + 1).reduce((acc, rn) => acc + (Number(rounds[rn]?.score_blue) || 0), 0);

  return (
    <div className={`${pageWrapper} animate-[fadeIn_0.3s_ease-out]`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-1">
          <BackButton fallbackRoute="/fights" />
        </div>

        <OfficialHeaderCard fight={fight} />

        {error && !card && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out] flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        <OfficialProgressCard completed={completed} total={totalRounds} pct={pct} allComplete={allComplete} />

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden animate-[fadeIn_0.4s_ease-out]">
              <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Puntuación por Round</h3>
                  <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Cargá el puntaje de cada round</p>
                </div>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {Array.from({ length: totalRounds }, (_, i) => {
                  const rn = i + 1;
                  const data = rounds[rn] || {};
                  return (
                    <RoundInputCard
                      key={rn}
                      roundNumber={rn}
                      data={data}
                      boxerRed={fight.boxer_red}
                      boxerBlue={fight.boxer_blue}
                      complete={roundComplete(rn)}
                      onChange={(field, value) => handleChange(rn, field, value)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="hidden xl:block w-72 shrink-0">
            <OfficialSummaryCard
              completed={completed}
              total={totalRounds}
              redTotal={redTotal}
              blueTotal={blueTotal}
              allComplete={allComplete}
            />
          </aside>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md p-5 sm:p-6 animate-[fadeIn_0.5s_ease-out]">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#1E293B] mb-5">
            <svg className="w-4 h-4 text-wbo-700 dark:text-wbo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] m-0 leading-relaxed">
              Revisá la carga antes de guardar. Una vez guardada la tarjeta oficial no podrá modificarse.
            </p>
          </div>
          <div className="flex justify-center">
            <SubmitButton onClick={() => setShowConfirm(true)} disabled={!allComplete} saving={saving} />
          </div>
        </div>

        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => { if (!saving) setShowConfirm(false); }}
          onConfirm={handleSave}
          title="Guardar tarjeta oficial"
          description="Una vez guardada no podrá modificarse. ¿Deseás continuar?"
          confirmLabel={saving ? 'Guardando...' : 'Guardar'}
          type="warning"
          loading={saving}
        />
      </div>
    </div>
  );
};

export default OfficialCards;
