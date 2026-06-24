import { mockJudges } from '../../data/mockData';

const statusBadge = (estado) => {
  const map = {
    Activo: 'bg-wbo-50 text-wbo-700',
    Inactivo: 'bg-gray-100 text-gray-500',
  };
  return map[estado] || 'bg-gray-100 text-gray-500';
};

const JudgeList = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 m-0">Gestión de Jueces</h2>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">
          + Crear Juez
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockJudges.map((juez) => (
              <tr key={juez.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">{juez.nombre}</td>
                <td className="py-3 px-4 text-gray-600">{juez.email}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(juez.estado)}`}>
                    {juez.estado}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors">
                      Editar
                    </button>
                    {juez.estado === 'Activo' ? (
                      <button className="inline-flex items-center justify-center px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
                        Desactivar
                      </button>
                    ) : (
                      <button className="inline-flex items-center justify-center px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors">
                        Activar
                      </button>
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
