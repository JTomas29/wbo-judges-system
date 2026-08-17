import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, activateFight } from '../../services/fightService';
import { getJudges, getFightAssignments, createAssignment, deleteAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import { Skeleton } from '../../components/common/Skeletons';

const MIN_JUDGES = 3;
const MAX_JUDGES = 10;

const levelBadge = (level) => {
  const configs = {
    elite: {
      classes: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    senior: {
      classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    junior: {
      classes: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  };
  const config = configs[level];
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#1E293B]">
        {level || '—'}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${config.classes}`}>
      {config.icon}
      {level}
    </span>
  );
};

const MAX_OFFICIAL_JUDGES = 3;

const assignmentTypeLabel = (type) => {
  const map = {
    evaluation: 'Fight Evaluator',
    official: 'Official',
    referee_evaluator: 'Referee Evaluator',
  };
  return map[type] || type;
};

const formatDateTime = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AssignJudges = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'supervisor';

  const [fight, setFight] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [availableJudges, setAvailableJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedJudge, setSelectedJudge] = useState('');
  const [selectedOfficialJudge, setSelectedOfficialJudge] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [activating, setActivating] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [fightRes, assignRes, judgesRes] = await Promise.all([
        getFightById(fightId, token),
        getFightAssignments(fightId, token),
        getJudges(token),
      ]);
      setFight(fightRes.data);
      setAssignments(assignRes.data);
      setAvailableJudges(judgesRes.data);
    } catch (err) {
      if (err.response?.status === 404) setError('Fight not found');
      else setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fightId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const assignedIds = new Set(assignments.map((a) => a.judge_id));
  const unassignedJudges = availableJudges.filter((j) => !assignedIds.has(j.id));
  const officialCount = assignments.filter((a) => a.assignment_type === 'official').length;
  const officialsComplete = officialCount >= MAX_OFFICIAL_JUDGES;
  const totalAssigned = assignments.length;
  const progressPct = totalAssigned > 0 ? Math.min((totalAssigned / MAX_JUDGES) * 100, 100) : 0;
  const progressColor = totalAssigned >= MIN_JUDGES ? 'bg-emerald-500' : totalAssigned > 0 ? 'bg-amber-500' : 'bg-red-500';
  const atMax = totalAssigned >= MAX_JUDGES;

  const handleAssign = async (type) => {
    const judgeId = type === 'official' ? Number(selectedOfficialJudge) : Number(selectedJudge);
    if (!judgeId) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await createAssignment(fightId, { judge_id: judgeId, assignment_type: type }, token);
      setSelectedJudge('');
      setSelectedOfficialJudge('');
      await loadData();
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign judge');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (judgeId) => {
    setError(null);
    try {
      await deleteAssignment(fightId, judgeId, token);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const handleActivate = async () => {
    if (assignments.length < MIN_JUDGES) return;
    setError(null);
    setActivating(true);
    try {
      await activateFight(fightId, token);
      navigate(`/fights/${fightId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate the fight');
    } finally {
      setActivating(false);
    }
  };

  if (loading) return (
    <div className="space-y-5 animate-fadeIn">
      <Skeleton className="h-8 w-56" />
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 sm:p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );

  if (!canManage && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm p-6 text-center border border-slate-200 dark:border-[#1E293B]">
          <p className="text-slate-700 dark:text-slate-300 font-medium">Only administrators can assign judges.</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-250"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (fight && fight.status !== 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm p-6 text-center border border-slate-200 dark:border-[#1E293B]">
          <p className="text-slate-700 dark:text-slate-300 font-medium">It is not possible to modify the assignments of this fight.</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-250"
            onClick={() => navigate(`/fights/${fightId}`)}
          >
            Back to fight
          </button>
        </div>
      </div>
    );
  }

  if (error && !fight) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
      <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm px-6 py-4 text-center border border-slate-200 dark:border-[#1E293B]">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <BackButton fallbackRoute="/dashboard" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Assign Judges</h1>
          {fight && (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">Assign the judges who will take part in this fight.</p>
          )}
        </div>
      </div>

      {/* ── Designación / Activación ── */}
      {canManage && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-4 transition-all duration-250 hover:shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wide">Assigned Judges</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
              {totalAssigned}
              <span className="text-sm font-semibold text-slate-400 dark:text-slate-500"> / {MAX_JUDGES}</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mt-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                atMax
                  ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              }`}>
                {totalAssigned} / {MAX_JUDGES} assigned
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                officialsComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              }`}>
                {officialCount} / {MAX_OFFICIAL_JUDGES} official
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Minimum required: {MIN_JUDGES}
              </span>
            </div>
            <button
              disabled={totalAssigned < MIN_JUDGES || activating}
              onClick={handleActivate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-11 w-full sm:w-auto bg-wbo-700 hover:bg-wbo-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {activating ? 'Finishing...' : 'Finish assignment'}
            </button>
          </div>
          {totalAssigned < MIN_JUDGES && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2.5 m-0">
              You must assign at least {MIN_JUDGES} judges to activate the fight.
            </p>
          )}
        </div>
      )}

      {/* ── Fight Info Card ── */}
      {fight && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-250 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] uppercase tracking-wide">Fight Information</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                Event
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{fight.event_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Red Boxer
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{fight.boxer_red}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Blue Boxer
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{fight.boxer_blue}</p>
            </div>
            {fight.scheduled_date && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Date
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{new Date(fight.scheduled_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {fight.venue && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Venue
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.venue}</p>
              </div>
            )}
            {fight.weight_class && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                  Weight Class
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">{fight.weight_class}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm border border-red-200 dark:border-red-800/40 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {assignError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm border border-red-200 dark:border-red-800/40 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {assignError}
        </div>
      )}

      {/* ── Official Judges ── */}
      {canManage && !atMax && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-amber-500 shadow-sm overflow-hidden transition-all duration-250 hover:shadow-md hover:-translate-y-0.5">
          <div className="px-5 py-3.5 bg-amber-50/60 dark:bg-[#0B1120] border-b border-slate-200 dark:border-[#1E293B] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-700 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-[#F8FAFC]">Official Judges</h3>
              <p className="text-[11px] text-slate-400 dark:text-[#64748B] m-0">Exactly {MAX_OFFICIAL_JUDGES} official judges score on paper. The supervisor loads their scorecards.</p>
            </div>
            <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
              officialsComplete ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            }`}>
              {officialCount} / {MAX_OFFICIAL_JUDGES}
            </span>
          </div>
          {!officialsComplete ? (
            <div className="p-5">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="min-w-[200px] flex-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">Official Judge</label>
                  <select value={selectedOfficialJudge} onChange={(e) => setSelectedOfficialJudge(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] transition-all duration-250 hover:border-slate-300 dark:hover:border-[#334155]">
                    <option value="">— Select an official judge —</option>
                    {unassignedJudges.map((j) => (
                      <option key={j.id} value={j.id}>{j.name} ({j.level || 'no level'})</option>
                    ))}
                  </select>
                </div>
                <button disabled={!selectedOfficialJudge || assigning}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                  onClick={() => handleAssign('official')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 m-0">The {MAX_OFFICIAL_JUDGES} official judges have been designated.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Evaluation Judges ── */}
      {canManage && !atMax && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-250 hover:shadow-md hover:-translate-y-0.5">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#0B1120] border-b border-slate-200 dark:border-[#1E293B] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-[#F8FAFC]">Evaluation Judges</h3>
              <p className="text-[11px] text-slate-400 dark:text-[#64748B] m-0">Evaluation judges score in the app; they feed the ranking and analysis.</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">Judge</label>
                <select value={selectedJudge} onChange={(e) => setSelectedJudge(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] transition-all duration-250 hover:border-slate-300 dark:hover:border-[#334155]">
                  <option value="">— Select a judge —</option>
                  {unassignedJudges.map((j) => (
                    <option key={j.id} value={j.id}>{j.name} ({j.level || 'no level'})</option>
                  ))}
                </select>
              </div>
              <button disabled={!selectedJudge || assigning}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-11 bg-wbo-700 text-white rounded-xl text-sm font-bold hover:bg-wbo-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                onClick={() => handleAssign('evaluation')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canManage && atMax && (
        <div className="bg-slate-50 dark:bg-[#0B1120] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 m-0">
            The maximum of {MAX_JUDGES} judges has been reached.
          </p>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-250 hover:shadow-md">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No assigned judges</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Use the form above to assign judges to this fight.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-[#0B1120]">
                <tr className="border-b border-slate-200 dark:border-[#1E293B]">
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Judge</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Level</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Status</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide hidden xl:table-cell">Assigned</th>
                  {canManage && <th className="text-right py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.judge_id} className="border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all duration-200">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white dark:ring-[#111827] shadow-sm">
                          {a.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-[#F8FAFC] truncate">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 dark:text-[#94A3B8] text-xs hidden md:table-cell">{a.email}</td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">{levelBadge(a.level)}</td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        a.assignment_type === 'official'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                      }`}>
                        {assignmentTypeLabel(a.assignment_type)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Designated
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs hidden xl:table-cell">{formatDateTime(a.assigned_at)}</td>
                    {canManage && (
                      <td className="py-3.5 px-5 text-right">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 hover:text-red-700 dark:hover:text-red-300 transition-all duration-250"
                          onClick={() => handleRemove(a.judge_id)}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <BackButton fallbackRoute="/dashboard" />
      </div>
    </div>
  );
};

export default AssignJudges;
