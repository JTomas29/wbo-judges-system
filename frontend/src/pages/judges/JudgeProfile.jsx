import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJudgeById, getJudgeAssignments, getMyAssignments } from '../../services/judgeService';
import { getJudgeStatistics } from '../../services/statisticsService';
import { getFightState } from '../../utils/fightResult';
import { getJudgeObservations, downloadJudgePdf, createObservation, deleteObservation } from '../../services/profileService';
import DetailSection from '../../components/detail/DetailSection';
import { BoltIcon, CheckBadgeIcon, ChartBarIcon, ArrowTrendingUpIcon, ShieldCheckIcon, ScaleIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { JudgeIcon } from '../../components/common/icons';
import { Skeleton, ProfileHeaderSkeleton } from '../../components/common/Skeletons';

const LEVEL_BADGE = {
  elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  senior: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
  junior: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
};

const FORMAT_DATE = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const getResultMeta = (pct) => {
  if (pct >= 80) return { label: 'Excellent', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800/50', bar: 'bg-gradient-to-r from-green-500 to-emerald-400' };
  if (pct >= 60) return { label: 'Good', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', bar: 'bg-gradient-to-r from-amber-500 to-yellow-400' };
  if (pct >= 40) return { label: 'Fair', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', bar: 'bg-gradient-to-r from-orange-500 to-amber-400' };
  return { label: 'Needs improvement', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', bar: 'bg-gradient-to-r from-red-500 to-rose-400' };
};

const performanceBadge = (pct) => {
  if (pct >= 80) return { emoji: '🥇', label: 'Excellent' };
  if (pct >= 60) return { emoji: '🥈', label: 'Very good' };
  if (pct >= 40) return { emoji: '🥉', label: 'Good' };
  return { emoji: '📈', label: 'In progress' };
};

const ProgressBar = ({ value, size = 'md' }) => {
  const meta = getResultMeta(value);
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className={`w-full ${heights[size]} rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden`}>
      <div
        className={`${heights[size]} rounded-full ${meta.bar} transition-all duration-1000 ease-out`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

const DonutChart = ({ value, size = 120 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const meta = getResultMeta(value);
  const colorMap = {
    'bg-gradient-to-r from-green-500 to-emerald-400': '#10b981',
    'bg-gradient-to-r from-amber-500 to-yellow-400': '#f59e0b',
    'bg-gradient-to-r from-orange-500 to-amber-400': '#f97316',
    'bg-gradient-to-r from-red-500 to-rose-400': '#ef4444',
  };
  const strokeColor = colorMap[meta.bar] || '#10b981';

  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-[#1E293B]" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

const STATE_META = {
  pending:    { label: 'Pending',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30 dark:border dark:border-amber-800/50' },
  active:     { label: 'Active',     color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30 dark:border dark:border-green-800/50' },
  finalized:  { label: 'Submitted',  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/30 dark:border dark:border-blue-800/50' },
  completed:  { label: 'Completed',  color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/30 dark:border dark:border-slate-600/50' },
  analyzed:   { label: 'Analyzed',   color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-100 dark:bg-red-900/30 dark:border dark:border-red-800/50' },
};

const JudgeProfile = () => {
  const { judgeId, userId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [judge, setJudge] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsFormFightId, setObsFormFightId] = useState('');
  const [obsFormText, setObsFormText] = useState('');
  const [obsSubmitting, setObsSubmitting] = useState(false);

  const targetJudgeId = parseInt(judgeId || userId, 10);
  const isOwnProfile = user?.id === targetJudgeId;

  useEffect(() => {
    if (user?.role === 'judge' && user.id !== targetJudgeId) {
      navigate(`/profile/${user.id}`, { replace: true });
    }
  }, [user, targetJudgeId, navigate]);

  const loadData = useCallback(async () => {
    if (!token || !targetJudgeId) return;
    setLoading(true);
    setError(null);

    try {
      if (user?.role === 'judge') {
        if (user.id !== targetJudgeId) return;
        setJudge(user);
        const [assignRes, statsRes, obsRes] = await Promise.allSettled([
          getMyAssignments(token),
          getJudgeStatistics(targetJudgeId, token),
          getJudgeObservations(targetJudgeId, token),
        ]);
        setAssignments(assignRes.status === 'fulfilled' ? (assignRes.value.data || []) : []);
        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
        setObservations(obsRes.status === 'fulfilled' ? (obsRes.value.data || []) : []);
      } else {
        const [judgeRes, assignRes, statsRes, obsRes] = await Promise.allSettled([
          getJudgeById(targetJudgeId, token),
          getJudgeAssignments(targetJudgeId, token),
          getJudgeStatistics(targetJudgeId, token),
          getJudgeObservations(targetJudgeId, token),
        ]);

        if (judgeRes.status === 'rejected') {
          const status = judgeRes.reason?.response?.status;
          if (status === 404) { setError('Judge not found'); return; }
          if (status === 403) { setError('You do not have permission to view this profile'); return; }
          setError(judgeRes.reason?.response?.data?.message || 'Error loading profile');
          return;
        }
        setJudge(judgeRes.value.data);
        setAssignments(assignRes.status === 'fulfilled' ? (assignRes.value.data || []) : []);
        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
        setObservations(obsRes.status === 'fulfilled' ? (obsRes.value.data || []) : []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [token, targetJudgeId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
        <ProfileHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-56 rounded-2xl lg:col-span-1" />
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm px-6 py-4 text-center border border-slate-200 dark:border-[#1E293B]">
          <p className="text-red-600 text-sm dark:text-red-300 m-0">{error}</p>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await downloadJudgePdf(targetJudgeId, token);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `perfil-juez-${judge?.name?.replace(/\s+/g, '-').toLowerCase() || 'judge'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error generating PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSubmitObservation = async (e) => {
    e.preventDefault();
    if (!obsFormFightId || !obsFormText.trim()) return;
    setObsSubmitting(true);
    try {
      await createObservation({
        entity_type: 'judge',
        entity_id: targetJudgeId,
        fight_id: parseInt(obsFormFightId, 10),
        observation: obsFormText.trim(),
      }, token);
      const res = await getJudgeObservations(targetJudgeId, token);
      setObservations(res.data || []);
      setShowObsForm(false);
      setObsFormFightId('');
      setObsFormText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating observation');
    } finally {
      setObsSubmitting(false);
    }
  };

  const handleDeleteObservation = async (obsId) => {
    if (!window.confirm('Delete this observation?')) return;
    try {
      await deleteObservation(obsId, token);
      setObservations((prev) => prev.filter((o) => o.id !== obsId));
    } catch {
      alert('Error deleting observation');
    }
  };

  const totalAssigned = assignments.length;
  const pendingConfirm = assignments.filter((a) => a.fight_status === 'pending').length;
  const activeScoring = assignments.filter(
    (a) => a.fight_status === 'active' && a.scorecard_status !== 'finalized'
  ).length;
  const analyzedCount = assignments.filter((a) => a.fight_status === 'analyzed').length;

  const precision = stats?.avg_match_pct || 0;
  const totalFights = stats?.total_fights || 0;
  const totalRounds = stats?.total_rounds || 0;

  const initials = judge?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  const pBadge = performanceBadge(precision);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Hero: Judge Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-wbo-900 via-wbo-800 to-red-900 dark:from-[#111827] dark:via-[#1a1528] dark:to-[#2d1020] rounded-2xl border border-wbo-700/30 dark:border-[#1E293B] shadow-lg p-6 md:p-8">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative">
          <div className="mb-5">
            <button onClick={() => navigate(isOwnProfile ? '/dashboard' : '/judges')}
              className="inline-flex items-center gap-1.5 text-wbo-200 dark:text-[#94A3B8] text-xs font-semibold hover:text-white dark:hover:text-white transition-colors m-0 p-2 min-h-11 min-w-11 bg-transparent border-0 cursor-pointer rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              {isOwnProfile ? 'Dashboard' : 'Judges'}
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="shrink-0">
                <div className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-2xl bg-gradient-to-br from-white/20 to-white/5 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-xl ring-2 ring-white/20 backdrop-blur-sm">
                  {initials}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate m-0">{judge?.name}</h1>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 text-amber-200 border border-white/10 backdrop-blur-sm">
                    <span>{pBadge.emoji}</span>
                    <span>{pBadge.label}</span>
                  </span>
                </div>
                <p className="text-sm text-wbo-200 dark:text-[#94A3B8] mt-1 m-0">{judge?.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-white/15 text-white border border-white/10 backdrop-blur-sm">
                    Judge
                  </Badge>
                  <Badge className={LEVEL_BADGE[judge?.level] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}>
                    {judge?.level || '—'}
                  </Badge>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${judge?.is_active ? 'text-green-300 dark:text-green-400' : 'text-white/40 dark:text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${judge?.is_active ? 'bg-green-400' : 'bg-white/30 dark:bg-slate-600'}`} />
                    {judge?.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {!isOwnProfile && user?.role !== 'judge' && (
                    <button
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white border border-white/10 backdrop-blur-sm text-xs font-bold hover:bg-white/25 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {pdfLoading ? 'Generating...' : 'Export PDF'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {stats && totalFights > 0 && (
              <div className="shrink-0 w-full lg:w-auto lg:min-w-[420px]">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 lg:border-l lg:pl-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{totalFights}</p>
                      <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Fights</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{totalRounds}</p>
                      <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Rounds</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{precision}%</p>
                      <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Accuracy</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-1000 ease-out" style={{ width: `${Math.min(precision, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="shrink-0 flex items-center gap-3 py-4 px-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-28 rounded-xl shrink-0 bg-white/10" />
                ))}
              </div>
            )}

            {!loading && stats && totalFights === 0 && (
              <div className="shrink-0 py-4 px-6 text-center">
                <p className="text-sm text-wbo-200 dark:text-[#64748B] m-0">No performance data yet.</p>
                <p className="text-xs text-wbo-300/60 dark:text-slate-600 mt-0.5 m-0">Complete their first fight to see statistics.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {totalAssigned > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/25 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400/70 m-0 leading-none">Pending</p>
                <p className="text-lg font-extrabold text-blue-800 dark:text-blue-200 mt-1 m-0 leading-tight tabular-nums">{pendingConfirm}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-700/30 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/30 flex items-center justify-center shrink-0">
                <JudgeIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 m-0 leading-none">Total</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-1 m-0 leading-tight tabular-nums">{totalAssigned}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800/25 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-800/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 dark:text-green-400/70 m-0 leading-none">Active</p>
                <p className="text-lg font-extrabold text-green-800 dark:text-green-200 mt-1 m-0 leading-tight tabular-nums">{activeScoring}</p>
              </div>
            </div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-800/25 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400/70 m-0 leading-none">Analyzed</p>
                <p className="text-lg font-extrabold text-violet-800 dark:text-violet-200 mt-1 m-0 leading-tight tabular-nums">{analyzedCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Overall Performance ── */}
      {stats && totalFights > 0 && (
        <div className="bg-gradient-to-br from-white to-wbo-50/20 dark:from-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-violet-500 shadow-md p-6 md:p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <TrophyIcon className="w-5 h-5 text-violet-700 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Overall Performance</h3>
              <p className="text-[12px] text-slate-400 dark:text-[#64748B] m-0 mt-0.5">Global statistics for the judge</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row items-center gap-8">
            <div className="relative flex items-center justify-center">
              <DonutChart value={precision} size={140} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 tabular-nums">{precision}%</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider m-0">Accuracy</p>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center mx-auto mb-2">
                  <JudgeIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                </div>
                <p className="text-lg font-extrabold text-blue-800 dark:text-blue-200 m-0 tabular-nums">{totalFights}</p>
                <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400/60 uppercase tracking-wider mt-0.5 m-0">Fights</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center mx-auto mb-2">
                  <BoltIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                </div>
                <p className="text-lg font-extrabold text-amber-800 dark:text-amber-200 m-0 tabular-nums">{totalRounds}</p>
                <p className="text-[10px] font-bold text-amber-500 dark:text-amber-400/60 uppercase tracking-wider mt-0.5 m-0">Rounds</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-violet-50 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheckIcon className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                </div>
                <p className="text-sm font-extrabold text-violet-800 dark:text-violet-200 m-0 capitalize">{judge?.level || '—'}</p>
                <p className="text-[10px] font-bold text-violet-500 dark:text-violet-400/60 uppercase tracking-wider mt-0.5 m-0">Level</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center mx-auto mb-2">
                  <CheckBadgeIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200 m-0 tabular-nums">{analyzedCount}</p>
                <p className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400/60 uppercase tracking-wider mt-0.5 m-0">Analyzed</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-sky-50 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-800/30 flex items-center justify-center mx-auto mb-2">
                  <ScaleIcon className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                </div>
                <p className="text-lg font-extrabold text-sky-800 dark:text-sky-200 m-0 tabular-nums">{stats?.history?.length || 0}</p>
                <p className="text-[10px] font-bold text-sky-500 dark:text-sky-400/60 uppercase tracking-wider mt-0.5 m-0">History</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-900/15 border border-rose-100 dark:border-rose-800/25 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-800/30 flex items-center justify-center mx-auto mb-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                </div>
                <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200 m-0">{pBadge.label}</p>
                <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400/60 uppercase tracking-wider mt-0.5 m-0">Consistency</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance Bars ── */}
      {stats && totalFights > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/25 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400/70 uppercase tracking-wider">Overall Accuracy</span>
              <span className={`text-xs font-extrabold tabular-nums ${getResultMeta(precision).color}`}>{precision}%</span>
            </div>
            <ProgressBar value={precision} size="md" />
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/25 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400/70 uppercase tracking-wider">Completed Fights</span>
              <span className="text-xs font-extrabold text-blue-800 dark:text-blue-200 tabular-nums">{totalFights}</span>
            </div>
            <ProgressBar value={Math.min(totalFights * 10, 100)} size="md" />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/25 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400/70 uppercase tracking-wider">Rounds Scored</span>
              <span className="text-xs font-extrabold text-amber-800 dark:text-amber-200 tabular-nums">{totalRounds}</span>
            </div>
            <ProgressBar value={Math.min(totalRounds * 5, 100)} size="md" />
          </div>
        </div>
      )}

      {/* ── Assignments ── */}
      <DetailSection icon={JudgeIcon} title="Assignments" description="History of assigned fights">
        {assignments.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3 dark:bg-[#1F2937]">
              <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-[#94A3B8] m-0">No assignments</p>
            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500 m-0">This judge has no assigned fights yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const state = getFightState(a);
              const meta = STATE_META[state];
              const goTo = () => {
                if (state === 'active' || state === 'finalized') navigate(`/scoring/${a.fight_id}`);
                else if (state === 'analyzed') navigate(`/analysis/${a.fight_id}`);
                else navigate(`/fights/${a.fight_id}`);
              };
              return (
                <div key={a.fight_id} onClick={goTo} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(); } }}
                  className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer dark:bg-[#0B1120] dark:border-[#1E293B] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 dark:hover:border-red-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate dark:text-[#F8FAFC] m-0">{a.event_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate dark:text-[#94A3B8] m-0">
                      {a.boxer_red} vs {a.boxer_blue} · {FORMAT_DATE(a.scheduled_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
            {isOwnProfile && assignments.length > 0 && (
              <button onClick={() => navigate('/judges/assignments')}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-wbo-700 hover:bg-wbo-800 rounded-xl transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98]">
                View all assignments
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </DetailSection>

      {/* ── Performance History ── */}
      {stats?.history && stats.history.length > 0 && (
        <DetailSection icon={ChartBarIcon} title="Performance History" description="Accuracy and results per fight">
          <div className="sm:hidden space-y-3 p-4">
            {stats.history.map((h) => {
              const rMeta = getResultMeta(h.match_pct);
              return (
                <div key={h.fight_id} className="bg-slate-50 dark:bg-[#0B1120]/50 rounded-xl border border-slate-100 dark:border-[#1E293B] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] truncate m-0">{h.event_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${rMeta.bg} ${rMeta.color} border ${rMeta.border}`}>
                      {h.match_pct >= 80 ? '🥇' : h.match_pct >= 60 ? '🥈' : h.match_pct >= 40 ? '🥉' : '⚠'} {rMeta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Accuracy</p>
                      <p className={`text-sm font-extrabold tabular-nums m-0 ${rMeta.color}`}>{h.match_pct}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Matches</p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-700 dark:text-slate-300 m-0">{h.matches}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0">Errors</p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-700 dark:text-slate-300 m-0">{h.errors}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={h.match_pct} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Fight</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden sm:table-cell">Date</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Result</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Accuracy</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Exact Matches</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8] hidden md:table-cell">Errors</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.map((h) => {
                  const rMeta = getResultMeta(h.match_pct);
                  return (
                    <tr key={h.fight_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 truncate max-w-[200px] dark:text-[#F8FAFC]">{h.event_name}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell dark:text-[#94A3B8]">{FORMAT_DATE(h.scheduled_date)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${rMeta.bg} ${rMeta.color} border ${rMeta.border}`}>
                          {h.match_pct >= 80 ? '🥇' : h.match_pct >= 60 ? '🥈' : h.match_pct >= 40 ? '🥉' : '⚠'}
                          <span>{rMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px]">
                            <ProgressBar value={h.match_pct} size="sm" />
                          </div>
                          <span className={`text-xs font-extrabold tabular-nums ${rMeta.color}`}>{h.match_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm font-semibold hidden md:table-cell dark:text-[#94A3B8] tabular-nums">{h.matches}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-sm hidden md:table-cell dark:text-[#94A3B8] tabular-nums">{h.errors}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      {/* ── Observations ── */}
      {user?.role !== 'judge' && (
        <DetailSection
          icon={({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          )}
          title="Observaciones"
          description={`${observations.length} observación${observations.length !== 1 ? 'es' : ''} registrada${observations.length !== 1 ? 's' : ''}`}
        >
          <div className="p-4 sm:p-5">
            {observations.length === 0 && !showObsForm ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] m-0">No hay observaciones registradas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {observations.map((obs) => (
                  <div key={obs.id} className="bg-slate-50 dark:bg-[#0B1120]/50 rounded-xl border border-slate-100 dark:border-[#1E293B] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] m-0">{obs.event_name}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 m-0">
                          {obs.boxer_red} vs {obs.boxer_blue} · {FORMAT_DATE(obs.scheduled_date)}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 m-0 whitespace-pre-wrap">{obs.observation}</p>
                        <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-2 m-0">
                          Creada por {obs.creator_name} · {FORMAT_DATE(obs.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteObservation(obs.id)}
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showObsForm ? (
              <form onSubmit={handleSubmitObservation} className="mt-4 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#1E293B] p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1">Pelea</label>
                  <select
                    value={obsFormFightId}
                    onChange={(e) => setObsFormFightId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-[#F8FAFC] focus:ring-2 focus:ring-wbo-700/40 focus:outline-none"
                  >
                    <option value="">Select fight...</option>
                    {assignments.map((a) => (
                      <option key={a.fight_id} value={a.fight_id}>
                        {a.event_name} ({a.boxer_red} vs {a.boxer_blue})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1">Observación</label>
                  <textarea
                    value={obsFormText}
                    onChange={(e) => setObsFormText(e.target.value)}
                    required
                    maxLength={2000}
                    rows={3}
                    placeholder="Write the observation..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-[#F8FAFC] focus:ring-2 focus:ring-wbo-700/40 focus:outline-none resize-none"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1 m-0">{obsFormText.length}/2000</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowObsForm(false); setObsFormFightId(''); setObsFormText(''); }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={obsSubmitting || !obsFormFightId || !obsFormText.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-wbo-700 hover:bg-wbo-800 rounded-lg transition-colors disabled:opacity-50">
                    {obsSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowObsForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-wbo-700 dark:text-wbo-300 bg-wbo-50 dark:bg-wbo-900/20 hover:bg-wbo-100 dark:hover:bg-wbo-900/30 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add observation
              </button>
            )}
          </div>
        </DetailSection>
      )}

    </div>
  );
};

export default JudgeProfile;
