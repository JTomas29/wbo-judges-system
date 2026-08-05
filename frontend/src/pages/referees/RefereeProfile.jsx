import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getRefereeProfile } from '../../services/refereeRankingService';
import BackButton from '../../components/common/BackButton';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
};

const getInitials = (first, last) => {
  const f = (first || '?')[0].toUpperCase();
  const l = (last || '?')[0].toUpperCase();
  return `${f}${l}`;
};

const StatCard = ({ icon, value, label, color }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || 'bg-red-50 dark:bg-[#1F2937]'}`}>
      <svg className="w-5 h-5 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-0.5">{value}</p>
    <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">{label}</p>
  </div>
);

const ScoreBadge = ({ score }) => {
  let cls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (score >= 90) cls = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  else if (score >= 75) cls = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  else if (score >= 60) cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  else if (score > 0) cls = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${cls}`}>
      {score.toFixed(1)}
    </span>
  );
};

// ─── Simple SVG Line Chart ──────────────────────────────────────────────────

const EvolutionChart = ({ data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-[#64748B]">
        At least 2 evaluations are required to display the chart
      </div>
    );
  }

  // Sort by date ascending
  const sorted = [...data].sort((a, b) => new Date(a.evaluation_date) - new Date(b.evaluation_date));

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = Math.max(0, Math.min(...sorted.map((d) => d.final_score)) - 5);
  const maxScore = Math.min(100, Math.max(...sorted.map((d) => d.final_score)) + 5);
  const range = maxScore - minScore || 1;

  const points = sorted.map((d, i) => ({
    x: padding.left + (i / (sorted.length - 1)) * chartW,
    y: padding.top + chartH - ((d.final_score - minScore) / range) * chartH,
    score: d.final_score,
    date: formatDateShort(d.evaluation_date),
    event: d.event_name,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Y-axis labels
  const yLabels = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = minScore + (range * i) / steps;
    yLabels.push({
      y: padding.top + chartH - (i / steps) * chartH,
      label: val.toFixed(0),
    });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yl.y}
            x2={width - padding.right}
            y2={yl.y}
            stroke={isDark ? '#1E293B' : '#E2E8F0'}
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={yl.y + 4}
            textAnchor="end"
            fill={isDark ? '#94A3B8' : '#94A3B8'}
            fontSize="10"
          >
            {yl.label}
          </text>
        </g>
      ))}

      {/* Line */}
      <path d={linePath} fill="none" stroke="#991B1B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Area fill */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#991B1B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#991B1B" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path
        d={`${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`}
        fill="url(#areaGradient)"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#991B1B" stroke="white" strokeWidth="2" className="cursor-pointer">
            <title>{`${p.event}: ${p.score.toFixed(1)} (${p.date})`}</title>
          </circle>
        </g>
      ))}

      {/* X-axis labels */}
      {points.filter((_, i) => {
        if (sorted.length <= 6) return true;
        const step = Math.ceil(sorted.length / 5);
        return i % step === 0 || i === sorted.length - 1;
      }).map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 8}
          textAnchor="middle"
          fill={isDark ? '#94A3B8' : '#94A3B8'}
          fontSize="9"
        >
          {p.date}
        </text>
      ))}
    </svg>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const RefereeProfile = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    getRefereeProfile(id, token)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('Referee not found');
        } else {
          setError(err.response?.data?.message || 'Error loading profile');
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const stats = useMemo(() => {
    if (!data?.profile) return null;
    const p = data.profile;
    return {
      totalFights: p.total_fights,
      averageScore: p.average_score,
      averageDeduction: p.average_deduction,
      averageFinalScore: p.average_final_score,
      bestScore: p.best_score,
      worstScore: p.worst_score,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-800 dark:border-[#374151]" />
          <span className="text-sm text-slate-500 font-medium dark:text-[#94A3B8]">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 text-center max-w-md">
          <p className="text-amber-800 dark:text-amber-300 font-medium">{error}</p>
          <button onClick={() => navigate('/ranking?tab=arbitros')} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
            Back to ranking
          </button>
        </div>
      </div>
    );
  }

  if (!data?.profile) return null;

  const { profile, history } = data;
  const initials = getInitials(profile.first_name, profile.last_name);

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Back */}
        <div className="mb-2">
          <BackButton fallbackRoute="/ranking?tab=arbitros" />
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-6 transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                {profile.license_number && (
                  <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1E293B] px-2.5 py-1 rounded-lg">
                    License: {profile.license_number}
                  </span>
                )}
                {profile.federation && (
                  <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1E293B] px-2.5 py-1 rounded-lg">
                    {profile.federation}
                  </span>
                )}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  profile.active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {profile.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            value={stats.totalFights}
            label="Fights"
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            value={stats.averageFinalScore.toFixed(1)}
            label="Final Average"
            color="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            value={stats.bestScore.toFixed(1)}
            label="Best Eval."
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            value={stats.worstScore.toFixed(1)}
            label="Worst Eval."
            color="bg-red-50 dark:bg-red-900/20"
          />
          <StatCard
            icon="M20 12H4m16 0a8 8 0 01-8 8m8-8a8 8 0 00-8-8m0 0a8 8 0 00-8 8m8-8v16"
            value={stats.averageDeduction.toFixed(1)}
            label="Avg. Deduction"
            color="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>

        {/* Evolution Chart */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-6 transition-all duration-300 hover:shadow-md">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] mb-4">Score Evolution</h3>
          <EvolutionChart data={history} />
        </div>

        {/* Evaluation History */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Evaluation History</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {history.length} evaluation{history.length !== 1 ? 's' : ''} recorded
            </p>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">
                This referee has no recorded evaluations
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0F172A]/50">
                    <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Date</th>
                    <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Event</th>
                    <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden sm:table-cell">Supervisor</th>
                    <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Rating</th>
                    <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden md:table-cell">Deduction</th>
                    <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Final Score</th>
                    <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden lg:table-cell">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((evalItem) => (
                    <tr
                      key={evalItem.id}
                      className="border-b border-slate-50 dark:border-[#1E293B] hover:bg-red-50/40 dark:hover:bg-[#1A2435] transition-colors cursor-pointer"
                      onClick={() => navigate(`/analysis/${evalItem.fight_id}`)}
                    >
                      <td className="py-3.5 px-6 text-xs text-slate-600 dark:text-[#94A3B8] whitespace-nowrap">
                        {formatDate(evalItem.evaluation_date)}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800 dark:text-[#F8FAFC] text-sm">
                        {evalItem.event_name}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-600 dark:text-[#94A3B8] hidden sm:table-cell">
                        {evalItem.supervisor_name}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <ScoreBadge score={evalItem.score} />
                      </td>
                      <td className="py-3.5 px-6 text-center hidden md:table-cell">
                        <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
                          {evalItem.point_deduction > 0 ? `-${evalItem.point_deduction}` : '0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`text-sm font-bold ${
                          evalItem.final_score >= 90
                            ? 'text-green-600 dark:text-green-400'
                            : evalItem.final_score >= 75
                              ? 'text-blue-600 dark:text-blue-400'
                              : evalItem.final_score >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                        }`}>
                          {evalItem.final_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500 dark:text-[#94A3B8] max-w-[200px] truncate hidden lg:table-cell">
                        {evalItem.comments || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefereeProfile;