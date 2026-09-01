import { useState, useRef } from 'react';
import { registerResult } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';
import { RESULT_TYPE_OPTIONS, RESULT_TYPE_LABELS, isEarlyResult } from '../../utils/fightResult';

const ResultRegistration = ({ fight, onResultChange }) => {
  const { token, user } = useAuth();
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [round, setRound] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef(null);

  const isSupervisor = user?.role === 'supervisor';
  const isRegistered = !!fight?.result_type;
  const isEarly = isEarlyResult(fight);

  if (!isSupervisor) return null;
  if (fight.status === 'cancelled' || fight.status === 'archived') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!resultType) {
      setError('Select the result type.');
      return;
    }
    if (resultType !== 'nc' && !winner) {
      setError('Indicate the winner of the fight.');
      return;
    }
    if (resultType !== 'decision' && resultType !== 'nc') {
      const roundNum = parseInt(round, 10);
      if (!roundNum || roundNum < 1 || roundNum > Number(fight.total_rounds)) {
        setError(`Indicate a round between 1 and ${fight.total_rounds}.`);
        return;
      }
      if (!/^[0-9]{1,2}:[0-5][0-9]$/.test(time)) {
        setError('Indicate the time in m:ss format (e.g. 2:35).');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { result_type: resultType, winner: resultType === 'nc' ? null : winner };
      if (resultType !== 'decision' && resultType !== 'nc') {
        payload.round = parseInt(round, 10);
        payload.time = time;
      }
      const res = await registerResult(fight.id, payload, token);
      setSuccess(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSuccess(false), 5000);
      if (onResultChange) onResultChange(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register result');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/40 dark:from-[#111827] dark:to-[#0f141f] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-amber-500 shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Official Result</h3>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">Exclusive registration by the Fight Supervisor</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 m-0">Result saved successfully</p>
        </div>
      )}

      {isRegistered ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5 m-0">Result</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0">{RESULT_TYPE_LABELS[fight.result_type] || fight.result_type}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5 m-0">Winner</p>
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">{fight.result_winner || '—'}</p>
          </div>
          {isEarly ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5 m-0">Round / Time</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">R{fight.result_round} · {fight.result_time || '--:--'}</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5 m-0">Type</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">By points</p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Result type *</label>
              <select
                className="w-full px-3.5 py-2.5 min-h-11 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC]"
                value={resultType}
                onChange={(e) => setResultType(e.target.value)}
              >
                <option value="">Select...</option>
                {RESULT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {(resultType && resultType !== 'nc') ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Winner *</label>
                <select
                  className="w-full px-3.5 py-2.5 min-h-11 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC]"
                  value={winner}
                  onChange={(e) => setWinner(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value={fight.boxer_red}>{fight.boxer_red}</option>
                  <option value={fight.boxer_blue}>{fight.boxer_blue}</option>
                </select>
              </div>
            ) : (
              <div className="flex items-end pb-1">
                <p className="text-xs text-slate-400 dark:text-[#64748B] italic m-0">A fight with no decision (NC) has no winner.</p>
              </div>
            )}
          </div>

          {resultType && resultType !== 'decision' && resultType !== 'nc' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Final round *</label>
                <select
                  className="w-full px-3.5 py-2.5 min-h-11 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC]"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                >
                  <option value="">Select...</option>
                  {Array.from({ length: Number(fight.total_rounds) }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>Round {r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Time (m:ss) *</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 min-h-11 border border-slate-200 dark:border-[#1E293B] rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="2:35"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-11 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all shadow-sm hover:shadow-md disabled:opacity-40"
            >
              {saving ? 'Registering...' : 'Register result'}
            </button>
            {resultType && resultType !== 'decision' && resultType !== 'nc' && (
              <p className="text-[11px] text-slate-400 dark:text-[#64748B] italic m-0">
                By registering this result the fight will be finalized and later rounds can no longer be scored.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{error}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default ResultRegistration;
