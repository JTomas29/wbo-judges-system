import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, deleteFight, analyzeFight } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';

const statusStyle = (status) => {
  const map = { pending: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', analyzed: 'bg-purple-100 text-purple-700', cancelled: 'bg-red-100 text-red-700' };
  return map[status] || 'bg-gray-100 text-gray-500';
};
const statusLabel = (status) => { const m = { pending: 'Pendiente', active: 'Activa', completed: 'Finalizada', analyzed: 'Analizada', cancelled: 'Cancelada' }; return m[status] || status; };
const levelLabel = (l) => { const m = { elite: 'bg-green-100 text-green-700', senior: 'bg-blue-100 text-blue-700', junior: 'bg-yellow-100 text-yellow-700' }; return m[l] || 'bg-gray-100 text-gray-500'; };
const assignmentLabel = (t) => t === 'referee_evaluator' ? 'Evaluador de Árbitro' : 'Evaluador';
const confirmLabel = (s) => { const m = { confirmed: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-700' }; return m[s] || 'bg-gray-100 text-gray-500'; };
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '\u2014';
const InfoRow = ({ label, value }) => (
  <div><label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</label><span className="text-base font-semibold text-gray-800">{value || '\u2014'}</span></div>
);

const FightDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [fight, setFight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFightById(id, token)
      .then((res) => { setFight(res.data); setLoading(false); })
      .catch((err) => {
        if (err.response?.status === 404) setError('Pelea no encontrada');
        else setError(err.response?.data?.message || 'Error al cargar la pelea');
        setLoading(false);
      });
  }, [id, token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando pelea...</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );
  if (!fight) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">Pelea no encontrada</div>
    </div>
  );

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const myAssignment = fight?.assigned_judges?.find(j => j.id === user?.id);
  const canScore = user?.role === 'judge' && myAssignment?.status === 'confirmed' && fight?.status === 'active';

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFight(id, token);
      setShowDeleteModal(false);
      navigate('/fights');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error al eliminar la pelea');
      setDeleting(false);
    }
  };

  return (
    <>
      <button onClick={() => navigate('/fights')} className="flex items-center text-sm font-semibold text-white bg-wbo-700 hover:bg-opacity-90 transition-colors mb-4 px-4 py-2">
        ← Volver a Peleas
      </button>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">{fight.event_name}</h1>
          {fight.title && <p className="text-sm text-gray-500 mt-1">{fight.title}</p>}
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(fight.status)}`}>{statusLabel(fight.status)}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm card-minimal p-5 mb-6">
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

      {fight.assigned_judges?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Jueces Asignados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fight.assigned_judges.map((j) => (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-800">{j.name}</td>
                    <td className="py-2 px-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${levelLabel(j.level)}`}>{j.level || '\u2014'}</span></td>
                    <td className="py-2 px-3 text-gray-600">{assignmentLabel(j.assignment_type)}</td>
                    <td className="py-2 px-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${confirmLabel(j.status)}`}>{j.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Acciones</h3>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-3 flex-wrap items-center">
              {user?.role === 'admin' && (
                <button className="inline-flex items-center justify-center px-4 py-2 bg-wbo-700 text-white rounded-lg font-medium shadow-sm hover:bg-opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status !== 'completed'} title={fight.status !== 'completed' ? 'La pelea debe estar finalizada' : ''} onClick={() => navigate(`/official-cards/${fight.id}`)}>Cargar Tarjeta Oficial</button>
              )}
              <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status !== 'pending'} onClick={() => navigate(`/judges/assign/${fight.id}`)}>Asignar Jueces</button>
              <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status !== 'active'} title={fight.status !== 'active' ? 'La pelea debe estar activa' : ''} onClick={() => navigate(`/scoring/live/${fight.id}`)}>Seguimiento en vivo</button>
              {user?.role === 'admin' && (
                <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status !== 'completed' || !fight.official_card || analyzing} title={fight.status !== 'completed' || !fight.official_card ? 'La pelea debe estar finalizada y tener tarjeta oficial' : ''} onClick={async () => {
                  setAnalyzeError(null);
                  setAnalyzing(true);
                  try {
                    await analyzeFight(id, token);
                    navigate(`/analysis/${id}`);
                  } catch (err) {
                    setAnalyzeError(err.response?.data?.message || 'Error al ejecutar el análisis');
                    setAnalyzing(false);
                  }
                }}>
                  {analyzing ? (
                    <><span className="animate-spin h-4 w-4 border-2 border-wbo-700 border-t-transparent rounded-full mr-2" />Procesando análisis...</>
                  ) : 'Analizar Pelea'}
                </button>
              )}
              {user?.role === 'admin' && (
                <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status === 'completed' || fight.status === 'analyzed' || fight.status === 'cancelled'} title={fight.status === 'completed' || fight.status === 'analyzed' || fight.status === 'cancelled' ? 'No se puede editar una pelea finalizada' : ''} onClick={() => navigate(`/fights/${fight.id}/edit`)}>Editar</button>
              )}
            </div>
            {user?.role === 'admin' && (
              <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm" disabled={fight.status !== 'pending' && fight.status !== 'cancelled'} onClick={() => { setShowDeleteModal(true); setDeleteError(null); }}>Eliminar Pelea</button>
            )}
          </div>
          {analyzeError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm">{analyzeError}</p>
            </div>
          )}
        </div>
      )}

      {canScore && (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Puntuación</h3>
          <button
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
            onClick={() => navigate(`/scoring/${fight.id}`)}
          >
            Puntuar pelea
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/official-cards/${fight.id}`)}>Ver Tarjetas</button>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate(`/analysis/${fight.id}`)}>Ver Análisis</button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!deleting) { setShowDeleteModal(false); setDeleteError(null); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar pelea</h3>
            <p className="text-sm text-gray-600 mb-6">Esta acción eliminará definitivamente la pelea y no podrá deshacerse.</p>
            {deleteError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{deleteError}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors" disabled={deleting} onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}>Cancelar</button>
              <button className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2" disabled={deleting} onClick={handleDelete}>
                {deleting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FightDetails;
