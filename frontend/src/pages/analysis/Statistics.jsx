import { mockFights, mockJudges, mockAnalysis } from '../../data/mockData';

const barColor = (pct) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const Statistics = () => {
  const totalFights = mockFights.length;
  const activeFights = mockFights.filter((f) => f.estado === 'Activa').length;
  const finishedFights = mockFights.filter((f) => f.estado === 'Finalizada').length;
  const totalJudges = mockJudges.length;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Estadísticas Globales</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-[#6b1421]">
          <div className="text-4xl font-extrabold text-[#6b1421]">{totalFights}</div>
          <div className="text-sm text-gray-400 font-medium mt-1.5">Total Peleas</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-[#C9A44C]">
          <div className="text-4xl font-extrabold text-gold-dark">{activeFights}</div>
          <div className="text-sm text-gray-400 font-medium mt-1.5">Activas</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-blue-500">
          <div className="text-4xl font-extrabold text-blue-500">{finishedFights}</div>
          <div className="text-sm text-gray-400 font-medium mt-1.5">Finalizadas</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-amber-400">
          <div className="text-4xl font-extrabold text-amber-500">{totalJudges}</div>
          <div className="text-sm text-gray-400 font-medium mt-1.5">Jueces</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Rendimiento General de Jueces</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Juez</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Coincidencias</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Errores</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {mockAnalysis.consistencia.map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-800">{row.juez}</td>
                  <td className="py-3 px-4 text-gray-600">{row.aciertos}</td>
                  <td className="py-3 px-4 text-gray-600">{row.errores}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded ${barColor(row.porcentaje)}`} style={{ width: `${row.porcentaje}%` }}></div>
                      </div>
                      <span className="font-semibold text-sm text-gray-700">{row.porcentaje}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
