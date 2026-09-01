import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getOfficialJudgeCards, createOfficialJudgeCard, updateOfficialJudgeCard } from '../../services/fightService';
import { getFightAssignments } from '../../services/judgeService';
import { getEffectiveTotalRounds, isEarlyResult, RESULT_TYPE_LABELS } from '../../utils/fightResult';
import BackButton from '../../components/common/BackButton';
import { ConfirmModal } from '../../components/common/modals';
import { Skeleton } from '../../components/common/Skeletons';
import { WeightIcon, RoundsIcon } from '../../components/common/icons';
import {
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const roundComplete = (r) => {
  if (!r) return false;
  const sRed = Number(r.score_red);
  const sBlue = Number(r.score_blue);
  const dRed = Number(r.point_deduction_red || 0);
  const dBlue = Number(r.point_deduction_blue || 0);
  return sRed >= 1 && sRed <= 10 && sBlue >= 1 && sBlue <= 10
    && dRed >= 0 && dRed <= 2 && dBlue >= 0 && dBlue <= 2
    && sRed - dRed >= 1 && sBlue - dBlue >= 1;
};

const computeFinal = (score, deduction) =>
  score != null && score !== '' ? Number(score) - Number(deduction || 0) : null;

const cardTotals = (rounds) => rounds.reduce(
  (acc, r) => ({
    red: acc.red + Number(r.final_score_red ?? r.score_red),
    blue: acc.blue + Number(r.final_score_blue ?? r.score_blue),
  }),
  { red: 0, blue: 0 }
);

const cardWinner = (rounds) => {
  const totals = cardTotals(rounds);
  return totals.red > totals.blue ? 'Red' : totals.blue > totals.red ? 'Blue' : 'Draw';
};

const scoreRedInput = "w-full px-4 py-3.5 text-center rounded-xl text-lg font-extrabold text-red-700 dark:text-red-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-red-300 dark:hover:border-red-900/60 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 focus:shadow-md";

const scoreBlueInput = "w-full px-4 py-3.5 text-center rounded-xl text-lg font-extrabold text-blue-700 dark:text-blue-400 placeholder-slate-300 dark:placeholder-slate-600 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-900/60 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:shadow-md";

const OfficialHeaderCard = ({ fight }) => {
  const infoItems = [
    { icon: CalendarIcon, label: 'Date', value: formatDate(fight?.scheduled_date) },
    { icon: MapPinIcon, label: 'Venue', value: fight?.venue || '\u2014' },
    { icon: WeightIcon, label: 'Weight Class', value: fight?.weight_class || '\u2014' },
    { icon: RoundsIcon, label: 'Rounds', value: `${getEffectiveTotalRounds(fight)} rounds` },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      <div className="relative bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <ClipboardDocumentCheckIcon className="w-7 h-7 text-amber-100" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200 mb-1 m-0">Official Judges Scorecards</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 leading-tight tracking-tight">
              {fight?.boxer_red} <span className="text-amber-200 font-semibold">vs</span> {fight?.boxer_blue}
            </h1>
            <p className="text-sm text-amber-100/90 mt-0.5 m-0">{fight?.event_name}</p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40">
              <CheckIcon className="w-3.5 h-3.5" />
              Completed
            </span>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-[#0B1120] border-t border-slate-100 dark:border-[#1E293B]">
        {infoItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm">
              <item.icon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
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

const JudgeSlotCard = ({ judge, card, selected, onSelect }) => {
  const loaded = !!card;
  const totals = loaded ? cardTotals(card.rounds) : null;
  const winner = loaded ? cardWinner(card.rounds) : null;

  const winnerCls = winner === 'Red'
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/40'
    : winner === 'Blue'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/40'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left bg-white dark:bg-[#111827] rounded-2xl border shadow-sm overflow-hidden transition-all duration-250 hover:shadow-md ${
        selected ? 'border-amber-500 ring-2 ring-amber-500/30 -translate-y-0.5' : 'border-slate-200 dark:border-[#1E293B] hover:-translate-y-0.5'
      }`}
    >
      <div className={`border-t-[3px] ${loaded ? 'border-t-emerald-500' : 'border-t-amber-500'}`}>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-white dark:ring-[#111827] shadow-sm">
              {judge.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate m-0">{judge.name}</p>
              <p className="text-[11px] font-medium text-slate-400 dark:text-[#64748B] m-0 capitalize">{judge.level || 'no level'}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {loaded ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
                <CheckIcon className="w-3.5 h-3.5" />
                Loaded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/40">
                <ClockIcon className="w-3.5 h-3.5" />
                Pending
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8]">
              {loaded ? <PencilIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
              {loaded ? 'View / Edit' : 'Enter scores'}
            </span>
          </div>

          {loaded && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400 m-0">Red</p>
                  <p className="text-sm font-extrabold text-red-700 dark:text-red-400 m-0 tabular-nums">{totals.red}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 m-0">Blue</p>
                  <p className="text-sm font-extrabold text-blue-700 dark:text-blue-400 m-0 tabular-nums">{totals.blue}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Winner</p>
                  <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${winnerCls}`}>{winner}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

const RoundInputCard = ({ roundNumber, data, boxerRed, boxerBlue, complete, onChange }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[#334155] transition-all duration-200 animate-[fadeIn_0.4s_ease-out]">
    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#1E293B] rounded-t-2xl bg-slate-50/60 dark:bg-[#0B1120]/50 flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/70 dark:ring-amber-800/40">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-2.5 0-4.5 2-4.5 4.5V9H6a2 2 0 00-2 2v4a2 2 0 002 2h1.5v3h9v-3H18a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5V6.5C16.5 4 14.5 2 12 2z" />
        </svg>
        Round {roundNumber}
      </span>
      {complete && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="w-3.5 h-3.5" />
          Completed
        </span>
      )}
    </div>
    <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-[10px] font-bold uppercase tracking-wide">Red</span>
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
        <label className="mt-2 block">
          <span className="block text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] mb-1 leading-snug">Deduction (points)</span>
          <select
            value={data.point_deduction_red ?? 0}
            onChange={(e) => onChange('point_deduction_red', e.target.value)}
            className="w-full px-2 py-2.5 min-h-11 text-center rounded-lg text-base sm:text-sm font-bold text-red-700 dark:text-red-400 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <p className={`mt-1 text-[11px] font-bold tabular-nums m-0 ${Number(data.point_deduction_red || 0) > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-[#64748B]'}`}>
          Final: {computeFinal(data.score_red, data.point_deduction_red) ?? '\u2014'}
          {Number(data.point_deduction_red || 0) > 0 && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[9px] font-bold align-middle">-{data.point_deduction_red}</span>
          )}
        </p>
      </div>
      <div>
        <label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-[10px] font-bold uppercase tracking-wide">Blue</span>
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
        <label className="mt-2 block">
          <span className="block text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] mb-1 leading-snug">Deduction (points)</span>
          <select
            value={data.point_deduction_blue ?? 0}
            onChange={(e) => onChange('point_deduction_blue', e.target.value)}
            className="w-full px-2 py-2.5 min-h-11 text-center rounded-lg text-base sm:text-sm font-bold text-blue-700 dark:text-blue-400 bg-slate-50/50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B] shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <p className={`mt-1 text-[11px] font-bold tabular-nums m-0 ${Number(data.point_deduction_blue || 0) > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-[#64748B]'}`}>
          Final: {computeFinal(data.score_blue, data.point_deduction_blue) ?? '\u2014'}
          {Number(data.point_deduction_blue || 0) > 0 && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-bold align-middle">-{data.point_deduction_blue}</span>
          )}
        </p>
      </div>
    </div>
  </div>
);

const EditorSummaryCard = ({ completed, total, redTotal, blueTotal, allComplete }) => {
  const winner = redTotal > blueTotal ? 'Red' : blueTotal > redTotal ? 'Blue' : 'Draw';
  const winnerCls = redTotal > blueTotal
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/40'
    : blueTotal > redTotal
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/40'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700';
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md overflow-hidden sticky top-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-amber-50/70 to-transparent dark:from-amber-900/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shrink-0 shadow-sm">
          <ChartBarIcon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Summary</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/70 dark:ring-emerald-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 m-0">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 m-0 tabular-nums">{completed} <span className="text-sm font-bold text-emerald-500 dark:text-emerald-500">/ {total}</span></p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/70 dark:ring-amber-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 m-0">Pending</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 m-0 tabular-nums">{total - completed}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mb-2 m-0">Partial score</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                Red
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200/70 dark:ring-red-800/40 text-sm font-extrabold tabular-nums">{redTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                Blue
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/40 text-sm font-extrabold tabular-nums">{blueTotal}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0 flex items-center gap-1.5">
            <TrophyIcon className="w-3.5 h-3.5 text-gold dark:text-gold-light" />
            Partial winner
          </p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${winnerCls}`}>{winner}</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Rounds loaded</p>
            <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${allComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-1.5 m-0">Validation status</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${
            allComplete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40'
          }`}>
            {allComplete ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
            {allComplete ? 'Ready to save' : 'Incomplete'}
          </span>
        </div>
      </div>
    </div>
  );
};

const SubmitButton = ({ onClick, disabled, saving, existingCard }) => (
  <button
    onClick={onClick}
    disabled={disabled || saving}
    className="inline-flex items-center justify-center gap-2 px-10 py-3.5 w-full sm:w-auto rounded-xl text-base font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:from-amber-700 hover:to-amber-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
  >
    {saving ? (
      <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
    ) : (
      <CheckIcon className="w-5 h-5" />
    )}
    {saving ? 'Saving...' : existingCard ? 'Save changes' : 'Save Scorecard'}
  </button>
);

const OfficialJudgeCards = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [officialJudges, setOfficialJudges] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState(null);
  const [rounds, setRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const totalRounds = fight ? getEffectiveTotalRounds(fight) : 0;

  const selectedJudge = officialJudges.find((j) => j.judge_id === selectedJudgeId) || null;
  const existingCard = cards.find((c) => c.judge_id === selectedJudgeId) || null;

  const allComplete = totalRounds > 0 && Array.from({ length: totalRounds }, (_, i) => i + 1).every(
    (rn) => roundComplete(rounds[rn])
  );

  const buildRoundsFromCard = useCallback((card, roundsCount) => {
    const rd = {};
    Array.from({ length: roundsCount }, (_, i) => {
      rd[i + 1] = { score_red: '', score_blue: '', point_deduction_red: 0, point_deduction_blue: 0 };
    });
    if (card) {
      card.rounds.forEach((r) => {
        rd[r.round_number] = {
          score_red: r.score_red,
          score_blue: r.score_blue,
          point_deduction_red: Number(r.point_deduction_red || 0),
          point_deduction_blue: Number(r.point_deduction_blue || 0),
        };
      });
    }
    return rd;
  }, []);

  const loadData = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (!isStaff) {
        setError('The official judges scorecards are only available to administrators and supervisors.');
        setLoading(false);
        return;
      }

      const [fightRes, assignRes, cardsRes] = await Promise.all([
        getFightById(fightId, token),
        getFightAssignments(fightId, token),
        getOfficialJudgeCards(fightId, token),
      ]);

      const f = fightRes.data;
      setFight(f);

      if (f.status !== 'completed' && f.status !== 'analyzed') {
        setError('The fight must be completed before loading the official judges scorecards.');
        setLoading(false);
        return;
      }

      const official = assignRes.data.filter((a) => a.assignment_type === 'official');
      setOfficialJudges(official);
      setCards(cardsRes.data);

      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the official judges scorecards');
      setLoading(false);
    }
  }, [fightId, token, user, isStaff]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectJudge = (judgeId) => {
    setSelectedJudgeId(judgeId);
    const card = cards.find((c) => c.judge_id === judgeId) || null;
    setRounds(buildRoundsFromCard(card, totalRounds));
    setShowConfirm(false);
    setError(null);
  };

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
          point_deduction_red: Number(data.point_deduction_red || 0),
          point_deduction_blue: Number(data.point_deduction_blue || 0),
        })),
      };
      if (existingCard) {
        await updateOfficialJudgeCard(existingCard.id, payload, token);
      } else {
        await createOfficialJudgeCard(fightId, { judge_id: Number(selectedJudgeId), ...payload }, token);
      }
      setShowConfirm(false);
      await loadData();
      setSelectedJudgeId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the scorecard');
    } finally {
      setSaving(false);
    }
  };

  const pageWrapper = "bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16";

  if (loading) {
    return (
      <div className={`${pageWrapper} py-6`}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !fight) {
    return (
      <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <ExclamationTriangleIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">{error}</p>
          <button
            className="mt-6 px-8 py-2.5 min-h-11 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!fight) {
    return <p className={`${pageWrapper} text-slate-400 dark:text-[#64748B] py-10 text-center`}>Fight not found.</p>;
  }

  if (!isStaff) {
    return (
      <div className={`${pageWrapper} flex items-center justify-center min-h-[60vh]`}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full shadow-md">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <ExclamationTriangleIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">Only authorized staff can manage the official judges scorecards.</p>
          <button
            className="mt-6 px-8 py-2.5 min-h-11 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const completed = Array.from({ length: totalRounds }, (_, i) => i + 1).filter((rn) => roundComplete(rounds[rn])).length;
  const redTotal = Array.from({ length: totalRounds }, (_, i) => i + 1).reduce(
    (acc, rn) => acc + (Number(rounds[rn]?.score_red) || 0) - (Number(rounds[rn]?.point_deduction_red) || 0),
    0
  );
  const blueTotal = Array.from({ length: totalRounds }, (_, i) => i + 1).reduce(
    (acc, rn) => acc + (Number(rounds[rn]?.score_blue) || 0) - (Number(rounds[rn]?.point_deduction_blue) || 0),
    0
  );
  const pct = totalRounds ? Math.round((completed / totalRounds) * 100) : 0;
  const summaryWinner = redTotal > blueTotal ? 'Red' : blueTotal > redTotal ? 'Blue' : 'Draw';

  return (
    <div className={`${pageWrapper} animate-[fadeIn_0.3s_ease-out]`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-1">
          <BackButton fallbackRoute="/fights" />
        </div>

        <OfficialHeaderCard fight={fight} />

        {isEarlyResult(fight) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 m-0">
                Fight finished by {RESULT_TYPE_LABELS[fight.result_type] || fight.result_type} in round {fight.result_round}.
              </p>
              <p className="text-xs text-red-600/90 dark:text-red-400/90 m-0 mt-0.5">
                The scorecards include only the rounds actually contested (up to round {totalRounds}).
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out] flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden animate-[fadeIn_0.4s_ease-out]">
          <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-amber-50/70 to-transparent dark:from-amber-900/10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Official Judges</h3>
              <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Select a judge to load or update their paper scorecard.</p>
            </div>
          </div>
          {officialJudges.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 m-0">No official judges were assigned to this fight.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 m-0">Assign official judges from the fight before completing it.</p>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialJudges.map((j) => (
                <JudgeSlotCard
                  key={j.judge_id}
                  judge={j}
                  card={cards.find((c) => c.judge_id === j.judge_id) || null}
                  selected={selectedJudgeId === j.judge_id}
                  onSelect={() => handleSelectJudge(j.judge_id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedJudge && (
          <>
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-4">
                <div className="xl:hidden bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-4 animate-[fadeIn_0.35s_ease-out]">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Live Summary</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${allComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40'}`}>
                      {allComplete ? <CheckIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                      {allComplete ? 'Ready' : `${completed}/${totalRounds}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200/70 dark:ring-red-800/40">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 m-0">Red</p>
                      <p className="text-lg font-extrabold text-red-700 dark:text-red-300 m-0 tabular-nums">{redTotal}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 ring-1 ring-slate-200/70 dark:ring-slate-700/50 flex flex-col items-center justify-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] m-0">Winner</p>
                      <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${summaryWinner === 'Red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/40' : summaryWinner === 'Blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/40' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700'}`}>{summaryWinner}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200/70 dark:ring-blue-800/40">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 m-0">Blue</p>
                      <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300 m-0 tabular-nums">{blueTotal}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${allComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-amber-500 shadow-md overflow-hidden animate-[fadeIn_0.4s_ease-out]">
                  <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-amber-50/70 to-transparent dark:from-amber-900/10">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                      <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Score by Round · {selectedJudge.name}</h3>
                      <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">
                        {existingCard ? 'Update the scores from the paper scorecard.' : 'Enter the scores from the paper scorecard.'}
                      </p>
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
                          complete={roundComplete(data)}
                          onChange={(field, value) => handleChange(rn, field, value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="hidden xl:block w-72 shrink-0">
                <EditorSummaryCard
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
                <svg className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] m-0 leading-relaxed">
                  Review the entries before saving. These scorecards are kept for reference; they are not used in the ranking or analysis.
                </p>
              </div>
              <div className="flex justify-center">
                <SubmitButton onClick={() => setShowConfirm(true)} disabled={!allComplete} saving={saving} existingCard={existingCard} />
              </div>
            </div>

            <ConfirmModal
              isOpen={showConfirm}
              onClose={() => { if (!saving) setShowConfirm(false); }}
              onConfirm={handleSave}
              title={existingCard ? 'Update scorecard' : 'Save scorecard'}
              description={existingCard
                ? 'The scorecard will be updated with the entered scores. Do you want to continue?'
                : 'The scorecard will be saved for this official judge. Do you want to continue?'}
              confirmLabel={saving ? 'Saving...' : 'Save'}
              type="warning"
              loading={saving}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OfficialJudgeCards;
