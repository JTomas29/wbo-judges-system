import { useNavigate } from 'react-router-dom';
import { mockFights, mockJudges } from '../../data/mockData';

const statusColors = {
  Activa: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  Finalizada: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  Pendiente: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
};

const judgeInitials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const Dashboard = () => {
  const navigate = useNavigate();
  const total = mockFights.length;
  const activas = mockFights.filter((f) => f.estado === 'Activa').length;
  const finalizadas = mockFights.filter((f) => f.estado === 'Finalizada').length;
  const jueces = mockJudges.length;

  const activeJudges = mockJudges.filter((j) => j.estado === 'Activo');

  return (
    <div className="space-y-6">

      {/* System Active Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
        <span className="relative flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-green-500"></span>
        </span>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
          Sistema Activo
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Última actualización: 24 de junio, 2026 — 15:30 UTC
          </p>
        </div>
        <div className="text-xs text-gray-300 tracking-wide">
          <span className="text-gray-400">WBO</span> &gt; Dashboard
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-xl shadow-sm border-t-[4px] border-[#6b1421] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px]">Total Peleas</p>
              <p className="text-4xl font-extrabold text-gray-900 mt-1.5">{total}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#fcf0f2] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 64 64" fill="none" className="w-6 h-6">
                <ellipse cx="22" cy="38" rx="10" ry="14" fill="#6b1421" opacity="0.85"/>
                <ellipse cx="42" cy="38" rx="10" ry="14" fill="#6b1421" opacity="0.85"/>
                <circle cx="22" cy="38" r="6" fill="white" opacity="0.15"/>
                <circle cx="42" cy="38" r="6" fill="white" opacity="0.15"/>
              </svg>
            </div>
          </div>
          <p className="text-[12px] text-green-600 font-medium mt-2.5 flex items-center gap-1">
            <span>↗</span> +2 este mes
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-[4px] border-blue-500 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px]">Peleas Activas</p>
              <p className="text-4xl font-extrabold text-gray-900 mt-1.5">{activas}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
          </div>
          <p className="text-[12px] text-green-600 font-medium mt-2.5 flex items-center gap-1">
            <span>↗</span> +1 esta semana
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-[4px] border-gray-400 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px]">Finalizadas</p>
              <p className="text-4xl font-extrabold text-gray-900 mt-1.5">{finalizadas}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="text-[12px] text-gray-400 font-medium mt-2.5 flex items-center gap-1">
            <span>→</span> +0 este mes
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-[4px] border-amber-400 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px]">Jueces Registrados</p>
              <p className="text-4xl font-extrabold text-gray-900 mt-1.5">{jueces}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
          </div>
          <p className="text-[12px] text-green-600 font-medium mt-2.5 flex items-center gap-1">
            <span>↗</span> +2 este mes
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* LEFT: Quick Actions */}
        <div className="xl:col-span-4 space-y-5">
          {/* Quick Actions Card */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <button
                onClick={() => navigate('/judges')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.99]"
              >
                <span>Ver Jueces</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <button
                onClick={() => navigate('/analysis/statistics')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.99]"
              >
                <span>Ver Análisis</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {/* System status */}
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
          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Cuerpo de Árbitros</p>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Jueces Activos</h3>

            <div className="space-y-3">
              {activeJudges.slice(0, 3).map((judge) => (
                <div key={judge.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#fcf0f2] transition-colors">
                  <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#6b1421] to-[#4a0f14] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {judgeInitials(judge.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{judge.nombre}</p>
                    <p className="text-[11px] text-gray-400">{judge.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-[#6b1421]">—</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Activo</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/judges')}
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#7a1f2b] hover:text-[#6b1421] transition-colors"
            >
              Ver panel completo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* RIGHT: Recent Activity Table */}
        <div className="xl:col-span-8 space-y-5">
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px]">Expediente</th>
                    <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px]">Combate</th>
                    <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden md:table-cell">Fecha</th>
                    <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden lg:table-cell">Categoría</th>
                    <th className="text-center py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px] hidden lg:table-cell">Jueces</th>
                    <th className="text-left py-3.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[1px]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mockFights.map((fight, idx) => {
                    const st = statusColors[fight.estado] || statusColors.Pendiente;
                    return (
                      <tr
                        key={fight.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/fights/${fight.id}`)}
                      >
                        <td className="py-3.5 px-3 font-semibold text-gray-800">WBO-2026-00{idx + 1}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-sm font-semibold text-gray-800">{fight.evento}</span>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {fight.boxeadorRojo} vs {fight.boxeadorAzul}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-gray-500 hidden md:table-cell">{fight.fecha}</td>
                        <td className="py-3.5 px-3 hidden lg:table-cell">
                          <span className="text-xs font-medium text-[#6b1421] bg-[#fcf0f2] px-2.5 py-1 rounded-full">
                            {fight.rounds} rounds
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center hidden lg:table-cell">
                          <div className="flex items-center justify-center -space-x-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#6b1421] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                              {judgeInitials(mockJudges[idx % mockJudges.length]?.nombre || '—')}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {fight.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{mockFights.length}</span> de{' '}
                <span className="font-semibold text-gray-600">{mockFights.length}</span> peleas
              </p>
              <p className="text-xs text-gray-300">Temporada 2026</p>
            </div>
          </div>

          {/* Judges Detail Cards */}
          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[1.5px] mb-1">Cuerpo de Árbitros</p>
                <h3 className="text-lg font-bold text-gray-900">Jueces Destacados</h3>
              </div>
              <button
                onClick={() => navigate('/judges')}
                className="text-sm font-semibold text-[#7a1f2b] hover:text-[#6b1421] transition-colors shrink-0"
              >
                Ver panel completo &gt;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeJudges.slice(0, 3).map((judge, idx) => {
                const colors = [
                  { bg: 'from-[#6b1421] to-[#4a0f14]', bar: 'bg-[#6b1421]', level: 'Élite', levelBg: 'bg-[#6b1421]' },
                  { bg: 'from-blue-600 to-blue-700', bar: 'bg-blue-600', level: 'Senior', levelBg: 'bg-blue-600' },
                  { bg: 'from-gray-400 to-gray-500', bar: 'bg-gray-400', level: 'Junior', levelBg: 'bg-gray-400' },
                ];
                const c = colors[idx] || colors[2];
                const pct = [98, 85, 72][idx] || 80;

                return (
                  <div key={judge.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-[42px] h-[42px] rounded-full bg-gradient-to-br ${c.bg} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                        {judgeInitials(judge.nombre)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 truncate">{judge.nombre}</p>
                        <p className="text-[11px] text-gray-400">{judge.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs font-bold text-gray-700">★ {pct}%</span>
                      <span className="text-[11px] text-gray-400 ml-auto">{idx === 0 ? '12' : idx === 1 ? '8' : '5'} peleas</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.levelBg} text-white`}>{c.level}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
