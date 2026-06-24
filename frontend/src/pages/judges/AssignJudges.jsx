import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockJudges, mockFights, mockAssignments } from '../../data/mockData';

const AssignJudges = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const fight = mockFights.find((f) => f.id === Number(fightId)) || mockFights[0];
  const [selected, setSelected] = useState([]);

  const existingAssignments = mockAssignments.filter((a) => a.fightId === Number(fightId));

  const toggleJudge = (judgeId) => {
    setSelected((prev) =>
      prev.includes(judgeId) ? prev.filter((id) => id !== judgeId) : [...prev, judgeId]
    );
  };

  return (
    <div>
      <h2 className="mb-16">Asignar Jueces — {fight.evento}</h2>
      <p className="mb-16" style={{ color: 'var(--text-light)' }}>
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="card mb-24">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Juez</th>
              <th>Email</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {mockJudges.filter((j) => j.estado === 'Activo').map((juez) => {
              const assignment = existingAssignments.find((a) => a.judgeId === juez.id);
              return (
                <tr key={juez.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(juez.id)}
                      onChange={() => toggleJudge(juez.id)}
                    />
                  </td>
                  <td>{juez.nombre}</td>
                  <td>{juez.email}</td>
                  <td>
                    {assignment ? (
                      <span className={`badge badge-${assignment.estado}`}>
                        {assignment.estado}
                      </span>
                    ) : (
                      <span className="badge badge-pendiente">Sin asignar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary">Asignar</button>
        <button className="btn btn-outline" onClick={() => navigate(`/fights/${fightId}`)}>
          Volver
        </button>
      </div>
    </div>
  );
};

export default AssignJudges;
