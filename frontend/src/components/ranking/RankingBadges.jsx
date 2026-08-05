const RankingSummaryCard = ({ icon, value, label, sublabel, color }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || 'bg-red-50 dark:bg-[#1F2937]'}`}>
      <svg className="w-5 h-5 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-0.5 truncate">{value}</p>
    <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">{label}</p>
    {sublabel && (
      <p className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5 truncate">{sublabel}</p>
    )}
  </div>
);

const PositionBadge = ({ pos }) => {
  const colors = {
    1: 'bg-yellow-400 text-yellow-900 ring-yellow-300',
    2: 'bg-slate-300 text-slate-800 ring-slate-200',
    3: 'bg-amber-600 text-white ring-amber-400',
  };
  const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-2 shrink-0';
  const cls = colors[pos] || 'bg-slate-100 text-slate-600 dark:bg-[#1E293B] dark:text-[#94A3B8] ring-slate-100 dark:ring-[#1E293B]';
  return (
    <div className={`${base} ${cls}`}>
      {pos}
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  const value = Number(score) || 0;
  let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (value >= 90) color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  else if (value >= 75) color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  else if (value >= 60) color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  else if (value > 0) color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${color}`}>
      {value.toFixed(1)}
    </span>
  );
};

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
    active
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-slate-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

export { RankingSummaryCard, PositionBadge, ScoreBadge, StatusBadge };
