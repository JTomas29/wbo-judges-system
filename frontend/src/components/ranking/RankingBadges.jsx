import { useState, useEffect } from 'react';

const summaryAccents = {
  blue: {
    border: 'border-t-blue-500',
    circle: 'from-blue-500 to-blue-600',
    value: 'text-blue-700 dark:text-blue-400',
  },
  gold: {
    border: 'border-t-gold',
    circle: 'from-gold to-gold-dark',
    value: 'text-gold dark:text-gold-light',
  },
  emerald: {
    border: 'border-t-emerald-500',
    circle: 'from-emerald-500 to-emerald-600',
    value: 'text-emerald-700 dark:text-emerald-400',
  },
  violet: {
    border: 'border-t-violet-500',
    circle: 'from-violet-500 to-violet-600',
    value: 'text-violet-700 dark:text-violet-400',
  },
  amber: {
    border: 'border-t-amber-500',
    circle: 'from-amber-500 to-amber-600',
    value: 'text-amber-700 dark:text-amber-400',
  },
  red: {
    border: 'border-t-red-500',
    circle: 'from-red-500 to-red-600',
    value: 'text-red-700 dark:text-red-400',
  },
  slate: {
    border: 'border-t-slate-500',
    circle: 'from-slate-500 to-slate-600',
    value: 'text-slate-800 dark:text-[#F8FAFC]',
  },
};

const RankingSummaryCard = ({ icon, value, label, sublabel, accent = 'blue', delay = 0 }) => {
  const a = summaryAccents[accent] || summaryAccents.blue;
  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#111827] dark:to-[#141d2f] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group animate-[fadeIn_0.45s_ease-out]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-white/70 to-transparent dark:from-white/[0.04] blur-2xl pointer-events-none" />
      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${a.circle} text-white flex items-center justify-center shadow-md ring-4 ring-white/70 dark:ring-white/10 mb-3 transition-transform duration-300 group-hover:scale-110`}>
        {typeof icon === 'string' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        ) : (
          icon
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-extrabold ${a.value} leading-none truncate tabular-nums`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mt-1.5">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-0.5 truncate">{sublabel}</p>}
    </div>
  );
};

const PositionBadge = ({ pos }) => {
  const medals = {
    1: 'bg-gradient-to-br from-gold-light to-gold text-wbo-800 ring-gold/60 shadow-md shadow-gold/40',
    2: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 ring-slate-300/70 shadow-md shadow-slate-400/30',
    3: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white ring-amber-400/70 shadow-md shadow-amber-600/30',
  };
  const cls = medals[pos]
    ? `${medals[pos]} w-9 h-9 text-sm`
    : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:ring-[#1E293B] w-9 h-9 text-sm';
  return (
    <div className={`rounded-full flex items-center justify-center font-extrabold ring-2 shrink-0 ${cls}`}>
      {pos}
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  const value = Number(score) || 0;
  let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700';
  if (value >= 90) color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-green-200 dark:ring-green-800/40';
  else if (value >= 75) color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/40';
  else if (value >= 60) color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40';
  else if (value > 0) color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/40';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ring-1 ${color}`}>
      {value.toFixed(1)}
    </span>
  );
};

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ${
    active
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ring-slate-200 dark:ring-slate-700'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full animate-[pulseDot_2s_ease-in-out_infinite] ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const LevelBadge = ({ level }) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-sky-200 dark:ring-sky-800/40',
    intermediate: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40',
    senior: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-purple-200 dark:ring-purple-800/40',
    elite: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize ring-1 ${colors[level] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {level}
    </span>
  );
};

const AccuracyBar = ({ value, color = 'auto', className = '', delay = 80 }) => {
  const [w, setW] = useState(0);
  const pct = Number(value) || 0;
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  const gradients = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    gold: 'from-gold to-gold-dark',
    wbo: 'from-wbo-600 to-wbo-700',
  };
  let autoColor = 'from-emerald-500 to-emerald-600';
  if (pct < 80 && pct >= 60) autoColor = 'from-amber-500 to-amber-600';
  else if (pct < 60) autoColor = 'from-red-500 to-red-600';
  const grad = color === 'auto' ? autoColor : (gradients[color] || autoColor);

  return (
    <div className={`w-full h-2.5 bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden ring-1 ring-slate-200/60 dark:ring-white/5 ${className}`}>
      <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-[width] duration-1000 ease-out`} style={{ width: `${w}%` }} />
    </div>
  );
};

export { RankingSummaryCard, PositionBadge, ScoreBadge, StatusBadge, LevelBadge, AccuracyBar };
