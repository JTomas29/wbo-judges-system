import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRefereeRanking } from '../../services/refereeRankingService';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { RankingSummaryCard, PositionBadge, ScoreBadge, StatusBadge } from '../../components/ranking/RankingBadges';
import { RefereeIcon } from '../../components/common/icons';
import { FilterBarSkeleton, CardsGridSkeleton } from '../../components/common/Skeletons';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (first, last) => {
  const f = (first || '?')[0].toUpperCase();
  const l = (last || '?')[0].toUpperCase();
  return `${f}${l}`;
};

const num = (v) => Number(v) || 0;

const RefereeRankingView = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchName, setSearchName] = useState('');
  const [filterFederation, setFilterFederation] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [sortOrder, setSortOrder] = useState('ranking');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getRefereeRanking(token)
      .then((res) => setRanking(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Error loading referee ranking'))
      .finally(() => setLoading(false));
  }, [token]);

  const federations = useMemo(() => {
    const feds = [...new Set(ranking.map((r) => r.federation).filter(Boolean))];
    return feds.sort();
  }, [ranking]);

  const filteredRanking = useMemo(() => {
    let result = [...ranking];

    if (searchName) {
      const q = searchName.toLowerCase();
      result = result.filter((r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q)
      );
    }

    if (filterFederation) {
      result = result.filter((r) => r.federation === filterFederation);
    }

    if (filterStatus === 'with_evaluations') {
      result = result.filter((r) => num(r.total_fights) > 0);
    } else if (filterStatus === 'without_evaluations') {
      result = result.filter((r) => num(r.total_fights) === 0);
    }

    if (filterActive === 'active') {
      result = result.filter((r) => r.active);
    } else if (filterActive === 'inactive') {
      result = result.filter((r) => !r.active);
    }

    switch (sortOrder) {
      case 'ranking':
        result.sort((a, b) => num(a.position) - num(b.position));
        break;
      case 'name':
        result.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
        break;
      case 'fights':
        result.sort((a, b) => num(b.total_fights) - num(a.total_fights));
        break;
      case 'average':
        result.sort((a, b) => num(b.average_final_score) - num(a.average_final_score));
        break;
      default:
        break;
    }

    return result;
  }, [ranking, searchName, filterFederation, filterStatus, filterActive, sortOrder]);

  const summaryStats = useMemo(() => {
    const totalReferees = ranking.length;
    const withEvals = ranking.filter((r) => num(r.total_fights) > 0);
    const totalEvaluations = ranking.reduce((sum, r) => sum + num(r.total_fights), 0);
    const overallAvg = withEvals.length > 0
      ? withEvals.reduce((sum, r) => sum + num(r.average_final_score), 0) / withEvals.length
      : 0;
    const bestReferee = withEvals.length > 0
      ? withEvals.reduce((best, r) => num(r.average_final_score) > num(best.average_final_score) ? r : best, withEvals[0])
      : null;

    return { totalReferees, totalEvaluations, overallAvg, bestReferee };
  }, [ranking]);

  const clearFilters = () => {
    setSearchName('');
    setFilterFederation('');
    setFilterStatus('all');
    setFilterActive('all');
    setSortOrder('ranking');
  };

  const hasActiveFilters = searchName || filterFederation || filterStatus !== 'all' || filterActive !== 'all' || sortOrder !== 'ranking';

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

  const finalScoreColor = (s) => {
    if (s >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (s >= 75) return 'text-blue-600 dark:text-blue-400';
    if (s >= 60) return 'text-amber-600 dark:text-amber-400';
    if (s > 0) return 'text-red-600 dark:text-red-400';
    return 'text-slate-400 dark:text-[#64748B]';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RankingSummaryCard
          accent="blue"
          delay={0}
          icon={<RefereeIcon className="w-5 h-5" />}
          value={summaryStats.totalReferees}
          label="Total Referees"
        />
        <RankingSummaryCard
          accent="gold"
          delay={80}
          icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          value={summaryStats.bestReferee ? `${summaryStats.bestReferee.first_name} ${summaryStats.bestReferee.last_name}` : '—'}
          label="Top-Rated Referee"
          sublabel={summaryStats.bestReferee ? `Average: ${num(summaryStats.bestReferee.average_final_score).toFixed(1)}` : ''}
        />
        <RankingSummaryCard
          accent="emerald"
          delay={160}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          value={summaryStats.overallAvg.toFixed(1)}
          label="Average Final Score"
        />
        <RankingSummaryCard
          accent="violet"
          delay={240}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          value={summaryStats.totalEvaluations}
          label="Total Evaluations"
        />
      </div>

      {/* Filters */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput
          value={searchName}
          onChange={setSearchName}
          placeholder="Search by name..."
          icon="search"
        />
        <FilterSelect
          value={filterFederation}
          onChange={setFilterFederation}
          options={federations.map((f) => ({ value: f, label: f }))}
          placeholder="Federation"
          icon="filter"
        />
        <FilterSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: 'Evaluations: all' },
            { value: 'with_evaluations', label: 'With evaluations' },
            { value: 'without_evaluations', label: 'Without evaluations' },
          ]}
          placeholder="Evaluations"
          icon="filter"
        />
        <FilterSelect
          value={filterActive}
          onChange={setFilterActive}
          options={[
            { value: 'all', label: 'Status: all' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          placeholder="Status"
          icon="filter"
        />
        <FilterSelect
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: 'ranking', label: 'Ranking' },
            { value: 'name', label: 'Name' },
            { value: 'fights', label: 'Number of fights' },
            { value: 'average', label: 'Average Final Score' },
          ]}
          placeholder="Sort by"
          icon="sort"
        />
      </FilterBar>

      {/* List */}
      {filteredRanking.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1F2937] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">No referees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRanking.map((ref, i) => {
            const finalScore = num(ref.average_final_score);
            return (
              <div
                key={ref.id}
                className="group relative bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${positionBar(i)}`} />
                <div className="flex flex-col xl:flex-row xl:items-center gap-5 xl:gap-8">
                  {/* Identity */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <PositionBadge pos={num(ref.position)} />
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-wbo-600 to-wbo-800 text-white flex items-center justify-center text-base font-bold shrink-0 shadow-md shadow-wbo-700/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105">
                      {getInitials(ref.first_name, ref.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-slate-900 truncate dark:text-[#F8FAFC]">
                        {ref.first_name} {ref.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {ref.license_number && (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-[#64748B]">Lic. {ref.license_number}</span>
                        )}
                        {ref.federation && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                            </svg>
                            {ref.federation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 xl:w-[480px] xl:shrink-0">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#64748B]">Fights</p>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-[#F8FAFC] tabular-nums">{num(ref.total_fights)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#64748B]">Avg Score</p>
                      <div className="mt-1"><ScoreBadge score={num(ref.average_score)} /></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#64748B]">Deduction</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-[#94A3B8] tabular-nums">
                        {num(ref.average_deduction) > 0 ? `-${num(ref.average_deduction).toFixed(1)}` : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#64748B]">Avg Final</p>
                      <p className={`text-lg font-extrabold tabular-nums ${finalScoreColor(finalScore)}`}>
                        {finalScore > 0 ? finalScore.toFixed(1) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Status + Action */}
                  <div className="flex items-center justify-between gap-4 xl:flex-col xl:items-end xl:gap-3 xl:shrink-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge active={ref.active} />
                      {ref.last_evaluation && (
                        <span className="hidden sm:inline text-xs text-slate-400 dark:text-[#64748B] whitespace-nowrap">
                          Last: {formatDate(ref.last_evaluation)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/referees/${ref.id}/profile`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-xl text-xs font-bold text-wbo-700 dark:text-wbo-300 bg-wbo-50 dark:bg-wbo-500/10 ring-1 ring-wbo-200 dark:ring-wbo-500/20 hover:bg-wbo-100 dark:hover:bg-wbo-500/20 hover:ring-wbo-300 transition-all duration-200 active:scale-[0.97]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Profile
                    </button>
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

export default RefereeRankingView;
