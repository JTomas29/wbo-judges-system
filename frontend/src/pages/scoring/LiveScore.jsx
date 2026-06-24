import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const LiveScore = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Puntuación en Vivo</h2>
      <p className="text-sm text-gray-400 mb-4">
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-lg text-gray-600 mb-4">Esperando puntuaciones de los jueces...</p>

        <div className="flex justify-center gap-10 mb-6">
          <div>
            <div className="text-sm text-gray-400">{fight.boxeadorRojo}</div>
            <div className="text-5xl font-bold text-gold-dark">0</div>
          </div>
          <div className="text-3xl self-center text-gray-300">vs</div>
          <div>
            <div className="text-sm text-gray-400">{fight.boxeadorAzul}</div>
            <div className="text-5xl font-bold text-[#6b1421]">0</div>
          </div>
        </div>

        <button className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/analysis/${fightId}`)}>
          Ver Análisis
        </button>
      </div>
    </div>
  );
};

export default LiveScore;
