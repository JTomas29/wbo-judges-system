import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllStatistics } from '../../services/statisticsService';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { RankingSummaryCard } from '../../components/ranking/RankingBadges';
import { FilterBarSkeleton, CardsGridSkeleton } from '../../components/common/Skeletons';

const levelBadge = (level) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    senior: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${colors[level] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {level}
    </span>
  );
};

const barColor = (pct) => {
  const value = Number(pct) || 0;
  return value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
};

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RankingSummaryCard
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          value={summaryStats.totalJudges}
          label="Total Judges"
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <RankingSummaryCard
          icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          value={summaryStats.bestJudge ? summaryStats.bestJudge.name : '—'}
          label="Top Judge"
          sublabel={summaryStats.bestJudge ? `Accuracy: ${(Number(summaryStats.bestJudge.avg_match_pct) || 0).toFixed(1)}%` : ''}
          color="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <RankingSummaryCard
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          value={`${summaryStats.overallAvg.toFixed(1)}%`}
          label="Overall Accuracy"
          color="bg-green-50 dark:bg-green-900/20"
        />
        <RankingSummaryCard
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          value={summaryStats.totalFights}
          label="Fights Evaluated"
          color="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Filters */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchName} onChange={setSearchName} placeholder="Search by name..." />
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
                className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40"
                onClick={() => navigate(`/profile/${judge.id}`)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/profile/${judge.id}`); } }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-300 dark:text-slate-600 w-6 text-right shrink-0">#{i + 1}</span>
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate dark:text-[#F8FAFC]">{judge.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {levelBadge(judge.level)}
                        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{judge.total_fights} fights</span>
                        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{judge.total_rounds} rounds</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6 sm:min-w-[400px]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Historical accuracy</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{avgPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-[#1F2937]">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(avgPct)}`} style={{ width: `${Math.min(avgPct, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Last 5 fights</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{last5.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-[#1F2937]">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(last5)}`} style={{ width: `${Math.min(last5, 100)}%` }} />
                      </div>
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
