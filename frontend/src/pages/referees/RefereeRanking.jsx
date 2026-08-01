import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getRefereeRanking } from '../../services/refereeRankingService';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (first, last) => {
  const f = (first || '?')[0].toUpperCase();
  const l = (last || '?')[0].toUpperCase();
  return `${f}${l}`;
};

const SummaryCard = ({ icon, value, label, sublabel, color }) => {
  const { theme } = useTheme();
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color || 'bg-red-50 dark:bg-[#1F2937]'}`}>
        <svg className="w-5 h-5 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-0.5">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5 truncate">{sublabel}</p>
      )}
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (score >= 90) color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  else if (score >= 75) color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  else if (score >= 60) color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  else if (score > 0) color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
};

const PositionBadge = ({ pos }) => {
  const colors = {
    1: 'bg-yellow-400 text-yellow-900 ring-yellow-300',
    2: 'bg-slate-300 text-slate-800 ring-slate-200',
    3: 'bg-amber-600 text-white ring-amber-400',
  };
  const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-2 shrink-0';
  const cls = colors[pos] || 'bg-slate-100 text-slate-600 dark:bg-[#1E293B] dark:text-[#94A3B8] ring-slate-100 dark:ring-[#1E293B]';
  return (
    <div className={`${base} ${cls}`}>
      {pos}
    </div>
  );
};

const RefereeRanking = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterFederation, setFilterFederation] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('ranking');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getRefereeRanking(token)
      .then((res) => setRanking(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar ranking'))
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
      result = result.filter((r) => r.total_fights > 0);
    } else if (filterStatus === 'without_evaluations') {
      result = result.filter((r) => r.total_fights === 0);
    }

    switch (sortOrder) {
      case 'ranking':
        result.sort((a, b) => a.position - b.position);
        break;
      case 'name':
        result.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
        break;
      case 'fights':
        result.sort((a, b) => b.total_fights - a.total_fights);
        break;
      case 'average':
        result.sort((a, b) => b.average_final_score - a.average_final_score);
        break;
      default:
        break;
    }

    return result;
  }, [ranking, searchName, filterFederation, filterStatus, sortOrder]);

  const summaryStats = useMemo(() => {
    const totalReferees = ranking.length;
    const withEvals = ranking.filter((r) => r.total_fights > 0);
    const totalEvaluations = ranking.reduce((sum, r) => sum + r.total_fights, 0);
    const overallAvg = withEvals.length > 0
      ? withEvals.reduce((sum, r) => sum + r.average_final_score, 0) / withEvals.length
      : 0;
    const bestReferee = withEvals.length > 0
      ? withEvals.reduce((best, r) => r.average_final_score > best.average_final_score ? r : best, withEvals[0])
      : null;

    return { totalReferees, totalEvaluations, overallAvg, bestReferee };
  }, [ranking]);

  const clearFilters = () => {
    setSearchName('');
    setFilterFederation('');
    setFilterStatus('all');
    setSortOrder('ranking');
  };

  const hasActiveFilters = searchName || filterFederation || filterStatus !== 'all' || sortOrder !== 'ranking';

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-800 dark:border-[#374151]" />
          <span className="text-sm text-slate-500 font-medium dark:text-[#94A3B8]">Cargando ranking...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 text-center max-w-md">
          <p className="text-amber-800 dark:text-amber-300 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* Back Button */}
        <div className="mb-2">
          <BackButton fallbackRoute="/dashboard" />
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Ranking de Árbitros</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Evaluaciones realizadas por los Supervisores
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon="M12 3v18m0-18c-2.5 2-4 4.5-4 7.5S9.5 16 12 18c2.5-2 4-4.5 4-7.5S14.5 5 12 3Zm-7 8h14"
            value={summaryStats.totalReferees}
            label="Total de Árbitros"
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <SummaryCard
            icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            value={summaryStats.bestReferee ? `${summaryStats.bestReferee.first_name} ${summaryStats.bestReferee.last_name}` : '—'}
            label="Árbitro Mejor Puntuado"
            sublabel={summaryStats.bestReferee ? `Promedio: ${summaryStats.bestReferee.average_final_score.toFixed(1)}` : ''}
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <SummaryCard
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            value={summaryStats.overallAvg.toFixed(1)}
            label="Promedio General"
            color="bg-green-50 dark:bg-green-900/20"
          />
          <SummaryCard
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            value={summaryStats.totalEvaluations}
            label="Total de Evaluaciones"
            color="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>

        {/* Filters */}
        <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
          <FilterInput
            value={searchName}
            onChange={setSearchName}
            placeholder="Buscar por nombre..."
          />
          <FilterSelect
            value={filterFederation}
            onChange={setFilterFederation}
            options={federations.map((f) => ({ value: f, label: f }))}
            placeholder="Federación"
          />
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'with_evaluations', label: 'Con evaluaciones' },
              { value: 'without_evaluations', label: 'Sin evaluaciones' },
            ]}
            placeholder="Estado"
          />
          <FilterSelect
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'ranking', label: 'Ranking' },
              { value: 'name', label: 'Nombre' },
              { value: 'fights', label: 'Cantidad de peleas' },
              { value: 'average', label: 'Promedio' },
            ]}
            placeholder="Ordenar por"
          />
        </FilterBar>

        {/* Table */}
        {filteredRanking.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1F2937] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">No se encontraron árbitros</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0F172A]/50">
                    <th className="text-left py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider w-16">Pos</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Árbitro</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden md:table-cell">Federación</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Peleas</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden sm:table-cell">Promedio</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden lg:table-cell">Descuento</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Puntaje Final</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider hidden lg:table-cell">Última Eval.</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map((ref) => (
                    <tr
                      key={ref.id}
                      className="border-b border-slate-50 dark:border-[#1E293B] hover:bg-red-50/40 dark:hover:bg-[#1A2435] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <PositionBadge pos={ref.position} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                            {getInitials(ref.first_name, ref.last_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                              {ref.first_name} {ref.last_name}
                            </p>
                            {ref.license_number && (
                              <p className="text-[10px] text-slate-400 dark:text-[#64748B]">Lic. {ref.license_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600 dark:text-[#94A3B8]">
                          {ref.federation || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                          {ref.total_fights}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                        <ScoreBadge score={ref.average_score} />
                      </td>
                      <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                        <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
                          {ref.average_deduction > 0 ? `-${ref.average_deduction.toFixed(1)}` : '0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-bold ${
                          ref.average_final_score >= 90
                            ? 'text-green-600 dark:text-green-400'
                            : ref.average_final_score >= 75
                              ? 'text-blue-600 dark:text-blue-400'
                              : ref.average_final_score >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : ref.average_final_score > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-400 dark:text-[#64748B]'
                        }`}>
                          {ref.average_final_score > 0 ? ref.average_final_score.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                        <span className="text-xs text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">
                          {formatDate(ref.last_evaluation)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => navigate(`/referees/${ref.id}/profile`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-wbo-700 dark:text-wbo-400 bg-wbo-50 dark:bg-wbo-500/10 rounded-lg hover:bg-wbo-100 dark:hover:bg-wbo-500/20 transition-all duration-200"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver Perfil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefereeRanking;