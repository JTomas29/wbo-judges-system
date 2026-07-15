import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightAnalysis } from '../../services/fightService';

const levelBadge = (level) => {
  const map = { elite: 'bg-green-100 text-green-800', senior: 'bg-blue-100 text-blue-800', junior: 'bg-yellow-100 text-yellow-800' };
  return map[level] || 'bg-gray-100 text-gray-500';
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
        <span className="ml-3 text-gray-500 text-sm">Cargando análisis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[700px]">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-medium">{error}</p>
          <button
            className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
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
      <div className="max-w-[700px]">
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <p className="text-gray-400">No hay datos de análisis disponibles.</p>
          <button
            className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { fight, official_card, judges_analysis, consistency } = data;

  return (
    <div className="max-w-[1000px] space-y-6">
      {/* General info */}
      <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 m-0">{fight.event_name}</h2>
            <p className="text-sm text-gray-400">{fight.boxer_red} vs {fight.boxer_blue}</p>
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            Analizada
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider">Fecha</label>
            <span className="font-semibold text-gray-800">{formatDate(fight.scheduled_date)}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider">Categoría</label>
            <span className="font-semibold text-gray-800">{fight.weight_class || '—'}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider">Lugar</label>
            <span className="font-semibold text-gray-800">{fight.venue || '—'}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider">Estado</label>
            <span className="font-semibold text-gray-800 capitalize">{fight.status}</span>
          </div>
        </div>
      </div>

      {/* Official card result */}
      {official_card && (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Resultado Oficial</h3>
          <div className="grid grid-cols-3 gap-4 max-w-md mb-4">
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Rojo</p>
              <p className="text-2xl font-extrabold text-gray-900">{official_card.total_score_red}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Azul</p>
              <p className="text-2xl font-extrabold text-gray-900">{official_card.total_score_blue}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ganador</p>
              <p className="text-sm font-extrabold text-gray-900">{official_card.winner || 'Empate'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2.5 bg-[#6b1421] text-white rounded-lg text-xs font-semibold">
              <span>Round</span><span className="text-center">{fight.boxer_red}</span><span className="text-center">{fight.boxer_blue}</span>
            </div>
            {official_card.rounds?.map((r) => (
              <div key={r.round_number} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2 bg-gray-50 even:bg-white rounded-lg">
                <span className="font-bold text-[#6b1421] text-sm">R{r.round_number}</span>
                <span className="text-center font-bold text-gray-800">{r.score_red}</span>
                <span className="text-center font-bold text-gray-800">{r.score_blue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Judge cards */}
      {judges_analysis?.map((judge) => (
        <div key={judge.judge_id} className="bg-white rounded-xl shadow-sm card-minimal p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900 m-0">{judge.judge_name}</h3>
            {judge.level && (
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${levelBadge(judge.level)}`}>
                {judge.level}
              </span>
            )}
            {judge.assignment_type && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                {assignmentLabel(judge.assignment_type)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mb-4">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400">Aciertos</p>
              <p className="text-lg font-extrabold text-green-600">{judge.matches}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400">Errores</p>
              <p className="text-lg font-extrabold text-red-600">{judge.errors}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400">Precisión</p>
              <p className="text-lg font-extrabold text-gray-900">{judge.match_pct != null ? `${judge.match_pct}%` : '—'}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Precisión</span>
              <span>{judge.match_pct != null ? `${judge.match_pct}%` : '—'}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${judge.match_pct >= 80 ? 'bg-green-500' : judge.match_pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${judge.match_pct || 0}%` }}
              />
            </div>
          </div>

          {/* Round table */}
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detalle por Round</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Round</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Oficial Rojo</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Oficial Azul</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Juez Rojo</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Juez Azul</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 uppercase">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {judge.rounds?.map((r) => (
                  <tr key={r.round_number} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-bold text-[#6b1421]">R{r.round_number}</td>
                    <td className="py-2 px-2 text-center font-semibold text-gray-800">{r.official_score_red}</td>
                    <td className="py-2 px-2 text-center font-semibold text-gray-800">{r.official_score_blue}</td>
                    <td className="py-2 px-2 text-center font-semibold text-gray-800">{r.judge_score_red}</td>
                    <td className="py-2 px-2 text-center font-semibold text-gray-800">{r.judge_score_blue}</td>
                    <td className="py-2 px-2 text-center">
                      {r.result === 'OK' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
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
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Consistencia entre Jueces</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Juez A</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Juez B</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Coincidencia</th>
                </tr>
              </thead>
              <tbody>
                {consistency.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-800">{c.judge_a_name}</td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{c.judge_b_name}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-gray-900">{c.match_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {judges_analysis?.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <p className="text-gray-400">No hay análisis disponible para los jueces de esta pelea.</p>
        </div>
      )}
    </div>
  );
};

export default FightAnalysis;
