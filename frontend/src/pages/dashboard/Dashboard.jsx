import { useNavigate } from 'react-router-dom';
import { mockFights, mockJudges } from '../../data/mockData';

const Dashboard = () => {
  const navigate = useNavigate();
  const total = mockFights.length;
  const activas = mockFights.filter((f) => f.estado === 'Activa').length;
  const finalizadas = mockFights.filter((f) => f.estado === 'Finalizada').length;
  const jueces = mockJudges.length;

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 24, color: 'var(--wbo-text)' }}>
        Panel de Control
      </h2>

      <div className="card-grid">
        <div className="card stat-card wbo-red">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Peleas</div>
        </div>
        <div className="card stat-card wbo-blue">
          <div className="stat-value">{activas}</div>
          <div className="stat-label">Peleas Activas</div>
        </div>
        <div className="card stat-card wbo-dark">
          <div className="stat-value">{finalizadas}</div>
          <div className="stat-label">Peleas Finalizadas</div>
        </div>
        <div className="card stat-card wbo-gold">
          <div className="stat-value">{jueces}</div>
          <div className="stat-label">Jueces Registrados</div>
        </div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={() => navigate('/fights/create')}>
          + Nueva Pelea
        </button>
        <button className="btn btn-gold" onClick={() => navigate('/fights')}>
          Ver Peleas
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/judges')}>
          Ver Jueces
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
