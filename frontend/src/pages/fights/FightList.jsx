import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFights } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';

const canEdit = (status) => status === 'pending' || status === 'active';

const statusStyle = (status) => {
  const map = {
    pending: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    analyzed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
};

const statusLabel = (status) => {
  const map = {
    pending: 'Pendiente',
    active: 'Activa',
    completed: 'Finalizada',
    analyzed: 'Analizada',
    cancelled: 'Cancelada',
  };
  return map[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const FightList = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFights(token)
      .then((res) => { setFights(res.data); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.message || 'Error al cargar peleas'); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando peleas...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 m-0">Listado de Peleas</h2>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors" onClick={() => navigate('/fights/create')}>
          + Crear Pelea
        </button>
      </div>
      {fights.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">No hay peleas registradas</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evento</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rojo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Azul</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">CategorÃ­a</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lugar</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ãrbitro</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jueces</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fights.map((fight) => (
                <tr key={fight.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-800">{fight.event_name}</td>
                  <td className="py-3 px-4 text-gray-600">{fight.boxer_red}</td>
                  <td className="py-3 px-4 text-gray-600">{fight.boxer_blue}</td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(fight.scheduled_date)}</td>
                  <td className="py-3 px-4 text-gray-600">{fight.weight_class || '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-600">{fight.venue || '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-600">{fight.referee_name || '\u2014'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(fight.status)}`}>{statusLabel(fight.status)}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{fight.confirmed_judges} / {fight.min_judges_required}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/fights/${fight.id}`)}>Ver</button>
                      {user?.role === 'admin' && (
                        <button
                          className={`inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold transition-colors ${
                            canEdit(fight.status)
                              ? 'text-gray-700 hover:border-[#6b1421] hover:text-[#6b1421]'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          disabled={!canEdit(fight.status)}
                          onClick={() => navigate(`/fights/${fight.id}/edit`)}
                        >Editar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FightList;
