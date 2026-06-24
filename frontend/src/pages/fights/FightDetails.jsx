import { useParams, useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const FightDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(id)) || mockFights[0];

  return (
    <div>
      <div className="detail-header">
        <h1>{fight.evento}</h1>
        <span className={`badge badge-${fight.estado}`}>{fight.estado}</span>
      </div>

      <div className="card mb-24">
        <div className="detail-grid">
          <div className="detail-item">
            <label>Boxeador Rojo</label>
            <span>{fight.boxeadorRojo}</span>
          </div>
          <div className="detail-item">
            <label>Boxeador Azul</label>
            <span>{fight.boxeadorAzul}</span>
          </div>
          <div className="detail-item">
            <label>Fecha</label>
            <span>{fight.fecha}</span>
          </div>
          <div className="detail-item">
            <label>Rounds</label>
            <span>{fight.rounds} rounds</span>
          </div>
        </div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={() => navigate(`/judges/assign/${fight.id}`)}>
          Asignar Jueces
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/official-cards/${fight.id}`)}>
          Ver Tarjetas
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/analysis/${fight.id}`)}>
          Ver Análisis
        </button>
      </div>
    </div>
  );
};

export default FightDetails;
