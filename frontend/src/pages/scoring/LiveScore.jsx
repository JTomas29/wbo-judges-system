import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const LiveScore = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div>
      <h2 className="mb-16">Puntuación en Vivo</h2>
      <p className="mb-16" style={{ color: 'var(--text-light)' }}>
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>Esperando puntuaciones de los jueces...</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-light)' }}>{fight.boxeadorRojo}</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--accent)' }}>0</div>
          </div>
          <div style={{ fontSize: 32, alignSelf: 'center', color: 'var(--text-light)' }}>vs</div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-light)' }}>{fight.boxeadorAzul}</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)' }}>0</div>
          </div>
        </div>

        <button className="btn btn-outline" onClick={() => navigate(`/analysis/${fightId}`)}>
          Ver Análisis
        </button>
      </div>
    </div>
  );
};

export default LiveScore;
