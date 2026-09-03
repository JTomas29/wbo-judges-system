import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getRefereeProfile } from '../../services/refereeRankingService';
import { getRefereeObservations, downloadRefereePdf, createObservation, deleteObservation } from '../../services/profileService';
import { RefereeIcon } from '../../components/common/icons';
import { ChartBarIcon, ArrowTrendingUpIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Skeleton, ProfileHeaderSkeleton } from '../../components/common/Skeletons';

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

const getResultMeta = (pct) => {
  if (pct >= 80) return { label: 'Excellent', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800/50', bar: 'bg-gradient-to-r from-green-500 to-emerald-400' };
  if (pct >= 60) return { label: 'Good', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', bar: 'bg-gradient-to-r from-amber-500 to-yellow-400' };
  if (pct >= 40) return { label: 'Fair', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', bar: 'bg-gradient-to-r from-orange-500 to-amber-400' };
  return { label: 'Needs improvement', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', bar: 'bg-gradient-to-r from-red-500 to-rose-400' };
};

const ProgressBar = ({ value, size = 'md' }) => {
  const meta = getResultMeta(value);
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className={`w-full ${heights[size]} rounded-full bg-slate-100 dark:bg-[#1E293B] overflow-hidden`}>
      <div className={`${heights[size]} rounded-full ${meta.bar} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
};

const SectionCard = ({ Icon, title, description, children, delay = 0 }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden animate-[fadeIn_0.45s_ease-out]" style={{ animationDelay: `${delay}ms` }}>
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/10">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">{title}</h3>
        {description && <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon, value, label, color, iconBg, iconColor, labelColor, valueColor }) => (
  <div className={`${color} rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor} m-0 leading-none`}>{label}</p>
        <p className={`text-lg font-extrabold ${valueColor} mt-1 m-0 leading-tight tabular-nums`}>{value}</p>
      </div>
    </div>
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
      <path d={linePath} fill="none" stroke={isDark ? '#EF4444' : '#991B1B'} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Area fill */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#EF4444' : '#991B1B'} stopOpacity="0.15" />
          <stop offset="100%" stopColor={isDark ? '#EF4444' : '#991B1B'} stopOpacity="0.01" />
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
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsFormFightId, setObsFormFightId] = useState('');
  const [obsFormText, setObsFormText] = useState('');
  const [obsSubmitting, setObsSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    const loadObs = getRefereeObservations(id, token)
      .then((res) => setObservations(res.data || []))
      .catch(() => setObservations([]));
    Promise.all([getRefereeProfile(id, token), loadObs])
      .then(([res]) => setData(res.data))
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

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await downloadRefereePdf(id, token);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `perfil-arbitro-${profile.last_name.toLowerCase()}.pdf`);
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

  const refereeFightOptions = (history || []).map((h) => ({ id: h.fight_id, label: `${h.event_name} — ${formatDate(h.fight_date)}` }));

  const handleSubmitObservation = async (e) => {
    e.preventDefault();
    if (!obsFormFightId || !obsFormText.trim()) return;
    setObsSubmitting(true);
    try {
      await createObservation({
        entity_type: 'referee',
        entity_id: id,
        fight_id: parseInt(obsFormFightId, 10),
        observation: obsFormText.trim(),
      }, token);
      const res = await getRefereeObservations(id, token);
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

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      <div className="max-w-[1440px] mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">

        {/* ── Hero: Referee Header ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-wbo-900 via-wbo-800 to-red-900 dark:from-[#111827] dark:via-[#1a1528] dark:to-[#2d1020] rounded-2xl border border-wbo-700/30 dark:border-[#1E293B] shadow-lg p-6 md:p-8">
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="mb-5">
              <button onClick={() => navigate('/ranking?tab=arbitros')}
                className="inline-flex items-center gap-1.5 text-wbo-200 dark:text-[#94A3B8] text-xs font-semibold hover:text-white dark:hover:text-white transition-colors m-0 p-2 min-h-11 min-w-11 bg-transparent border-0 cursor-pointer rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Ranking
              </button>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="shrink-0">
                  <div className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-2xl bg-gradient-to-br from-white/20 to-white/5 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-xl ring-2 ring-white/20 backdrop-blur-sm">
                    {initials}
                  </div>
                </div>
                <div className="min-w-0 pt-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate m-0">{profile.first_name} {profile.last_name}</h1>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white border border-white/10 backdrop-blur-sm text-xs font-bold">
                      <RefereeIcon className="w-3.5 h-3.5" />
                      Arbitro
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 text-white border border-white/10 backdrop-blur-sm text-xs font-bold">
                      WBO
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${profile.active ? 'text-green-300 dark:text-green-400' : 'text-white/40 dark:text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.active ? 'bg-green-400' : 'bg-white/30 dark:bg-slate-600'}`} />
                      {profile.active ? 'Active' : 'Inactive'}
                    </span>
                    {profile.license_number && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 text-wbo-200 border border-white/10 backdrop-blur-sm text-xs font-bold">
                        License: {profile.license_number}
                      </span>
                    )}
                    {profile.federation && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 text-wbo-200 border border-white/10 backdrop-blur-sm text-xs font-bold">
                        {profile.federation}
                      </span>
                    )}
                    {user?.role !== 'judge' && (
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

              {stats && stats.totalFights > 0 && (
                <div className="shrink-0 w-full lg:w-auto lg:min-w-[360px]">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 lg:border-l lg:pl-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{stats.totalFights}</p>
                        <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Peleas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{stats.averageFinalScore.toFixed(1)}</p>
                        <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Avg. Final</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-white m-0 tabular-nums">{stats.bestScore.toFixed(1)}</p>
                        <p className="text-[10px] font-bold text-wbo-200 uppercase tracking-wider mt-0.5 m-0">Best</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-1000 ease-out" style={{ width: `${Math.min(stats.averageFinalScore, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            value={stats.totalFights}
            label="Peleas"
            color="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/25"
            iconBg="bg-blue-100 dark:bg-blue-800/30"
            iconColor="text-blue-600 dark:text-blue-400"
            labelColor="text-blue-500 dark:text-blue-400/70"
            valueColor="text-blue-800 dark:text-blue-200"
          />
          <StatCard
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            value={stats.averageFinalScore.toFixed(1)}
            label="Avg. Final"
            color="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/25"
            iconBg="bg-green-100 dark:bg-green-800/30"
            iconColor="text-green-600 dark:text-green-400"
            labelColor="text-green-500 dark:text-green-400/70"
            valueColor="text-green-800 dark:text-green-200"
          />
          <StatCard
            icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            value={stats.bestScore.toFixed(1)}
            label="Mejor Eval."
            color="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/25"
            iconBg="bg-amber-100 dark:bg-amber-800/30"
            iconColor="text-amber-600 dark:text-amber-400"
            labelColor="text-amber-500 dark:text-amber-400/70"
            valueColor="text-amber-800 dark:text-amber-200"
          />
          <StatCard
            icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            value={stats.worstScore.toFixed(1)}
            label="Peor Eval."
            color="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/25"
            iconBg="bg-red-100 dark:bg-red-800/30"
            iconColor="text-red-600 dark:text-red-400"
            labelColor="text-red-500 dark:text-red-400/70"
            valueColor="text-red-800 dark:text-red-200"
          />
          <StatCard
            icon="M20 12H4m16 0a8 8 0 01-8 8m8-8a8 8 0 00-8-8m0 0a8 8 0 00-8 8m8-8v16"
            value={stats.averageDeduction.toFixed(1)}
            label="Avg. Deduccion"
            color="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/25"
            iconBg="bg-violet-100 dark:bg-violet-800/30"
            iconColor="text-violet-600 dark:text-violet-400"
            labelColor="text-violet-500 dark:text-violet-400/70"
            valueColor="text-violet-800 dark:text-violet-200"
          />
        </div>

        {/* ── Rendimiento ── */}
        {stats && stats.totalFights > 0 && (
          <SectionCard Icon={ArrowTrendingUpIcon} title="Rendimiento del Arbitro" description="Indicadores de desempeno general" delay={100}>
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/25 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400/70 uppercase tracking-wider">Precision General</span>
                  <span className={`text-xs font-extrabold tabular-nums ${getResultMeta(stats.averageFinalScore).color}`}>{stats.averageFinalScore.toFixed(1)}%</span>
                </div>
                <ProgressBar value={stats.averageFinalScore} size="lg" />
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/25 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400/70 uppercase tracking-wider">Consistencia</span>
                  <span className={`text-xs font-extrabold tabular-nums ${getResultMeta(Math.max(0, 100 - (stats.bestScore - stats.worstScore))).color}`}>{Math.max(0, Math.round(100 - (stats.bestScore - stats.worstScore)))}%</span>
                </div>
                <ProgressBar value={Math.max(0, 100 - (stats.bestScore - stats.worstScore))} size="lg" />
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Evolution Chart ── */}
        <SectionCard Icon={ChartBarIcon} title="Evolucion de Puntuacion" description="Tendencia de calificaciones a lo largo del tiempo" delay={200}>
          <div className="p-5 sm:p-6">
            <EvolutionChart data={history} />
          </div>
        </SectionCard>

        {/* ── Evaluation History ── */}
        <SectionCard Icon={TrophyIcon} title="Historial de Evaluaciones" description={`${history.length} evaluacion${history.length !== 1 ? 'es' : ''} registrada${history.length !== 1 ? 's' : ''}`} delay={300}>
          {history.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3 dark:bg-[#1F2937]">
                <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-[#94A3B8] m-0">Sin evaluaciones</p>
              <p className="text-xs text-slate-400 mt-1 dark:text-slate-500 m-0">Este arbitro no tiene evaluaciones registradas aun.</p>
            </div>
          ) : (
            <>
              {/* ── Mobile: cards ── */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-[#1E293B]">
                {history.map((evalItem) => {
                  const finalMeta = getResultMeta(evalItem.final_score);
                  return (
                    <div key={evalItem.id} onClick={() => navigate(`/analysis/${evalItem.fight_id}`)}
                      className="px-4 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2435] transition-colors active:bg-slate-100 dark:active:bg-[#0B1120]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] m-0 leading-tight">{evalItem.event_name}</p>
                        <ScoreBadge score={evalItem.score} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8] mb-2.5">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                          {formatDate(evalItem.evaluation_date)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{evalItem.supervisor_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${finalMeta.bg} ${finalMeta.color} border ${finalMeta.border}`}>
                          {evalItem.final_score.toFixed(1)}
                        </span>
                        {evalItem.point_deduction > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[11px] font-bold border border-red-200 dark:border-red-800/50">
                            -{evalItem.point_deduction} pts
                          </span>
                        )}
                        {evalItem.comments && (
                          <span className="text-[11px] text-slate-400 dark:text-[#64748B] italic truncate max-w-[45%]">{evalItem.comments}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: table ── */}
              <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-wbo-700 text-white">
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider rounded-tl-lg">Fecha</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Evento</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Supervisor</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Rating</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Deduccion</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Score Final</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider rounded-tr-lg hidden xl:table-cell">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                    {history.map((evalItem, i) => {
                      const finalMeta = getResultMeta(evalItem.final_score);
                      return (
                        <tr key={evalItem.id}
                          className={`transition-colors duration-150 hover:bg-wbo-50/40 dark:hover:bg-[#1A2435] cursor-pointer ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-[#0B1120]/40' : ''}`}
                          onClick={() => navigate(`/analysis/${evalItem.fight_id}`)}>
                          <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">{formatDate(evalItem.evaluation_date)}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-[#F8FAFC] text-sm">{evalItem.event_name}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-[#94A3B8] hidden lg:table-cell">{evalItem.supervisor_name}</td>
                          <td className="px-5 py-3.5 text-center"><ScoreBadge score={evalItem.score} /></td>
                          <td className="px-5 py-3.5 text-center hidden lg:table-cell">
                            <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
                              {evalItem.point_deduction > 0 ? `-${evalItem.point_deduction}` : '0'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${finalMeta.bg} ${finalMeta.color} border ${finalMeta.border}`}>
                              {evalItem.final_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-[#94A3B8] max-w-[200px] truncate hidden xl:table-cell">{evalItem.comments || '\u2014'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Observaciones del perfil ── */}
        {user?.role !== 'judge' && (
          <SectionCard
            Icon={({ className }) => (
              <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            )}
            title="Observaciones del perfil"
            description={`${observations.length} observación${observations.length !== 1 ? 'es' : ''} registrada${observations.length !== 1 ? 's' : ''}`}
            delay={400}
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
                            {obs.boxer_red} vs {obs.boxer_blue} · {formatDate(obs.scheduled_date)}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 m-0 whitespace-pre-wrap">{obs.observation}</p>
                          <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-2 m-0">
                            Creada por {obs.creator_name} · {formatDate(obs.created_at)}
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
                      {refereeFightOptions.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
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
          </SectionCard>
        )}

      </div>
    </div>
  );
};

export default RefereeProfile;