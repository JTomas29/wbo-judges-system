import { useParams } from 'react-router-dom';
import { mockFights, mockAnalysis } from '../../data/mockData';

const barColor = (pct) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const FightAnalysis = () => {
  const { fightId } = useParams();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Análisis de Pelea</h2>
      <p className="text-sm text-gray-400 mb-6">
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ganador Oficial</h3>
          <div className="text-2xl font-extrabold text-gold-dark">{mockAnalysis.ganadorOficial}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mejor Juez</h3>
          <div className="text-2xl font-extrabold text-green-500">{mockAnalysis.mejorJuez}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Peor Juez</h3>
          <div className="text-2xl font-extrabold text-red-500">{mockAnalysis.peorJuez}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Tabla de Consistencia</h3>
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

export default FightAnalysis;
