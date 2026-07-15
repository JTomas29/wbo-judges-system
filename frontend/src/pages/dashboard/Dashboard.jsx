import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../services/dashboardService';
import { getMyAssignments } from '../../services/judgeService';

const statusColors = {
  scheduled: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Programada' },
  active: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', label: 'Activa' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Finalizada' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400', label: 'Cancelada' },
};

const getStatusColor = (status) =>
  statusColors[status] || { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: status };

const judgeInitials = (name) =>
  name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFights, setActiveFights] = useState([]);
  const [activeFightsLoading, setActiveFightsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboard(token);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  useEffect(() => {
    if (!token || user?.role !== 'judge') return;
    let cancelled = false;
    setActiveFightsLoading(true);
    getMyAssignments(token)
      .then((res) => {
        if (!cancelled) {
          setActiveFights(
            (res.data || []).filter(
              (a) => a.assignment_status === 'confirmed' && a.fight_status === 'active'
            )
          );
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setActiveFightsLoading(false); });
    return () => { cancelled = true; };
  }, [token, user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 h-[140px]">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3"></div>
              <div className="h-9 w-16 bg-gray-200 rounded mb-3"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-4 bg-white rounded-xl shadow-sm p-5 h-[400px]"></div>
          <div className="xl:col-span-8 space-y-5">
            <div className="bg-white rounded-xl shadow-sm p-5 h-[300px]"></div>
            <div className="bg-white rounded-xl shadow-sm p-5 h-[250px]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Error al cargar</h3>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 text-sm font-bold text-white bg-[#6b1421] rounded-xl hover:bg-[#4a0f14] transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { stats, recent_fights, active_judges } = data;
  const now = new Date().toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statCards = [
    { label: 'Total Peleas', value: stats.total_fights, color: 'border-[#6b1421]', iconColor: 'bg-[#fcf0f2]' },
    { label: 'Peleas Activas', value: stats.active_fights, color: 'border-blue-500', iconColor: 'bg-blue-50' },
    { label: 'Finalizadas', value: stats.completed_fights, color: 'border-gray-400', iconColor: 'bg-gray-100' },
    { label: 'Jueces Registrados', value: stats.total_judges, color: 'border-amber-400', iconColor: 'bg-amber-50' },
  ];

  const isEmpty = recent_fights.length === 0 && active_judges.length === 0;

  return (
    <div className="space-y-6">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
        <span className="relative flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-green-500"></span>
        </span>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
          Sistema Activo
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-400 mt-1">Última actualización: {now}</p>
        </div>
        <div className="text-xs text-gray-300 tracking-wide">
          <span className="text-gray-400">WBO</span> &gt; Dashboard
        </div>
      </div>

      {isEmpty && recent_fights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No hay datos disponibles</h3>
          <p className="text-sm text-gray-400 mb-6">Aún no se han registrado peleas o jueces en el sistema.</p>
          <button
            onClick={() => navigate('/fights/create')}
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#6b1421] rounded-xl hover:bg-[#4a0f14] transition-colors"
          >
            Crear primera pelea
          </button>
        </div>
      ) : (
        <>
          {/* Juez: Mis peleas activas */}
          {user?.role === 'judge' && (
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Puntuaci\u00f3n</p>
                  <h3 className="text-lg font-bold text-gray-900">Mis peleas activas</h3>
                </div>
              </div>
              {activeFightsLoading ? (
                <div className="flex items-center gap-2 py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-[#6b1421]" />
                  <span className="text-sm text-gray-400">Cargando...</span>
                </div>
              ) : activeFights.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No ten\u00e9s peleas activas</p>
                  <p className="text-xs text-gray-400">Cuando una pelea que confirmaste est\u00e9 activa, aparecer\u00e1 aqu\u00ed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                      {activeFights.map((a) => {
                        const isScored = a.scorecard_status === 'finalized';
                        return (
                          <div key={a.fight_id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 hover:bg-[#fcf0f2] transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-800 truncate">{a.event_name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {a.boxer_red} vs {a.boxer_blue}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(a.scheduled_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {a.venue ? ` \u00b7 ${a.venue}` : ''}
                              </p>
                            </div>
                            {isScored ? (
                              <div className="shrink-0 text-right">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Tarjeta enviada
                                </span>
                                <p className="text-[10px] text-gray-400 mt-0.5">Esperando a los demás jueces.</p>
                              </div>
                            ) : (
                              <button
                                className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-[#6b1421] text-white rounded-lg text-xs font-semibold hover:bg-[#4a0f14] transition-colors"
                                onClick={() => navigate(`/scoring/${a.fight_id}`)}
                              >
                                Puntuar
                              </button>
                            )}
                          </div>
                        );
                      })}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`bg-white rounded-xl shadow-sm border-t-[4px] ${card.color} p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px]">{card.label}</p>
                    <p className="text-4xl font-extrabold text-gray-900 mt-1.5">{card.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-full ${card.iconColor} flex items-center justify-center shrink-0`}>
                    <svg viewBox="0 0 64 64" fill="none" className="w-6 h-6">
                      <ellipse cx="22" cy="38" rx="10" ry="14" fill="#6b1421" opacity="0.85" />
                      <ellipse cx="42" cy="38" rx="10" ry="14" fill="#6b1421" opacity="0.85" />
                      <circle cx="22" cy="38" r="6" fill="white" opacity="0.15" />
                      <circle cx="42" cy="38" r="6" fill="white" opacity="0.15" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* LEFT: Quick Actions */}
            <div className="xl:col-span-4 space-y-5">
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Acciones Rápidas</p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Operaciones</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/fights/create')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-white bg-[#6b1421] rounded-xl hover:bg-[#4a0f14] transition-all shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      Nueva Pelea
                    </div>
                    <span className="text-white/60 text-lg leading-none">+</span>
                  </button>
                  <button
                    onClick={() => navigate('/fights')}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.99]"
                  >
                    <span>Ver Peleas</span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {user?.role !== 'judge' && (
                    <button
                      onClick={() => navigate('/judges')}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.99]"
                    >
                      <span>Ver Jueces</span>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/analysis/statistics')}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.99]"
                  >
                    <span>Ver Análisis</span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div className="relative flex w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full w-3 h-3 bg-green-500"></span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 leading-tight">Todos los sistemas operativos</p>
                    <p className="text-[11px] text-gray-400">Base de datos conectada · API activa</p>
                  </div>
                </div>
              </div>

              {/* Judges Mini Card */}
              {active_judges.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Cuerpo de Árbitros</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Jueces Activos</h3>
                  <div className="space-y-3">
                    {active_judges.slice(0, 3).map((judge) => (
                      <div key={judge.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#fcf0f2] transition-colors">
                        <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#6b1421] to-[#4a0f14] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {judgeInitials(judge.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{judge.name}</p>
                          <p className="text-[11px] text-gray-400">{judge.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-[#6b1421]">{judge.avg_match_pct !== null ? `${judge.avg_match_pct}%` : '—'}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">Activo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {user?.role !== 'judge' && (
                    <button
                      onClick={() => navigate('/judges')}
                      className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#7a1f2b] hover:text-[#6b1421] transition-colors"
                    >
                      Ver panel completo
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="xl:col-span-8 space-y-5">
              {/* Recent Activity Table */}
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Actividad Reciente</p>
                    <h3 className="text-lg font-bold text-gray-900">Últimos Combates</h3>
                  </div>
                  <button
                    onClick={() => navigate('/fights')}
                    className="text-sm font-semibold text-[#7a1f2b] hover:text-[#6b1421] transition-colors shrink-0"
                  >
                    Ver todas &gt;
                  </button>
                </div>

                {recent_fights.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">No hay peleas registradas aún.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px]">Combate</th>
                          <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden md:table-cell">Fecha</th>
                          <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden lg:table-cell">Rounds</th>
                          <th className="text-center py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden lg:table-cell">Jueces</th>
                          <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent_fights.map((fight) => {
                          const st = getStatusColor(fight.status);
                          return (
                            <tr
                              key={fight.id}
                              className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/fights/${fight.id}`)}
                            >
                              <td className="py-3.5 px-3">
                                <span className="text-sm font-semibold text-gray-800">{fight.event_name}</span>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {fight.boxer_red} vs {fight.boxer_blue}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-gray-500 hidden md:table-cell">{formatDate(fight.scheduled_date)}</td>
                              <td className="py-3.5 px-3 hidden lg:table-cell">
                                <span className="text-xs font-medium text-[#6b1421] bg-[#fcf0f2] px-2.5 py-1 rounded-full">
                                  {fight.total_rounds} rounds
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center hidden lg:table-cell">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#6b1421] text-white text-[10px] font-bold">
                                  {fight.confirmed_judges}
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Mostrando <span className="font-semibold text-gray-600">{recent_fights.length}</span> de{' '}
                    <span className="font-semibold text-gray-600">{stats.total_fights}</span> peleas
                  </p>
                  <p className="text-xs text-gray-300">Temporada 2026</p>
                </div>
              </div>

              {/* Judges Detail Cards */}
              {active_judges.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Cuerpo de Árbitros</p>
                      <h3 className="text-lg font-bold text-gray-900">Jueces Destacados</h3>
                    </div>
                    {user?.role !== 'judge' && (
                      <button
                        onClick={() => navigate('/judges')}
                        className="text-sm font-semibold text-[#7a1f2b] hover:text-[#6b1421] transition-colors shrink-0"
                      >
                        Ver panel completo &gt;
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {active_judges.slice(0, 3).map((judge, idx) => {
                      const colors = [
                        { bg: 'from-[#6b1421] to-[#4a0f14]', bar: 'bg-[#6b1421]' },
                        { bg: 'from-blue-600 to-blue-700', bar: 'bg-blue-600' },
                        { bg: 'from-gray-400 to-gray-500', bar: 'bg-gray-400' },
                      ];
                      const c = colors[idx] || colors[2];
                      const pct = judge.avg_match_pct !== null ? judge.avg_match_pct : 0;
                      return (
                        <div key={judge.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-[42px] h-[42px] rounded-full bg-gradient-to-br ${c.bg} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                              {judgeInitials(judge.name)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 truncate">{judge.name}</p>
                              <p className="text-[11px] text-gray-400">{judge.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs font-bold text-gray-700">★ {pct}%</span>
                            <span className="text-[11px] text-gray-400 ml-auto">{judge.total_analyzed} peleas</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
