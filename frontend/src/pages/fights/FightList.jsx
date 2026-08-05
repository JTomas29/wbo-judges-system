import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFights, deleteFight } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import FilterBar, { FilterInput, FilterSelect, FilterDate } from '../../components/common/FilterBar';
import { BaseModal, ModalHeader, ModalFooter, ModalButton } from '../../components/common/modals';

const canEdit = (status) => status === 'pending' || status === 'active';

const statusConfig = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200', icon: 'clock', label: 'Pending' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200', icon: 'zap', label: 'Active' },
  completed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200', icon: 'check', label: 'Completed' },
  analyzed: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-200', icon: 'chart', label: 'Analyzed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200', icon: 'x', label: 'Cancelled' },
};

const getStatus = (status) => statusConfig[status] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200', icon: 'clock', label: status };

const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

/* ─── Status Icon ─── */
const StatusIcon = ({ type }) => {
  const paths = {
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    zap: 'M13 10V3L4 14h7v7l9-11h-7z',
    check: 'M5 13l4 4L19 7',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    x: 'M6 18L18 6M6 6l12 12',
  };
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type] || paths.clock} />
    </svg>
  );
};

/* ─── Fight Status Badge ─── */
const FightStatusBadge = ({ status }) => {
  const cfg = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <StatusIcon type={cfg.icon} />
      {cfg.label}
    </span>
  );
};

/* ─── Stat Card ─── */
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

/* ─── Boxer Avatar ─── */
const BoxerAvatar = ({ name }) => (
  <div className="flex items-center gap-2">
    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
      {initials(name)}
    </span>
    <span className="text-sm font-medium text-slate-800 dark:text-[#F8FAFC]">{name}</span>
  </div>
);

