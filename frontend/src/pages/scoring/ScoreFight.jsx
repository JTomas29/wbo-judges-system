import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockFights, mockRounds } from '../../data/mockData';

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
    <div style={{ maxWidth: 700 }}>
      <div className="detail-header mb-16">
        <div>
          <h2 style={{ margin: 0 }}>Tarjeta de Puntuación</h2>
          <p style={{ color: 'var(--text-light)' }}>
            {fight.boxeadorRojo} vs {fight.boxeadorAzul}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="rounds-container">
          <div className="round-row" style={{ fontWeight: 600, background: 'var(--primary)', color: '#fff' }}>
            <span>Round</span>
            <span style={{ textAlign: 'center' }}>{fight.boxeadorRojo} (Rojo)</span>
            <span style={{ textAlign: 'center' }}>{fight.boxeadorAzul} (Azul)</span>
          </div>
          {scores.map((s, i) => (
            <div className="round-row" key={i}>
              <span className="round-label">Round {s.round}</span>
              <input
                type="number"
                min="1"
                max="10"
                value={s.rojo}
                onChange={(e) => handleScore(i, 'rojo', e.target.value)}
              />
              <input
                type="number"
                min="1"
                max="10"
                value={s.azul}
                onChange={(e) => handleScore(i, 'azul', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group mt-16">
        <button className="btn btn-primary">Guardar</button>
        <button
          className="btn btn-success"
          onClick={() => navigate(`/official-cards/${fightId}`)}
        >
          Finalizar Tarjeta
        </button>
      </div>
    </div>
  );
};

export default ScoreFight;
