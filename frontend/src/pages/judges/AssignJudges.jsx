import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockJudges, mockFights, mockAssignments } from '../../data/mockData';

const statusBadge = (estado) => {
  const map = {
    Activo: 'bg-wbo-50 text-wbo-700',
    Inactivo: 'bg-gray-100 text-gray-500',
  };
  return map[estado] || 'bg-gray-100 text-gray-500';
};

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
      <h2 className="text-xl font-bold text-gray-900 mb-4">Asignar Jueces — {fight.evento}</h2>
      <p className="mb-4 text-gray-400">
        {fight.boxeadorRojo} vs {fight.boxeadorAzul}
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 w-10"></th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Juez</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {mockJudges.filter((j) => j.estado === 'Activo').map((juez) => {
              const assignment = existingAssignments.find((a) => a.judgeId === juez.id);
              return (
                <tr key={juez.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(juez.id)}
                      onChange={() => toggleJudge(juez.id)}
                      className="rounded border-gray-300 text-[#6b1421] focus:ring-[#6b1421]"
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{juez.nombre}</td>
                  <td className="py-3 px-4 text-gray-600">{juez.email}</td>
                  <td className="py-3 px-4">
                    {assignment ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(assignment.estado)}`}>
                        {assignment.estado}
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                        Sin asignar
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">
          Asignar
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/fights/${fightId}`)}>
          Volver
        </button>
      </div>
    </div>
  );
};

export default AssignJudges;