/* ─── Fight Card (mobile) ─── */
const FightCard = ({ fight, onView, onEdit, canEditFlag, onArchive }) => {
  const st = getStatus(fight.status);
  const pct = fight.min_judges_required > 0 ? (fight.confirmed_judges / fight.min_judges_required) * 100 : 0;
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.event_name}</p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{fight.weight_class || fight.venue || '\u2014'}</p>
          </div>
        </div>
        <FightStatusBadge status={fight.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Red</p>
          <BoxerAvatar name={fight.boxer_red} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Blue</p>
          <BoxerAvatar name={fight.boxer_blue} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Date</p>
          <p className="text-sm font-medium text-slate-800 dark:text-[#F8FAFC]">{formatDate(fight.scheduled_date)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-0.5">Judges</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">{fight.confirmed_judges}/{fight.min_judges_required}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden max-w-[60px]">
              <div className="h-full rounded-full bg-red-800 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
        <button onClick={() => onView(fight.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-[0.97]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View
        </button>
        <button
          onClick={() => canEditFlag && onEdit(fight.id)}
          disabled={!canEditFlag}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
            canEditFlag
              ? 'bg-white dark:bg-[#1F2937] border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#374151] hover:border-slate-400'
              : 'bg-slate-50 dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] text-slate-400 dark:text-[#94A3B8] cursor-not-allowed'
          }`}
          title={!canEditFlag ? 'Only pending or active fights can be edited' : ''}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit
        </button>
        {onArchive && (
          <button
            onClick={() => onArchive(fight)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] bg-white dark:bg-[#1F2937] border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:shadow-sm"
            title="Archive fight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const FightList = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState(null);

  const [searchEvent, setSearchEvent] = useState('');
  const [searchBoxer, setSearchBoxer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFights(token)
      .then((res) => { setFights(res.data); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.message || 'Failed to load fights'); setLoading(false); });
  }, [token]);

  const categories = useMemo(() => {
    const cats = [...new Set(fights.map((f) => f.weight_class).filter(Boolean))];
    return cats.map((c) => ({ value: c, label: c }));
  }, [fights]);

  const filteredFights = useMemo(() => {
    return fights.filter((fight) => {
      if (searchEvent && !fight.event_name.toLowerCase().includes(searchEvent.toLowerCase())) return false;
      if (searchBoxer) {
        const q = searchBoxer.toLowerCase();
        const matchesRed = fight.boxer_red?.toLowerCase().includes(q);
        const matchesBlue = fight.boxer_blue?.toLowerCase().includes(q);
        if (!matchesRed && !matchesBlue) return false;
      }
      if (filterStatus && fight.status !== filterStatus) return false;
      if (filterCategory && fight.weight_class !== filterCategory) return false;
      if (dateFrom && fight.scheduled_date) {
        const fightDate = new Date(fight.scheduled_date).toISOString().split('T')[0];
        if (fightDate < dateFrom) return false;
      }
      if (dateTo && fight.scheduled_date) {
        const fightDate = new Date(fight.scheduled_date).toISOString().split('T')[0];
        if (fightDate > dateTo) return false;
      }
      return true;
    });
  }, [fights, searchEvent, searchBoxer, filterStatus, filterCategory, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchEvent('');
    setSearchBoxer('');
    setFilterStatus('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchEvent || searchBoxer || filterStatus || filterCategory || dateFrom || dateTo;

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await deleteFight(archiveTarget.id, token);
      setArchiveTarget(null);
      navigate('/history', { state: { toast: { type: 'success', message: 'Fight archived successfully.' } } });
    } catch (err) {
      setArchiveError(err.response?.data?.message || 'Failed to archive the fight');
      setArchiving(false);
    }
  };

  const totalAnalyzed = fights.filter((f) => f.status === 'analyzed').length;
  const totalPending = fights.filter((f) => f.status === 'pending').length;
  const totalActive = fights.filter((f) => f.status === 'active').length;
  const totalCompleted = fights.filter((f) => f.status === 'completed').length;
  const totalJudges = fights.reduce((acc, f) => acc + (f.confirmed_judges || 0), 0);

  const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'analyzed', label: 'Analyzed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-[#374151] border-t-red-800" />
        <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Loading fights...</span>
      </div>
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
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-tight">Fight List</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">Manage, view and track all registered fights.</p>
        </div>
        <button
          onClick={() => navigate('/fights/create')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Fight
        </button>
      </div>
      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} value={fights.length} label="Total fights" color="bg-red-800" />
        <StatCard icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} value={totalActive} label="Active" color="bg-emerald-600" />
        <StatCard icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} value={totalCompleted} label="Completed" color="bg-blue-600" />
        <StatCard icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} value={totalAnalyzed} label="Analyzed" color="bg-violet-600" />
        <StatCard icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} value={totalJudges} label="Assigned judges" color="bg-amber-600" />
      </div>

      {/* ═══ FILTERS ═══ */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchEvent} onChange={setSearchEvent} placeholder="Search by event..." />
        <FilterInput value={searchBoxer} onChange={setSearchBoxer} placeholder="Search by boxer..." />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="Status" />
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={categories} placeholder="Category" />
        <FilterDate value={dateFrom} onChange={setDateFrom} placeholder="Date from" />
        <FilterDate value={dateTo} onChange={setDateTo} placeholder="Date to" />
      </FilterBar>

      {/* ═══ CONTENT ═══ */}
      {filteredFights.length === 0 ? (
        /* ─── Empty State ─── */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-[#1F2937] flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mb-2">No fights found</h3>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-6">Try adjusting the filters or create a new fight.</p>
          <button
            onClick={() => navigate('/fights/create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Fight
          </button>
        </div>
      ) : (
        <>
          {/* ─── Desktop Table ─── */}
          <div className="hidden sm:block bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50/80 dark:bg-[#0B1120] z-10">
                  <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Event</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Red</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Blue</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Date</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden xl:table-cell">Category</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden xl:table-cell">Referee</th>
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Status</th>
                    <th className="text-center py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Judges</th>
                    <th className="text-right py-4 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFights.map((fight, i) => {
                    const st = getStatus(fight.status);
                    const pct = fight.min_judges_required > 0 ? (fight.confirmed_judges / fight.min_judges_required) * 100 : 0;
                    return (
                      <tr
                        key={fight.id}
                        className={`border-b border-slate-100 dark:border-[#1E293B] hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all duration-200 cursor-pointer ${i === filteredFights.length - 1 ? 'border-0' : ''}`}
                        onClick={() => navigate(`/fights/${fight.id}`)}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate max-w-[200px]">{fight.event_name}</p>
                              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">{fight.weight_class || fight.venue || '\u2014'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <BoxerAvatar name={fight.boxer_red} />
                        </td>
                        <td className="py-4 px-5">
                          <BoxerAvatar name={fight.boxer_blue} />
                        </td>
                        <td className="py-4 px-5 text-slate-600 dark:text-[#94A3B8] whitespace-nowrap hidden lg:table-cell text-xs">
                          {formatDate(fight.scheduled_date)}
                        </td>
                        <td className="py-4 px-5 hidden xl:table-cell">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1F2937] text-slate-600 dark:text-[#94A3B8]">
                            {fight.weight_class || '\u2014'}
                          </span>
                        </td>
                        <td className="py-4 px-5 hidden xl:table-cell text-slate-600 dark:text-[#94A3B8] text-xs">
                          {fight.referee_name || '\u2014'}
                        </td>
                        <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                          <FightStatusBadge status={fight.status} />
                        </td>
                        <td className="py-4 px-5 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">{fight.confirmed_judges}/{fight.min_judges_required}</span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/fights/${fight.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-sm transition-all active:scale-[0.97]"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => canEdit(fight.status) && navigate(`/fights/${fight.id}/edit`)}
                                disabled={!canEdit(fight.status)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-[0.97] ${
                                  canEdit(fight.status)
                                    ? 'bg-white dark:bg-[#1F2937] border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#374151] hover:border-slate-400 hover:shadow-sm'
                                    : 'bg-slate-50 dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] text-slate-400 dark:text-[#94A3B8] cursor-not-allowed'
                                }`}
                                title={!canEdit(fight.status) ? 'Only pending or active fights can be edited' : ''}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            )}
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => { setArchiveTarget(fight); setArchiveError(null); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1F2937] border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:shadow-sm transition-all active:scale-[0.97]"
                                title="Archive fight"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">
                Showing <span className="font-semibold text-slate-600 dark:text-[#F8FAFC]">{filteredFights.length}</span> of{' '}
                <span className="font-semibold text-slate-600 dark:text-[#F8FAFC]">{fights.length}</span> fights
              </p>
              <p className="text-xs text-slate-300 dark:text-[#94A3B8]/50">Season 2026</p>
            </div>
          </div>

          {/* ─── Mobile Card View ─── */}
          <div className="sm:hidden space-y-4">
            {filteredFights.map((fight) => (
              <FightCard
                key={fight.id}
                fight={fight}
                onView={(id) => navigate(`/fights/${id}`)}
                onEdit={(id) => navigate(`/fights/${id}/edit`)}
                canEditFlag={user?.role === 'admin' && canEdit(fight.status)}
                onArchive={user?.role === 'admin' ? (f) => { setArchiveTarget(f); setArchiveError(null); } : null}
              />
            ))}
            <div className="text-center pt-2 pb-4">
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">
                {filteredFights.length} of {fights.length} fights
              </p>
            </div>
          </div>
        </>
      )}

      <BaseModal isOpen={!!archiveTarget} onClose={() => !archiving && setArchiveTarget(null)}>
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6">
          <ModalHeader
            title="Archive Fight"
            description={archiveTarget?.event_name}
            type="danger"
          />
          <div className="bg-slate-50 dark:bg-[#1F2937] rounded-xl border border-slate-200 dark:border-[#1E293B] p-4 mb-4">
            <p className="text-sm text-slate-700 dark:text-[#F8FAFC] m-0">
              <span className="font-semibold">{archiveTarget?.boxer_red}</span> vs{' '}
              <span className="font-semibold">{archiveTarget?.boxer_blue}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 m-0">
              {archiveTarget && new Date(archiveTarget.scheduled_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mb-0 m-0">
            The fight will be archived and <strong className="text-slate-800 dark:text-[#F8FAFC]">will no longer appear in the main list</strong>. This action does not delete scorecards, analysis or statistics.
          </p>
          {archiveError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-700 dark:text-red-300">
              {archiveError}
            </div>
          )}
          <ModalFooter>
            <ModalButton variant="secondary" onClick={() => setArchiveTarget(null)} disabled={archiving}>
              Cancel
            </ModalButton>
            <ModalButton variant="danger" onClick={handleArchive} loading={archiving}>
              {archiving ? 'Archiving...' : 'Archive Fight'}
            </ModalButton>
          </ModalFooter>
        </div>
      </BaseModal>
    </div>
  );
};

export default FightList;
