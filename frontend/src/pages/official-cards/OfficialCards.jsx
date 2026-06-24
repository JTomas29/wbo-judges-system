import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const OfficialCards = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  const [cards, setCards] = useState(
    [1, 2, 3].map((cardNum) => ({
      id: cardNum,
      label: `Tarjeta Oficial ${cardNum}`,
      rounds: Array.from({ length: Math.min(fight.rounds, 4) }, (_, i) => ({
        round: i + 1,
        rojo: 10,
        azul: 9,
      })),
    }))
  );

  const handleRoundScore = (cardIdx, roundIdx, boxeador, value) => {
    const updated = [...cards];
    updated[cardIdx].rounds[roundIdx][boxeador] = Number(value);
    setCards(updated);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Tarjetas Oficiales</h2>
      <p className="text-sm text-gray-400 mb-4">
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      {cards.map((card, ci) => (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4" key={card.id}>
          <h3 className="text-lg font-bold text-gray-800 mb-3">{card.label}</h3>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold">
              <span>Round</span>
              <span className="text-center">Rojo</span>
              <span className="text-center">Azul</span>
            </div>
            {card.rounds.map((r, ri) => (
              <div key={ri} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-gray-50 even:bg-white rounded-lg">
                <span className="font-bold text-[#6b1421] text-sm">Round {r.round}</span>
                <div className="flex justify-center">
                  <input type="number" min="1" max="10" value={r.rojo}
                    onChange={(e) => handleRoundScore(ci, ri, 'rojo', e.target.value)}
                    className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
                </div>
                <div className="flex justify-center">
                  <input type="number" min="1" max="10" value={r.azul}
                    onChange={(e) => handleRoundScore(ci, ri, 'azul', e.target.value)}
                    className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors" onClick={() => navigate(`/analysis/${fightId}`)}>
          Procesar Análisis
        </button>
      </div>
    </div>
  );
};

export default OfficialCards;
