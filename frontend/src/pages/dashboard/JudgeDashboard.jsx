import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments } from '../../services/judgeService';
import { getJudgeStatistics } from '../../services/statisticsService';
import { getFightState } from '../../utils/fightResult';
import { Skeleton, CardsGridSkeleton } from '../../components/common/Skeletons';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-red-100 dark:border-[#1E293B] shadow-sm hover:border-red-300 dark:hover:border-[#334155] hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const LEVEL_BADGE = {
  elite: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  senior: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  junior: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

const FORMAT_DATE = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TODAY_STR = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const STATE_META = {
  pending:    { label: 'Pending',   color: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-100 dark:bg-amber-900/30',   dot: 'bg-amber-500', bar: 'bg-amber-500', step: 0 },
  active:     { label: 'Active',     color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-100 dark:bg-green-900/30',   dot: 'bg-green-500', bar: 'bg-green-500', step: 1 },
  finalized:  { label: 'Submitted',  color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-900/30',     dot: 'bg-blue-500',  bar: 'bg-blue-500',  step: 2 },
  completed:  { label: 'Completed',  color: 'text-slate-700 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-slate-700/50',   dot: 'bg-slate-400', bar: 'bg-slate-400', step: 3 },
  analyzed:   { label: 'Analyzed',   color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-100 dark:bg-red-900/30',       dot: 'bg-red-500',   bar: 'bg-red-500',   step: 4 },
};

const TimelineItem = ({ icon, label, date, done }) => (
  <div className="flex gap-3">
    <div className={`flex flex-col items-center ${done ? '' : 'opacity-40'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'bg-white dark:bg-[#111827] border-red-300 dark:border-red-600 text-red-700 dark:text-red-300' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-300 dark:text-slate-600'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icon} />
        </svg>
      </div>
      <div className="w-px flex-1 bg-red-100 dark:bg-red-900/30 mt-1" />
    </div>
    <div className={`pb-6 ${done ? '' : 'opacity-40'}`}>
      <p className={`text-sm font-semibold ${done ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{label}</p>
      {date && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{date}</p>}
    </div>
  </div>
);

const StatBlock = ({ label, value, icon }) => (
  <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#1E293B] p-4 text-center transition-all duration-250 hover:border-red-200 dark:hover:border-red-800/40 hover:shadow-sm hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-2">
      <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] leading-none">{value}</p>
    <p className="text-[10px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide mt-1">{label}</p>
  </div>
);

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [loadingAsign, setLoadingAsign] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoadingAsign(true);
    setLoadingStats(true);
    setError(null);
    try {
      const [asignRes, statsRes] = await Promise.all([
        getMyAssignments(token),
        getJudgeStatistics(user.id, token),
      ]);
      setAssignments(asignRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading dashboard data');
    } finally {
      setLoadingAsign(false);
      setLoadingStats(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) loadData();
  }, [token, user, loadData]);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await getMyAssignments(token);
        if (!cancelled) setAssignments(res.data || []);
      } catch { /* silent */ }
    };
    const interval = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, user]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-2">Error loading</h3>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-6">{error}</p>
        <button onClick={loadData} className="px-6 py-2.5 text-sm font-semibold text-white bg-wbo-700 hover:bg-wbo-800 transition-all duration-250 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98]">Retry</button>
      </div>
    );
  }

  const totalAssigned = assignments.length;
  const pendingConfirm = assignments.filter((a) => a.fight_status === 'pending').length;
  const finalizedCount = assignments.filter((a) => a.fight_status === 'active' && a.scorecard_status === 'finalized').length;
  const activeScoring = assignments.filter(
    (a) => a.fight_status === 'active' && a.scorecard_status !== 'finalized'
  ).length;
  const analyzedCount = assignments.filter((a) => a.fight_status === 'analyzed').length;

  const precision = stats?.avg_match_pct || 0;
  const totalFights = stats?.total_fights || 0;
  const totalRounds = stats?.total_rounds || 0;

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ─── 1. HEADER / MI PERFIL (Premium Card) ─── */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-slate-200 dark:border-[#1E293B] overflow-hidden">
        {/* Top section: Avatar + Info + Stats */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Avatar + Personal Info */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md">
                  {initials}
                </div>
              </div>
              <div className="min-w-0 pt-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight truncate">{user?.name}</h1>
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <Badge className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                    Judge
                  </Badge>
                  <Badge className={LEVEL_BADGE[user?.level] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}>
                    {user?.level || '\u2014'}
                  </Badge>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user?.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-3 capitalize">{TODAY_STR()}</p>
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                  Welcome back, {user?.name?.split(' ')[0] || 'Judge'}.{' '}
                  {activeScoring > 0
                    ? `You have ${activeScoring} active fight${activeScoring > 1 ? 's' : ''} to score.`
                    : pendingConfirm > 0
                      ? `You have ${pendingConfirm} assignment${pendingConfirm > 1 ? 's' : ''} waiting for the fight to be activated.`
                      : 'There is nothing pending.'}
                </p>
              </div>
            </div>

            {/* Right: Stats blocks */}
            {stats && totalFights > 0 && (
              <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[420px]">
                <StatBlock
                  label="Accuracy"
                  value={`${precision}%`}
                  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <StatBlock
                  label="Fights scored"
                  value={totalFights}
                  icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
                <StatBlock
                  label="Rounds scored"
                  value={totalRounds}
                  icon="M13 10V3L4 14h7v7l9-11h-7z"
                />
                <StatBlock
                  label="Fights analyzed"
                  value={analyzedCount}
                  icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </div>
            )}

            {/* Stats loading state */}
            {loadingStats && (
              <div className="shrink-0 flex items-center gap-3 py-4 px-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-32 rounded-xl shrink-0" />
                ))}
              </div>
            )}

            {/* Stats empty state */}
            {!loadingStats && stats && totalFights === 0 && (
              <div className="shrink-0 py-4 px-6 text-center">
                <p className="text-sm text-slate-400 dark:text-[#94A3B8]">No performance data yet.</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">Complete your first fight to see your statistics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar: Meta info + actions */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50 dark:bg-[#0B1120] border-t border-slate-200 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>Member since: {FORMAT_DATE(user?.created_at)}</span>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-semibold text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-300 dark:border-[#1E293B] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-red-200 dark:hover:border-red-800/40 transition-all duration-250 active:scale-[0.97]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit profile
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-semibold text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-300 dark:border-[#1E293B] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-red-200 dark:hover:border-red-800/40 transition-all duration-250 active:scale-[0.97]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change password
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. DESIGNATIONS + TIMELINE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC]">My Assignments</h2>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                {assignments.length} assigned fight{assignments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/judges/assignments')} className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-white bg-wbo-700 hover:bg-wbo-800 rounded-xl transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98]">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Counter mini-cards */}
          {assignments.length > 0 && (
            <div className="flex gap-3 mb-7 overflow-x-auto pb-1">
              {[
                { label: 'Pending', value: pendingConfirm, color: 'bg-amber-500', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                { label: 'Submitted', value: finalizedCount, color: 'bg-emerald-500', icon: 'M5 13l4 4L19 7' },
                { label: 'Analyzed', value: analyzedCount, color: 'bg-red-500', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm px-4 py-3 min-w-[140px]">
                  <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] leading-none">{c.value}</p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">{c.label}</p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.color} ml-auto`} />
                </div>
              ))}
            </div>
          )}

          {loadingAsign ? (
            <CardsGridSkeleton count={2} />
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">You have no assignments yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">When an administrator assigns you a fight it will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {assignments.slice(0, 4).map((a) => {
                const state = getFightState(a);
                const meta = STATE_META[state];
                const currentStep = meta.step;
                const progressText = currentStep >= 0 ? `Step ${currentStep + 1} of 5` : '';

                const borderAccent = {
                  pending: 'border-l-amber-500',
                  active: 'border-l-blue-500',
                  finalized: 'border-l-emerald-500',
                  completed: 'border-l-slate-400 dark:border-l-slate-500',
                  analyzed: 'border-l-violet-500',
                }[state] || 'border-l-slate-300 dark:border-l-slate-600';

                return (
                  <div key={a.fight_id} className={`group bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-l-[5px] ${borderAccent} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-red-300 dark:hover:border-[#334155]`}>
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] truncate leading-tight">{a.event_name}</p>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
                              {[a.weight_class, a.venue].filter(Boolean).join(' · ') || 'No details'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${meta.bg} ${meta.color} rounded-full`}>
                            {meta.label}
                          </Badge>
                          {state !== 'completed' && (
                            <button className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-700 dark:hover:text-red-400 transition-all duration-250 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40"
                              aria-label="View fight"
                              onClick={() => {
                                if (a.assignment_type === 'official') navigate(`/fights/${a.fight_id}`);
                                else if (state === 'active' || state === 'finalized') navigate(`/scoring/${a.fight_id}`);
                                else if (state === 'analyzed') navigate(`/analysis/${a.fight_id}`);
                                else navigate(`/fights/${a.fight_id}`);
                              }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="px-5 pb-3">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{FORMAT_DATE(a.scheduled_date)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Red Corner</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{a.boxer_red}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Blue Corner</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{a.boxer_blue}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Venue</p>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{a.venue || '\u2014'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-5 pb-5 pt-1">
                      {state === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-xl">Pending · Waiting for the fight to be activated</div>
                          <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-250 active:scale-[0.97]"
                            onClick={() => navigate(`/fights/${a.fight_id}`)}>
                            View fight
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {state === 'finalized' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-semibold rounded-xl">{progressText} · Submitted</div>
                      )}
                      {state === 'active' && a.assignment_type === 'official' && (
                        <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-250 active:scale-[0.97]"
                          onClick={() => navigate(`/fights/${a.fight_id}`)}>
                          View fight
                        </button>
                      )}
                      {state === 'active' && a.assignment_type !== 'official' && a.scorecard_status !== 'finalized' && (
                        <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-wbo-700 hover:bg-wbo-800 text-white text-xs font-semibold rounded-xl transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.97]"
                          onClick={() => navigate(`/scoring/${a.fight_id}`)}>
                          Score fight
                        </button>
                      )}
                      {state === 'completed' && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl">{progressText} · Waiting for analysis</div>
                      )}
                      {state === 'analyzed' && (
                        <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 dark:hover:border-red-600 transition-all duration-250 active:scale-[0.97]"
                          onClick={() => navigate(`/analysis/${a.fight_id}`)}>
                          View analysis
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-5">Recent Activity</h2>
          {assignments.length > 0 || stats?.total_fights > 0 ? (
            <div>
              {pendingConfirm === 0 && totalAssigned > 0 && (
                <TimelineItem icon="M5 13l4 4L19 7" label="Assignment received" date={null} done />
              )}
              <TimelineItem icon="M5 13l4 4L19 7" label="Submitted" date={null} done={analyzedCount > 0} />
              <TimelineItem icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Fight analyzed" date={null} done={analyzedCount > 0} />
              <TimelineItem icon="M13 10V3L4 14h7v7l9-11h-7z" label={`Level ${stats?.level || '\u2014'}`} date={null} done={!!stats?.level} />
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No recent activity</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your actions will appear here.</p>
            </div>
          )}
        </Card>
      </div>

      {/* ─── 3. QUICK ACTIONS ─── */}
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'My Assignments', path: '/judges/assignments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', primary: true },
            { label: 'My Statistics', path: '/analysis/statistics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { label: 'My Profile', path: `/profile/${user.id}`, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          ].map((btn) => (
            <button key={btn.label} onClick={() => navigate(btn.path)}
              className={`group relative overflow-hidden rounded-xl p-4 sm:p-5 text-left transition-all duration-300 active:scale-[0.98] ${
                btn.primary
                  ? 'bg-wbo-700 hover:bg-wbo-800 shadow-sm hover:shadow-md'
                  : 'bg-white dark:bg-[#111827] border border-slate-300 dark:border-[#1E293B] hover:border-red-300 dark:hover:border-red-800/40 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${
                btn.primary ? 'bg-white/15' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <svg className={`w-5 h-5 ${btn.primary ? 'text-white' : 'text-red-700 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={btn.icon} />
                </svg>
              </div>
              <p className={`text-sm font-bold ${btn.primary ? 'text-white' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>{btn.label}</p>
            </button>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default JudgeDashboard;
