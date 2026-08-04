import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments } from '../../services/judgeService';
import { getFightState } from '../../utils/fightResult';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';

const STATE_META = {
  pending:    { label: 'Designado',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50' },
  active:     { label: 'Activa',      color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50' },
  finalized:  { label: 'Enviada',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50' },
  completed:  { label: 'Finalizada',  color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600/50' },
  analyzed:   { label: 'Analizada',   color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50' },
};

const getLeftBorder = (state) => {
  const map = {
    pending: 'border-l-amber-500',
    active: 'border-l-blue-500',
    finalized: 'border-l-emerald-500',
    completed: 'border-l-slate-400 dark:border-l-slate-500',
    analyzed: 'border-l-violet-500',
  };
  return map[state] || 'border-l-slate-300 dark:border-l-slate-600';
};

const assignmentTypeLabel = (type) => {
  const map = {
    evaluator: 'Evaluador del combate',
    referee_evaluator: 'Evaluador del árbitro',
  };
  return map[type] || type;
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StatCard = ({ label, count, dotColor }) => (
  <div className="flex items-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm px-4 py-3 min-w-[130px] transition-all duration-250 hover:shadow-md hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
    <div>
      <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] leading-none">{count}</p>
      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">{label}</p>
    </div>
    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ml-auto`} />
  </div>
);

const JudgeAssignments = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isJudge = user?.role === 'judge';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchEvent, setSearchEvent] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMyAssignments(token);
      setAssignments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las designaciones');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const withState = useMemo(
    () => assignments.map((a) => ({ ...a, _state: getFightState(a) })),
    [assignments],
  );

  const filteredAssignments = useMemo(() => {
    let result = [...withState];
    if (searchEvent) {
      const q = searchEvent.toLowerCase();
      result = result.filter((a) => a.event_name?.toLowerCase().includes(q));
    }
    if (filterState) {
      result = result.filter((a) => a._state === filterState);
    }
    if (sortOrder === 'closest') {
      result.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    } else if (sortOrder === 'farthest') {
      result.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    } else {
      result.sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0));
    }
    return result;
  }, [withState, searchEvent, filterState, sortOrder]);

  const counts = useMemo(() => {
    const total = assignments.length;
    const pending = withState.filter((a) => a._state === 'pending').length;
    const active = withState.filter((a) => a._state === 'active').length;
    const analyzed = withState.filter((a) => a._state === 'analyzed').length;
    return { total, pending, active, analyzed };
  }, [assignments, withState]);

  const clearFilters = () => {
    setSearchEvent('');
    setFilterState('');
    setSortOrder('');
  };

  const hasActiveFilters = searchEvent || filterState || sortOrder;

  const goTo = (a) => {
    if (a._state === 'active') {
      navigate(`/scoring/${a.fight_id}`);
    } else if (a._state === 'finalized') {
      navigate(`/scoring/${a.fight_id}`);
    } else if (a._state === 'analyzed') {
      navigate(`/analysis/${a.fight_id}`);
    } else {
      navigate(`/fights/${a.fight_id}`);
    }
  };

  const actionLabel = (a) => {
    if (a._state === 'active') return 'Puntuar pelea';
    if (a._state === 'finalized') return 'Ver mi tarjeta';
    if (a._state === 'analyzed') return 'Ver análisis';
    return 'Ver pelea';
  };

  if (!isJudge) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-6 py-4 rounded-xl text-sm font-semibold">Solo los jueces pueden acceder a esta página</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-600 border-t-red-800" />
          <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Cargando designaciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-sm font-semibold">{error}</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-2">No tenés designaciones</h3>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Cuando un administrador te asigne una pelea aparecerá aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      {/* ─── Header ─── */}
      <div className="max-w-[1440px] mx-auto mb-8">
        <div className="mb-4">
          <BackButton fallbackRoute="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Mis Designaciones</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Todas las peleas que te fueron asignadas y su estado actual.</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <StatCard label="Total" count={counts.total} dotColor="bg-slate-400" />
            <StatCard label="Designadas" count={counts.pending} dotColor="bg-amber-500" />
            <StatCard label="Activas" count={counts.active} dotColor="bg-emerald-500" />
            <StatCard label="Analizadas" count={counts.analyzed} dotColor="bg-red-500" />
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="max-w-[1440px] mx-auto mb-6">
        <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
          <FilterInput value={searchEvent} onChange={setSearchEvent} placeholder="Buscar por evento..." />
          <FilterSelect
            value={filterState}
            onChange={setFilterState}
            options={[
              { value: 'pending', label: 'Designada' },
              { value: 'active', label: 'Activa' },
              { value: 'finalized', label: 'Tarjeta enviada' },
              { value: 'completed', label: 'Finalizada' },
              { value: 'analyzed', label: 'Analizada' },
            ]}
            placeholder="Estado"
          />
          <FilterSelect
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'closest', label: 'Fecha más próxima' },
              { value: 'farthest', label: 'Fecha más lejana' },
            ]}
            placeholder="Ordenar por"
          />
        </FilterBar>
      </div>

      {/* ─── List ─── */}
      <div className="max-w-[1440px] mx-auto space-y-5">
        {filteredAssignments.map((a) => {
          const meta = STATE_META[a._state];

          return (
            <div
              key={a.fight_id}
              className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-l-[5px] ${getLeftBorder(a._state)} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{a.event_name}</h2>
                      <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        {[a.weight_class, a.venue].filter(Boolean).join(' · ') || 'Sin detalles'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Fecha
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{formatDate(a.scheduled_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Boxeador rojo
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{a.boxer_red}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Boxeador azul
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{a.boxer_blue}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Tipo de asignación
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{assignmentTypeLabel(a.assignment_type)}</p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="px-6 pb-6">
                {a._state === 'pending' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-semibold border border-amber-100 dark:border-amber-800/30">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Designado · Esperando que se active la pelea
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-300 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-250 active:scale-[0.98]"
                      onClick={() => goTo(a)}
                    >
                      Ver pelea
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                {a._state !== 'pending' && (
                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-sm font-semibold transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98]"
                    onClick={() => goTo(a)}
                  >
                    {actionLabel(a)}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JudgeAssignments;
