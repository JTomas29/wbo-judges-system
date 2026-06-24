import { mockJudges } from '../../data/mockData';

const JudgeList = () => {
  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ margin: 0 }}>Gestión de Jueces</h2>
        <button className="btn btn-primary">+ Crear Juez</button>
      </div>

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockJudges.map((juez) => (
              <tr key={juez.id}>
                <td>{juez.nombre}</td>
                <td>{juez.email}</td>
                <td><span className={`badge badge-${juez.estado}`}>{juez.estado}</span></td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-outline btn-sm">Editar</button>
                    {juez.estado === 'Activo' ? (
                      <button className="btn btn-danger btn-sm">Desactivar</button>
                    ) : (
                      <button className="btn btn-success btn-sm">Activar</button>
                    )}
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

export default JudgeList;
