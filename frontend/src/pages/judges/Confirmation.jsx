import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const Confirmation = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 max-w-[500px] mx-auto mt-10 text-center">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmación de Designación</h2>
      <p className="text-sm text-gray-400 mb-6">
        Has sido designado como juez para el siguiente evento:
      </p>

      <div className="text-left mb-6">
        <div className="mb-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Evento</label>
          <span className="text-lg font-semibold text-gray-800">{fight.evento}</span>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Pelea</label>
          <span className="text-base font-semibold text-gray-800">{fight.boxeadorRojo} vs {fight.boxeadorAzul}</span>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha</label>
          <span className="text-base font-semibold text-gray-800">{fight.fecha}</span>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Rounds</label>
          <span className="text-base font-semibold text-gray-800">{fight.rounds} rounds</span>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors" onClick={() => navigate(`/scoring/${fightId}`)}>
          Aceptar
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
          Rechazar
        </button>
      </div>
    </div>
  );
};

export default Confirmation;
