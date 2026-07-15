import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllStatistics, getJudgeStatistics } from '../../services/statisticsService';
import { useNavigate } from 'react-router-dom';

const barColor = (pct) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const levelBadge = (level) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-blue-100 text-blue-700',
    intermediate: 'bg-amber-100 text-amber-700',
    senior: 'bg-purple-100 text-purple-700',
    elite: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[level] || 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  );
};

const Statistics = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [judgeHistory, setJudgeHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAllStatistics(token)
      .then((res) => {
        setJudges(res.data);
        if (user?.role === 'judge' && res.data.length === 1) {
          setSelectedJudge(res.data[0]);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al cargar estadísticas');
      })
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  const openJudgeDetail = (judge) => {
    setSelectedJudge(judge);
    setHistoryLoading(true);
    setHistoryError(null);
    getJudgeStatistics(judge.id, token)
      .then((res) => {
        setJudgeHistory(res.data);
      })
      .catch((err) => {
        setHistoryError(err.response?.data?.message || 'Error al cargar historial');
      })
      .finally(() => setHistoryLoading(false));
  };

  const backToList = () => {
    setSelectedJudge(null);
    setJudgeHistory(null);
    setHistoryError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#6b1421] border-t-transparent"></div>
        <span className="ml-3 text-gray-500 font-medium">Cargando estadísticas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-800 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-10 text-center">
        <p className="text-gray-500 font-medium">No hay estadísticas disponibles</p>
      </div>
    );
  }

  if (selectedJudge && judgeHistory) {
    return (
      <div>
        <button
          onClick={backToList}
          className="mb-4 text-sm text-[#6b1421] font-semibold hover:underline flex items-center gap-1"
        >
          &larr; Volver al ranking
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{judgeHistory.name}</h2>
          <div className="flex items-center gap-3 mb-4">
            {levelBadge(judgeHistory.level)}
            <span className="text-sm text-gray-400">{judgeHistory.total_fights} peleas</span>
            <span className="text-sm text-gray-400">{judgeHistory.total_rounds} rounds</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{judgeHistory.avg_match_pct.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">Precisión histórica</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{judgeHistory.last_5_avg.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">Últimas 5 peleas</p>
            </div>
          </div>
        </div>

        {historyLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#6b1421] border-t-transparent"></div>
            <span className="ml-2 text-gray-500">Cargando historial...</span>
          </div>
        )}

        {historyError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-medium text-sm">{historyError}</p>
          </div>
        )}

        {!historyLoading && !historyError && judgeHistory.history.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-gray-400 font-medium">Este juez no tiene peleas analizadas</p>
          </div>
        )}

        {!historyLoading && !historyError && judgeHistory.history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evento</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">%</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {judgeHistory.history.map((h) => (
                    <tr
                      key={h.fight_id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/analysis/${h.fight_id}`)}
                    >
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {new Date(h.scheduled_date).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{h.event_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${h.match_pct >= 80 ? 'text-green-600' : h.match_pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {h.match_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{levelBadge(h.level)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          h.match_pct >= 80
                            ? 'bg-green-100 text-green-700'
                            : h.match_pct >= 60
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {h.match_pct >= 80 ? 'Alto' : h.match_pct >= 60 ? 'Medio' : 'Bajo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {user?.role === 'judge' ? 'Mis Estadísticas' : 'Ranking de Jueces'}
      </h2>

      {judges.map((judge) => (
        <div
          key={judge.id}
          className="bg-white rounded-xl shadow-sm p-5 mb-3 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => openJudgeDetail(judge)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6b1421] to-[#4a0f14] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {judge.name?.charAt(0) || 'J'}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{judge.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {levelBadge(judge.level)}
                  <span className="text-xs text-gray-400">{judge.total_fights} peleas</span>
                  <span className="text-xs text-gray-400">{judge.total_rounds} rounds</span>
                </div>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Precisión histórica</span>
                <span className="text-sm font-bold text-gray-700">{judge.avg_match_pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded ${barColor(judge.avg_match_pct)}`}
                  style={{ width: `${Math.min(judge.avg_match_pct, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Últimas 5 peleas</span>
                <span className="text-sm font-bold text-gray-700">{judge.last_5_avg.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded ${barColor(judge.last_5_avg)}`}
                  style={{ width: `${Math.min(judge.last_5_avg, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Statistics;
