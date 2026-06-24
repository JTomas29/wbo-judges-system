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
      <h2 className="mb-16">Tarjetas Oficiales</h2>
      <p className="mb-16" style={{ color: 'var(--text-light)' }}>
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      {cards.map((card, ci) => (
        <div className="card mb-16" key={card.id}>
          <h3 style={{ marginBottom: 12 }}>{card.label}</h3>
          <div className="rounds-container">
            <div className="round-row" style={{ fontWeight: 600, background: 'var(--primary)', color: '#fff' }}>
              <span>Round</span>
              <span style={{ textAlign: 'center' }}>Rojo</span>
              <span style={{ textAlign: 'center' }}>Azul</span>
            </div>
            {card.rounds.map((r, ri) => (
              <div className="round-row" key={ri}>
                <span className="round-label">Round {r.round}</span>
                <input type="number" min="1" max="10" value={r.rojo}
                  onChange={(e) => handleRoundScore(ci, ri, 'rojo', e.target.value)} />
                <input type="number" min="1" max="10" value={r.azul}
                  onChange={(e) => handleRoundScore(ci, ri, 'azul', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="btn-group">
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/analysis/${fightId}`)}
        >
          Procesar Análisis
        </button>
      </div>
    </div>
  );
};

export default OfficialCards;
