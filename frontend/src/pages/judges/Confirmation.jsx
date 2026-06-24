import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const Confirmation = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div className="card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>Confirmación de Designación</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 24 }}>
        Has sido designado como juez para el siguiente evento:
      </p>

      <div style={{ textAlign: 'left', marginBottom: 24 }}>
        <div className="detail-item mb-16">
          <label>Evento</label>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{fight.evento}</span>
        </div>
        <div className="detail-item mb-16">
          <label>Pelea</label>
          <span>{fight.boxeadorRojo} vs {fight.boxeadorAzul}</span>
        </div>
        <div className="detail-item mb-16">
          <label>Fecha</label>
          <span>{fight.fecha}</span>
        </div>
        <div className="detail-item">
          <label>Rounds</label>
          <span>{fight.rounds} rounds</span>
        </div>
      </div>

      <div className="btn-group" style={{ justifyContent: 'center' }}>
        <button className="btn btn-success" onClick={() => navigate(`/scoring/${fightId}`)}>
          Aceptar
        </button>
        <button className="btn btn-danger">
          Rechazar
        </button>
      </div>
    </div>
  );
};

export default Confirmation;
