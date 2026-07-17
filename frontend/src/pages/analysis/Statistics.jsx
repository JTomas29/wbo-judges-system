import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllStatistics, getJudgeStatistics } from '../../services/statisticsService';
import { useNavigate } from 'react-router-dom';

const levelBadge = (level) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-blue-100 text-blue-700',
    intermediate: 'bg-amber-100 text-amber-700',
    senior: 'bg-purple-100 text-purple-700',
    elite: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${colors[level] || 'bg-slate-100 text-slate-600'}`}>
      {level}
    </span>
  );
};

const StatsCard = ({ icon, value, label, trend }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
      <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-3xl font-bold text-slate-900 mb-0.5">{value}</p>
    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
    {trend && (
      <div className="mt-2 flex items-center gap-1">
        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-[10px] font-semibold text-green-600">{trend}</span>
      </div>
    )}
  </div>
);

const ProgressMetric = ({ label, value, max = 100, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color || (pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500');
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <span className="text-sm font-bold text-slate-900">{value.toFixed(1)}%</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const PerformanceRing = ({ pct, size = 130, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90 drop-shadow-sm">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className={`transition-all duration-1000 ease-out ${pct >= 80 ? 'stroke-green-500' : pct >= 60 ? 'stroke-amber-500' : 'stroke-red-500'}`} />
    </svg>
  );
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
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
      <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-800" />
          <span className="text-sm text-slate-500 font-medium">Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-md">
          <p className="text-amber-800 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600">No hay estadísticas disponibles</p>
        </div>
      </div>
    );
  }

  const backBtnLabel = user?.role === 'judge' ? '\u2190 Volver al Dashboard' : '\u2190 Volver al ranking';
  const backBtnAction = user?.role === 'judge' ? () => navigate('/dashboard') : backToList;

  if (selectedJudge && judgeHistory) {
    const { name, level, total_fights, total_rounds, avg_match_pct, last_5_avg, history } = judgeHistory;
    const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
    const consistency = avg_match_pct && last_5_avg ? 100 - Math.abs(avg_match_pct - last_5_avg) : 0;

    return (
      <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
        <div className="max-w-[1440px] mx-auto space-y-6">

          {/* Back */}
          <button onClick={backBtnAction} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-900 transition-all px-4 py-2 rounded-xl shadow-sm hover:shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            {user?.role === 'judge' ? 'Dashboard' : 'Ranking'}
          </button>

          {/* Profile + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-3xl font-bold shadow-sm mb-4">
                  {initials}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  {levelBadge(level)}
                </div>
                <div className="w-full grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{total_fights}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Peleas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{total_rounds}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Rounds</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{avg_match_pct?.toFixed(0) || 0}%</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Precisión</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatsCard icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" value={total_fights} label="Peleas evaluadas" />
              <StatsCard icon="M13 10V3L4 14h7v7l9-11h-7z" value={total_rounds} label="Rounds puntuados" />
              <StatsCard icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" value={`${avg_match_pct?.toFixed(1) || 0}%`} label="Precisión promedio" trend={total_fights > 0 ? `${last_5_avg?.toFixed(1)}% últ. 5` : null} />
              <StatsCard icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" value={level || '\u2014'} label="Nivel actual" />
            </div>
          </div>

          {/* Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProgressMetric label="Precisión histórica" value={avg_match_pct || 0} />
              <ProgressMetric label="Últimas 5 peleas" value={last_5_avg || 0} />
              <ProgressMetric label="Consistencia" value={consistency} max={100} />
              <ProgressMetric label="Promedio general" value={avg_match_pct ? (avg_match_pct + (last_5_avg || 0)) / 2 : 0} />
            </div>

            {/* Performance ring */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all duration-300 hover:shadow-md flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-slate-900 mb-4 self-start">Rendimiento General</h3>
              <div className="flex items-center gap-8">
                <div className="relative">
                  <PerformanceRing pct={avg_match_pct || 0} size={130} strokeWidth={10} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{avg_match_pct?.toFixed(0) || 0}%</p>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Precisión</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${avg_match_pct >= 80 ? 'bg-green-500' : avg_match_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-slate-700 font-medium">
                      {avg_match_pct >= 80 ? 'Excelente' : avg_match_pct >= 60 ? 'Regular' : 'Necesita mejorar'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-700 font-medium">{total_fights} peleas evaluadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-sm text-slate-700 font-medium">{total_rounds} rounds juzgados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          {historyLoading && (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-red-800" />
              <span className="text-sm text-slate-500">Cargando historial...</span>
            </div>
          )}

          {historyError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800 font-medium text-sm">{historyError}</p>
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
              <p className="text-sm font-semibold text-slate-500">Este juez no tiene peleas analizadas</p>
            </div>
          )}

          {!historyLoading && !historyError && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <div className="px-6 pt-5 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Historial de peleas</h3>
                <p className="text-xs text-slate-500 mt-0.5">{history.length} pele{history.length !== 1 ? 'as' : 'a'} analizada{history.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Evento</th>
                      <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">%</th>
                      <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nivel</th>
                      <th className="text-center py-3.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr
                        key={h.fight_id}
                        className="border-b border-slate-50 hover:bg-red-50/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/analysis/${h.fight_id}`)}
                      >
                        <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap text-xs">
                          {formatDate(h.scheduled_date)}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-slate-800 text-sm">{h.event_name}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`font-bold text-sm ${h.match_pct >= 80 ? 'text-green-600' : h.match_pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {h.match_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">{levelBadge(h.level)}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
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
      </div>
    );
  }

  // ─── RANKING LIST VIEW (admin / supervisor) ───
  return (
    <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ranking de Jueces</h1>
          <p className="text-sm text-slate-500 mt-1">Rendimiento y estadísticas de todos los jueces</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {judges.map((judge, i) => {
            const initials = judge.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
            const barColor = (pct) => pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div
                key={judge.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                onClick={() => openJudgeDetail(judge)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-300 w-6 text-right shrink-0">#{i + 1}</span>
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">{judge.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {levelBadge(judge.level)}
                        <span className="text-xs text-slate-500">{judge.total_fights} peleas</span>
                        <span className="text-xs text-slate-500">{judge.total_rounds} rounds</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6 sm:min-w-[400px]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Precisión histórica</span>
                        <span className="text-xs font-bold text-slate-700">{judge.avg_match_pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(judge.avg_match_pct)}`} style={{ width: `${Math.min(judge.avg_match_pct, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Últimas 5 peleas</span>
                        <span className="text-xs font-bold text-slate-700">{judge.last_5_avg.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(judge.last_5_avg)}`} style={{ width: `${Math.min(judge.last_5_avg, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
