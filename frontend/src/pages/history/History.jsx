import { useState, useEffect, useMemo } from 'react';
import { getFightHistory } from '../../services/historyService';
import { useAuth } from '../../context/AuthContext';
import FilterBar, { FilterInput, FilterDate, FilterSelect } from '../../components/common/FilterBar';
import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '../../components/common/Skeletons';

const statusConfig = {
  archived: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-300', icon: 'archive', label: 'Archived' },
};

const getStatus = (status) => statusConfig[status] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200', icon: 'clock', label: status };

const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

const StatusIcon = ({ type }) => {
  const paths = {
    archive: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  };
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type] || paths.archive} />
    </svg>
  );
};

const StatCard = ({ icon, value, label, color }) => (
  <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <span className="text-white text-sm font-bold">{icon}</span>
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] leading-none">{value}</p>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">{label}</p>
      </div>
    </div>
  </div>
);

const History = () => {
  const { token } = useAuth();
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFight, setSelectedFight] = useState(null);

  const [searchEvent, setSearchEvent] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFightHistory(token, { searchEvent, dateFrom, dateTo, weightClass: filterCategory })
      .then((data) => { setFights(data); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.message || 'Failed to load fight history'); setLoading(false); });
  }, [token, searchEvent, dateFrom, dateTo, filterCategory]);

  const categories = useMemo(() => {
    const cats = [...new Set(fights.map((f) => f.weight_class).filter(Boolean))];
    return cats.map((c) => ({ value: c, label: c }));
  }, [fights]);

  const clearFilters = () => { setSearchEvent(''); setDateFrom(''); setDateTo(''); setFilterCategory(''); };
  const hasActiveFilters = searchEvent || dateFrom || dateTo || filterCategory;

  if (loading) return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={7} cols={6} />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-tight">Fight History</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">Archived fights in the system.</p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
          value={fights.length}
          label="Archived fights"
          color="bg-slate-500"
        />
        <StatCard
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          value={fights.filter(f => Number(f.avg_match_pct) > 0).length}
          label="With analysis"
          color="bg-blue-600"
        />
        <StatCard
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          value={fights.filter(f => Number(f.total_matches) > 0).length}
          label="With scorecards"
          color="bg-violet-600"
        />
      </div>

      {/* ═══ FILTERS ═══ */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchEvent} onChange={setSearchEvent} placeholder="Search by event..." />
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={categories} placeholder="Weight Class" />
        <FilterDate value={dateFrom} onChange={setDateFrom} placeholder="Date from" />
        <FilterDate value={dateTo} onChange={setDateTo} placeholder="Date to" />
      </FilterBar>

      {/* ═══ CONTENT ═══ */}
      {fights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-[#1F2937] flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mb-2">No archived fights</h3>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Archived fights will appear here.</p>
        </div>
      ) : (
        <>
          {/* ─── Desktop Table ─── */}
          <div className="hidden sm:block bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1E293B] bg-slate-50/80 dark:bg-[#0B1120]">
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Event</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Red</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Blue</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Date</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden xl:table-cell">Weight Class</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Status</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Archived</th>
                    <th className="text-center py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fights.map((fight) => {
                    const cfg = getStatus(fight.status);
                    return (
                      <tr key={fight.id} className="border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-slate-50/50 dark:hover:bg-[#1A2435] transition-colors duration-150">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                              {initials(fight.event_name)}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[180px]">{fight.event_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center text-[9px] font-bold shrink-0">R</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-[#F8FAFC] truncate max-w-[120px]">{fight.boxer_red}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0">A</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-[#F8FAFC] truncate max-w-[120px]">{fight.boxer_blue}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-500 dark:text-[#94A3B8] hidden lg:table-cell">{formatDate(fight.scheduled_date)}</td>
                        <td className="py-4 px-5 hidden xl:table-cell">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#1F2937] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#374151]">
                            {fight.weight_class || '\u2014'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                            <StatusIcon type={cfg.icon} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-500 dark:text-[#94A3B8] hidden lg:table-cell">{formatDate(fight.archived_at)}</td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => setSelectedFight(fight)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] text-slate-600 dark:text-[#F8FAFC] rounded-xl hover:bg-slate-50 dark:hover:bg-[#374151] hover:shadow-sm transition-all active:scale-[0.97]"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Mobile Cards ─── */}
          <div className="sm:hidden space-y-4">
            {fights.map((fight) => {
              const cfg = getStatus(fight.status);
              return (
                <div key={fight.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.event_name}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{fight.weight_class || '\u2014'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      <StatusIcon type={cfg.icon} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Red</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-[#F8FAFC]">{fight.boxer_red}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Blue</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-[#F8FAFC]">{fight.boxer_blue}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Date</p>
                      <p className="text-sm text-slate-600 dark:text-[#94A3B8]">{formatDate(fight.scheduled_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Archived</p>
                      <p className="text-sm text-slate-600 dark:text-[#94A3B8]">{formatDate(fight.archived_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
                    <button
                      onClick={() => setSelectedFight(fight)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#1F2937] text-slate-700 dark:text-[#F8FAFC] rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#374151] transition-all active:scale-[0.97] border border-slate-200 dark:border-[#374151]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      View details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {selectedFight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedFight(null)}>
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-200 dark:border-[#1E293B] p-6 sm:p-8 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedFight(null)} aria-label="Close details" className="absolute top-4 right-4 text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1F2937] flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500 dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">{selectedFight.event_name}</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-[#1F2937] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#374151]">ARCHIVED</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-4 mb-5">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center text-xs font-bold mx-auto mb-1">R</div>
                  <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{selectedFight.boxer_red}</p>
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase">Red</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-200 dark:bg-[#374151] text-slate-500 dark:text-[#94A3B8] text-xs font-bold">VS</div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold mx-auto mb-1">A</div>
                  <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{selectedFight.boxer_blue}</p>
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase">Blue</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{formatDate(selectedFight.scheduled_date)}</p>
              </div>
              <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Weight Class</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{selectedFight.weight_class || '\u2014'}</p>
              </div>
              <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Rounds</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{selectedFight.total_rounds}</p>
              </div>
              <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Archived</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{formatDate(selectedFight.archived_at)}</p>
              </div>
              {selectedFight.venue && (
                <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Venue</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{selectedFight.venue}</p>
                </div>
              )}
              {selectedFight.broadcaster && (
                <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#374151] p-3">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Broadcaster</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{selectedFight.broadcaster}</p>
                </div>
              )}
            </div>

            {Number(selectedFight.total_matches) > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-4 mb-5">
                <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-2">Analysis</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{Number(selectedFight.avg_match_pct).toFixed(1)}%</p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-400">Average</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{selectedFight.total_matches}</p>
                    <p className="text-[10px] text-emerald-500 dark:text-emerald-400">Exact Matches</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{selectedFight.total_errors}</p>
                    <p className="text-[10px] text-red-500 dark:text-red-400">Errors</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedFight(null)}
              className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-[#F8FAFC] bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl hover:bg-slate-50 dark:hover:bg-[#374151] hover:shadow-sm transition-all active:scale-[0.97]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
