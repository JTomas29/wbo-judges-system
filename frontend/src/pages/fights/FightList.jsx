import { useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const FightList = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ margin: 0 }}>Listado de Peleas</h2>
        <button className="btn btn-primary" onClick={() => navigate('/fights/create')}>
          + Crear Pelea
        </button>
      </div>

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Boxeador Rojo</th>
              <th>Boxeador Azul</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockFights.map((fight) => (
              <tr key={fight.id}>
                <td>{fight.evento}</td>
                <td>{fight.boxeadorRojo}</td>
                <td>{fight.boxeadorAzul}</td>
                <td><span className={`badge badge-${fight.estado}`}>{fight.estado}</span></td>
                <td>{fight.fecha}</td>
                <td>
                  <div className="btn-group">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/fights/${fight.id}`)}
                    >
                      Ver
                    </button>
                    <button className="btn btn-outline btn-sm">Editar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FightList;
