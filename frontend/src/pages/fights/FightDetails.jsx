import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const statusBadge = (estado) => {
  const map = {
    Activa: 'bg-wbo-50 text-wbo-700',
    Finalizada: 'bg-blue-50 text-blue-600',
    Pendiente: 'bg-amber-50 text-amber-600',
  };
  return map[estado] || 'bg-gray-100 text-gray-500';
};

const FightDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(id)) || mockFights[0];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 m-0">{fight.evento}</h1>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(fight.estado)}`}>
          {fight.estado}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Boxeador Rojo</label>
            <span className="text-base font-semibold text-gray-800">{fight.boxeadorRojo}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Boxeador Azul</label>
            <span className="text-base font-semibold text-gray-800">{fight.boxeadorAzul}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha</label>
            <span className="text-base font-semibold text-gray-800">{fight.fecha}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Rounds</label>
            <span className="text-base font-semibold text-gray-800">{fight.rounds} rounds</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors" onClick={() => navigate(`/judges/assign/${fight.id}`)}>
          Asignar Jueces
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/official-cards/${fight.id}`)}>
          Ver Tarjetas
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/analysis/${fight.id}`)}>
          Ver Análisis
        </button>
      </div>
    </div>
  );
};

export default FightDetails;
