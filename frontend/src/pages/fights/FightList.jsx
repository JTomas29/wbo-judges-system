import { useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const statusBadge = (estado) => {
  const map = {
    Activa: 'bg-wbo-50 text-wbo-700',
    Finalizada: 'bg-blue-50 text-blue-600',
    Pendiente: 'bg-amber-50 text-amber-600',
  };
  return map[estado] || 'bg-gray-100 text-gray-500';
};

const FightList = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 m-0">Listado de Peleas</h2>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors" onClick={() => navigate('/fights/create')}>
          + Crear Pelea
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evento</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Boxeador Rojo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Boxeador Azul</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockFights.map((fight) => (
              <tr key={fight.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">{fight.evento}</td>
                <td className="py-3 px-4 text-gray-600">{fight.boxeadorRojo}</td>
                <td className="py-3 px-4 text-gray-600">{fight.boxeadorAzul}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(fight.estado)}`}>
                    {fight.estado}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{fight.fecha}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/fights/${fight.id}`)}>
                      Ver
                    </button>
                    <button className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors">
                      Editar
                    </button>
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
