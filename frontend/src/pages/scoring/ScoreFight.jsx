import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const ScoreFight = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];
  const totalRounds = fight.rounds;

  const [scores, setScores] = useState(
    Array.from({ length: totalRounds }, (_, i) => ({
      round: i + 1,
      rojo: 10,
      azul: 9,
    }))
  );

  const handleScore = (index, boxeador, value) => {
    const updated = [...scores];
    updated[index] = { ...updated[index], [boxeador]: Number(value) };
    setScores(updated);
  };

  return (
    <div className="max-w-[700px]">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Tarjeta de Puntuación</h2>
          <p className="text-sm text-gray-400">
            {fight.boxeadorRojo} vs {fight.boxeadorAzul}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold">
            <span>Round</span>
            <span className="text-center">{fight.boxeadorRojo} (Rojo)</span>
            <span className="text-center">{fight.boxeadorAzul} (Azul)</span>
          </div>
          {scores.map((s, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-gray-50 even:bg-white rounded-lg">
              <span className="font-bold text-[#6b1421] text-sm">Round {s.round}</span>
              <div className="flex justify-center">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={s.rojo}
                  onChange={(e) => handleScore(i, 'rojo', e.target.value)}
                  className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={s.azul}
                  onChange={(e) => handleScore(i, 'azul', e.target.value)}
                  className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">
          Guardar
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors" onClick={() => navigate(`/official-cards/${fightId}`)}>
          Finalizar Tarjeta
        </button>
      </div>
    </div>
  );
};

export default ScoreFight;
