import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightAnalysis } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';

const levelBadge = (level) => {
  const map = {
    elite: {
      className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    senior: {
      className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    junior: {
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  };
  return map[level] || { className: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600', icon: null };
};

const assignmentLabel = (t) => t === 'referee_evaluator' ? 'Evaluador de Árbitro' : 'Evaluador';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const FightAnalysis = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterJudge, setFilterJudge] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterRound, setFilterRound] = useState('');

  const filteredJudgesAnalysis = useMemo(() => {
    if (!data?.judges_analysis) return [];
    return data.judges_analysis
      .filter((judge) => {
        if (filterJudge && !judge.judge_name?.toLowerCase().includes(filterJudge.toLowerCase())) return false;
        return true;
      })
      .map((judge) => {
        if (!filterResult && !filterRound) return judge;
        const filteredRounds = (judge.rounds || []).filter((r) => {
          if (filterResult && r.result !== filterResult) return false;
          if (filterRound && String(r.round_number) !== filterRound) return false;
          return true;
        });
        return { ...judge, rounds: filteredRounds };
      });
  }, [data, filterJudge, filterResult, filterRound]);

  const clearFilters = () => {
    setFilterJudge('');
    setFilterResult('');
    setFilterRound('');
  };

  const hasActiveFilters = filterJudge || filterResult || filterRound;

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const isJudge = user?.role === 'judge';

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getFightAnalysis(fightId, token);
        if (cancelled) return;
        setData(res.data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (status === 400 && msg) setError(msg);
        else if (status === 403 && msg) setError(msg);
        else setError(msg || 'Error al cargar el análisis');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fightId, token, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm p-10 text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-[#374151] border-t-wbo-700 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-[#94A3B8] text-sm">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-sm px-10 py-12 text-center max-w-md w-full dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5 dark:bg-amber-900/30">
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 font-medium text-base leading-relaxed dark:text-yellow-300">{error}</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.fight) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-sm p-10 text-center max-w-sm w-full dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <p className="text-slate-400 dark:text-[#94A3B8]">No hay datos de análisis disponibles.</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { fight, official_card, consistency } = data;
  const judges_analysis = filteredJudgesAnalysis;

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-fadeIn">
      <div className="mb-4">
        <BackButton />
      </div>

      {/* Filters */}
      {data?.judges_analysis?.length > 0 && (
        <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
          <FilterInput value={filterJudge} onChange={setFilterJudge} placeholder="Buscar juez..." />
          <FilterSelect
            value={filterResult}
            onChange={setFilterResult}
            options={[
              { value: 'OK', label: 'OK' },
              { value: 'ERROR', label: 'ERROR' },
            ]}
            placeholder="Resultado"
          />
          <FilterSelect
            value={filterRound}
            onChange={setFilterRound}
            options={Array.from({ length: data.fight?.total_rounds || 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Round ${i + 1}`,
            }))}
            placeholder="Round"
          />
        </FilterBar>
      )}

      {/* General info */}
      <div className="bg-white rounded-xl shadow-sm p-5 dark:bg-[#111827] dark:border dark:border-[#1E293B]">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 m-0 dark:text-[#F8FAFC]">{fight.event_name}</h2>
            <p className="text-sm text-slate-400 dark:text-[#94A3B8]">{fight.boxer_red} vs {fight.boxer_blue}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analizada
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider dark:text-[#94A3B8]">Fecha</label>
            <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{formatDate(fight.scheduled_date)}</span>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider dark:text-[#94A3B8]">Categoría</label>
            <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{fight.weight_class || '—'}</span>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider dark:text-[#94A3B8]">Lugar</label>
            <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{fight.venue || '—'}</span>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider dark:text-[#94A3B8]">Estado</label>
            <span className="font-semibold text-slate-800 dark:text-[#F8FAFC] capitalize">{fight.status}</span>
          </div>
        </div>
      </div>

      {/* Official card result */}
      {official_card && (
        <div className="bg-white rounded-xl shadow-sm p-5 dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 dark:text-[#94A3B8]">Resultado Oficial</h3>
          <div className="grid grid-cols-3 gap-4 max-w-md mb-4">
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 dark:text-[#94A3B8]">Total Rojo</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">{official_card.total_score_red}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 dark:text-[#94A3B8]">Total Azul</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">{official_card.total_score_blue}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 dark:text-[#94A3B8]">Ganador</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">{official_card.winner || 'Empate'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2.5 bg-wbo-700 text-white rounded-lg text-xs font-semibold shadow-sm">
              <span>Round</span><span className="text-center">{fight.boxer_red}</span><span className="text-center">{fight.boxer_blue}</span>
            </div>
            {official_card.rounds?.map((r) => (
              <div key={r.round_number} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2 bg-slate-50 even:bg-white rounded-lg dark:bg-[#0B1120] dark:even:bg-[#1A2435]">
                <span className="font-bold text-wbo-700 text-sm">R{r.round_number}</span>
                <span className="text-center font-bold text-slate-800 dark:text-[#F8FAFC]">{r.score_red}</span>
                <span className="text-center font-bold text-slate-800 dark:text-[#F8FAFC]">{r.score_blue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Judge cards */}
      {judges_analysis?.map((judge) => (
        <div key={judge.judge_id} className="bg-white rounded-xl shadow-sm p-5 dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-slate-900 m-0 dark:text-[#F8FAFC]">{judge.judge_name}</h3>
            {judge.level && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${levelBadge(judge.level).className}`}>
                {levelBadge(judge.level).icon}
                {judge.level}
              </span>
            )}
            {judge.assignment_type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {assignmentLabel(judge.assignment_type)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mb-4">
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Aciertos</p>
              <p className="text-lg font-extrabold text-green-600 dark:text-green-400">{judge.matches}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Errores</p>
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{judge.errors}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-[#0B1120]">
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Precisión</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC]">{judge.match_pct != null ? `${judge.match_pct}%` : '—'}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1 dark:text-[#94A3B8]">
              <span>Precisión</span>
              <span>{judge.match_pct != null ? `${judge.match_pct}%` : '—'}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden dark:bg-[#1F2937]">
              <div
                className={`h-full rounded-full transition-all ${judge.match_pct >= 80 ? 'bg-green-500' : judge.match_pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${judge.match_pct || 0}%` }}
              />
            </div>
          </div>

          {/* Round table */}
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 dark:text-[#94A3B8]">Detalle por Round</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-wbo-700 text-white">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase first:rounded-l-lg">Round</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase">Oficial Rojo</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase">Oficial Azul</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase">Juez Rojo</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase">Juez Azul</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase last:rounded-r-lg">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {judge.rounds?.map((r) => (
                  <tr key={r.round_number} className="border-b border-slate-50 hover:bg-slate-50 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
                    <td className="py-2 px-3 font-bold text-wbo-700">R{r.round_number}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800 dark:text-[#F8FAFC]">{r.official_score_red}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800 dark:text-[#F8FAFC]">{r.official_score_blue}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800 dark:text-[#F8FAFC]">{r.judge_score_red}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800 dark:text-[#F8FAFC]">{r.judge_score_blue}</td>
                    <td className="py-2 px-3 text-center">
                      {r.result === 'OK' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs dark:text-green-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs dark:text-red-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          ERROR
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Consistency table */}
      {isStaff && consistency?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 dark:text-[#94A3B8]">Consistencia entre Jueces</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-wbo-700 text-white">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase first:rounded-l-lg">Juez A</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Juez B</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase last:rounded-r-lg">Coincidencia</th>
                </tr>
              </thead>
              <tbody>
                {consistency.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-[#F8FAFC]">{c.judge_a_name}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-[#F8FAFC]">{c.judge_b_name}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{c.match_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {judges_analysis?.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center dark:bg-[#111827] dark:border dark:border-[#1E293B]">
          <p className="text-slate-400 dark:text-[#94A3B8]">No hay análisis disponible para los jueces de esta pelea.</p>
        </div>
      )}
    </div>
  );
};

export default FightAnalysis;
