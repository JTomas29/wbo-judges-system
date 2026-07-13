import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';

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

const levelLabel = (level) => {
  const map = {
    elite: 'bg-green-100 text-green-700',
    senior: 'bg-blue-100 text-blue-700',
    junior: 'bg-yellow-100 text-yellow-700',
  };
  return map[level] || 'bg-gray-100 text-gray-500';
};

const assignmentLabel = (type) => {
  const map = {
    evaluator: 'Evaluador',
    referee_evaluator: 'Evaluador de Árbitro',
  };
  return map[type] || type;
};

const confirmLabel = (status) => {
  const map = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const InfoRow = ({ label, value }) => (
  <div>
    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</label>
    <span className="text-base font-semibold text-gray-800">{value || '—'}</span>
  </div>
);

const FightDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [fight, setFight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFightById(id, token)
      .then((res) => {
        setFight(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('Pelea no encontrada');
        } else {
          setError(err.response?.data?.message || 'Error al cargar la pelea');
        }
        setLoading(false);
      });
  }, [id, token]);

  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
        <span className="ml-3 text-gray-500 text-sm">Cargando pelea...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!fight) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">
          Pelea no encontrada
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">{fight.event_name}</h1>
          {fight.title && <p className="text-sm text-gray-500 mt-1">{fight.title}</p>}
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(fight.status)}`}>
          {statusLabel(fight.status)}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Información de la Pelea</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="Boxeador Rojo" value={fight.boxer_red} />
          <InfoRow label="Boxeador Azul" value={fight.boxer_blue} />
          <InfoRow label="Fecha" value={formatDate(fight.scheduled_date)} />
          <InfoRow label="Categoría" value={fight.weight_class} />
          <InfoRow label="Lugar" value={fight.venue} />
          <InfoRow label="Título" value={fight.title} />
          <InfoRow label="Televisora" value={fight.broadcaster} />
          <InfoRow label="Árbitro" value={fight.referee_name} />
          <InfoRow label="Rounds" value={`${fight.total_rounds} rounds`} />
          <InfoRow label="Jueces Requeridos" value={fight.min_judges_required} />
        </div>
        {fight.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Notas</label>
            <p className="text-sm text-gray-700">{fight.notes}</p>
          </div>
        )}
      </div>

      {fight.assigned_judges && fight.assigned_judges.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Jueces Asignados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo de Asignación</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fight.assigned_judges.map((j) => (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-800">{j.name}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${levelLabel(j.level)}`}>
                        {j.level || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{assignmentLabel(j.assignment_type)}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${confirmLabel(j.status)}`}>
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdminOrSupervisor && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Acciones</h3>
          <div className="flex gap-3 flex-wrap">
            <button
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={fight.status !== 'active'}
              onClick={() => navigate(`/judges/assign/${fight.id}`)}
            >
              Asignar Jueces
            </button>
            <button
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={fight.status !== 'active'}
              title={fight.status !== 'active' ? 'La pelea debe estar activa' : ''}
            >
              Finalizar Pelea
            </button>
            <button
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={fight.status !== 'completed'}
              title={fight.status !== 'completed' ? 'La pelea debe estar finalizada' : ''}
              onClick={() => navigate(`/official-cards/${fight.id}`)}
            >
              Cargar Tarjeta Oficial
            </button>
            <button
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={fight.status !== 'completed' || !fight.official_card}
              title={fight.status !== 'completed' || !fight.official_card ? 'La pelea debe estar finalizada y tener tarjeta oficial' : ''}
              onClick={() => navigate(`/analysis/${fight.id}`)}
            >
              Analizar Pelea
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/official-cards/${fight.id}`)}>
          Ver Tarjetas
        </button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/analysis/${fight.id}`)}>
          Ver Análisis
        </button>
      </div>
    </div>
  );
};

export default FightDetails;
