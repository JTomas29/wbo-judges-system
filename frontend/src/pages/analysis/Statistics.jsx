import { mockFights, mockJudges, mockAnalysis } from '../../data/mockData';

const Statistics = () => {
  const totalFights = mockFights.length;
  const activeFights = mockFights.filter((f) => f.estado === 'Activa').length;
  const finishedFights = mockFights.filter((f) => f.estado === 'Finalizada').length;
  const totalJudges = mockJudges.length;

  return (
    <div>
      <h2 className="mb-16">Estadísticas Globales</h2>

      <div className="card-grid">
        <div className="card stat-card">
          <div className="stat-value">{totalFights}</div>
          <div className="stat-label">Total Peleas</div>
        </div>
        <div className="card stat-card accent">
          <div className="stat-value">{activeFights}</div>
          <div className="stat-label">Activas</div>
        </div>
        <div className="card stat-card success">
          <div className="stat-value">{finishedFights}</div>
          <div className="stat-label">Finalizadas</div>
        </div>
        <div className="card stat-card warning">
          <div className="stat-value">{totalJudges}</div>
          <div className="stat-label">Jueces</div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-16">Rendimiento General de Jueces</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Juez</th>
                <th>Coincidencias</th>
                <th>Errores</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {mockAnalysis.consistencia.map((row, i) => (
                <tr key={i}>
                  <td>{row.juez}</td>
                  <td>{row.aciertos}</td>
                  <td>{row.errores}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${row.porcentaje}%`,
                          background: row.porcentaje >= 80 ? 'var(--success)' : row.porcentaje >= 60 ? 'var(--warning)' : 'var(--danger)',
                        }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{row.porcentaje}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
