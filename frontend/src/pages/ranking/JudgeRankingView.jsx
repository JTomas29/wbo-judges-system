import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllStatistics } from '../../services/statisticsService';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { RankingSummaryCard, PositionBadge, LevelBadge, AccuracyBar } from '../../components/ranking/RankingBadges';
import { JudgeIcon } from '../../components/common/icons';
import { FilterBarSkeleton, CardsGridSkeleton } from '../../components/common/Skeletons';

const JudgeRankingView = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchName, setSearchName] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAllStatistics(token)
      .then((res) => setJudges(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Error loading the judges ranking'))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredJudges = useMemo(() => {
    let result = [...judges];
    if (searchName) {
      const q = searchName.toLowerCase();
      result = result.filter((j) => j.name?.toLowerCase().includes(q));
    }
    if (filterLevel) {
      result = result.filter((j) => j.level === filterLevel);
    }
    if (sortOrder === 'precision_high') {
      result.sort((a, b) => (Number(b.avg_match_pct) || 0) - (Number(a.avg_match_pct) || 0));
    } else if (sortOrder === 'precision_low') {
      result.sort((a, b) => (Number(a.avg_match_pct) || 0) - (Number(b.avg_match_pct) || 0));
    } else if (sortOrder === 'fights_most') {
      result.sort((a, b) => (Number(b.total_fights) || 0) - (Number(a.total_fights) || 0));
    } else if (sortOrder === 'fights_least') {
      result.sort((a, b) => (Number(a.total_fights) || 0) - (Number(b.total_fights) || 0));
    }
    return result;
  }, [judges, searchName, filterLevel, sortOrder]);

  const summaryStats = useMemo(() => {
    const totalJudges = judges.length;
    const withFights = judges.filter((j) => Number(j.total_fights) > 0);
    const totalFights = judges.reduce((sum, j) => sum + (Number(j.total_fights) || 0), 0);
    const overallAvg = withFights.length > 0
      ? withFights.reduce((sum, j) => sum + (Number(j.avg_match_pct) || 0), 0) / withFights.length
      : 0;
    const bestJudge = withFights.length > 0
      ? withFights.reduce((best, j) => (Number(j.avg_match_pct) || 0) > (Number(best.avg_match_pct) || 0) ? j : best, withFights[0])
      : null;
    return { totalJudges, totalFights, overallAvg, bestJudge };
  }, [judges]);

  const clearFilters = () => {
    setSearchName('');
    setFilterLevel('');
    setSortOrder('');
  };

  const hasActiveFilters = searchName || filterLevel || sortOrder;

  if (loading) {
    return (
      <div className="space-y-6">
        <FilterBarSkeleton />
        <CardsGridSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 text-center max-w-md mx-auto">
        <p className="text-amber-800 dark:text-amber-300 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const positionBar = (i) => {
    if (i === 0) return 'bg-[#C9A44C]';
    if (i === 1) return 'bg-slate-400';
    if (i === 2) return 'bg-[#CD7F32]';
    return 'bg-slate-200 dark:bg-[#1E293B]';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RankingSummaryCard
          accent="blue"
          delay={0}
          icon={<JudgeIcon className="w-5 h-5" />}
          value={summaryStats.totalJudges}
          label="Total Judges"
        />
        <RankingSummaryCard
          accent="gold"
          delay={80}
          icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          value={summaryStats.bestJudge ? summaryStats.bestJudge.name : '—'}
          label="Top Judge"
          sublabel={summaryStats.bestJudge ? `Accuracy: ${(Number(summaryStats.bestJudge.avg_match_pct) || 0).toFixed(1)}%` : ''}
        />
        <RankingSummaryCard
          accent="emerald"
          delay={160}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          value={`${summaryStats.overallAvg.toFixed(1)}%`}
          label="Overall Accuracy"
        />
        <RankingSummaryCard
          accent="violet"
          delay={240}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          value={summaryStats.totalFights}
          label="Fights Evaluated"
        />
      </div>

      {/* Filters */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchName} onChange={setSearchName} placeholder="Search by name..." icon="search" />
        <FilterSelect
          value={filterLevel}
          onChange={setFilterLevel}
          options={[
            { value: 'junior', label: 'Junior' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'senior', label: 'Senior' },
            { value: 'elite', label: 'Elite' },
          ]}
          placeholder="Level"
          icon="filter"
        />
        <FilterSelect
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: 'precision_high', label: 'Highest accuracy' },
            { value: 'precision_low', label: 'Lowest accuracy' },
            { value: 'fights_most', label: 'Most fights' },
            { value: 'fights_least', label: 'Least fights' },
          ]}
          placeholder="Sort by"
          icon="sort"
        />
      </FilterBar>

      {/* List */}
      {filteredJudges.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-10 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">No judges found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJudges.map((judge, i) => {
            const initials = judge.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '??';
            const avgPct = Number(judge.avg_match_pct) || 0;
            const last5 = Number(judge.last_5_avg) || 0;
            return (
              <div
                key={judge.id}
                className="group relative bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40"
                onClick={() => navigate(`/profile/${judge.id}`)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/profile/${judge.id}`); } }}
              >
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${positionBar(i)}`} />
                <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <PositionBadge pos={i + 1} />
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center text-base font-bold shrink-0 shadow-md shadow-red-900/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-slate-900 truncate dark:text-[#F8FAFC]">{judge.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <LevelBadge level={judge.level} />
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {judge.total_fights} fights
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {judge.total_rounds} rounds
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:w-[420px] lg:shrink-0">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Historical accuracy</span>
                        <span className={`text-xs font-bold ${avgPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : avgPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{avgPct.toFixed(1)}%</span>
                      </div>
                      <AccuracyBar value={avgPct} color="auto" delay={200 + i * 60} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Last 5 fights</span>
                        <span className={`text-xs font-bold ${last5 >= 80 ? 'text-emerald-600 dark:text-emerald-400' : last5 >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{last5.toFixed(1)}%</span>
                      </div>
                      <AccuracyBar value={last5} color="auto" delay={300 + i * 60} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JudgeRankingView;
