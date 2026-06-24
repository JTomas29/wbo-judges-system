import { useParams } from 'react-router-dom';
import { mockFights, mockAnalysis } from '../../data/mockData';

const FightAnalysis = () => {
  const { fightId } = useParams();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];

  return (
    <div>
      <h2 className="mb-16">Análisis de Pelea</h2>
      <p className="mb-24" style={{ color: 'var(--text-light)' }}>
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="analysis-summary">
        <div className="card analysis-card highlight">
          <h3>Ganador Oficial</h3>
          <div className="value">{mockAnalysis.ganadorOficial}</div>
        </div>
        <div className="card analysis-card">
          <h3>Mejor Juez</h3>
          <div className="value" style={{ color: 'var(--success)' }}>{mockAnalysis.mejorJuez}</div>
        </div>
        <div className="card analysis-card">
          <h3>Peor Juez</h3>
          <div className="value" style={{ color: 'var(--danger)' }}>{mockAnalysis.peorJuez}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-16">Tabla de Consistencia</h3>
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
                      <div style={{
                        flex: 1, height: 8, borderRadius: 4,
                        background: 'var(--bg)',
                        overflow: 'hidden',
                      }}>
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

export default FightAnalysis;
