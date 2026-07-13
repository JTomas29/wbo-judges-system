import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAssignments, respondAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
};

const fightStatusBadge = (status) => {
  const map = {
    pending: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    analyzed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
};

const assignmentTypeLabel = (type) => {
  const map = {
    evaluator: 'Evaluador del combate',
    referee_evaluator: 'Evaluador del Ã¡rbitro',
  };
  return map[type] || type;
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const Confirmation = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isJudge = user?.role === 'judge';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState(null);

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMyAssignments(token);
      setAssignments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleRespond = async (fightId, response) => {
    setResponding(fightId);
    setError(null);
    try {
      const res = await respondAssignment(fightId, response, token);
      // Actualizar la asignaciÃ³n en la lista con la respuesta
      setAssignments((prev) =>
        prev.map((a) =>
          a.fight_id === fightId
            ? { ...a, assignment_status: response, responded_at: new Date().toISOString() }
            : a
        )
      );
      // Si la pelea quedÃ³ activa, mostrar mensaje
      if (res.data.fight_status === 'active') {
        setAssignments((prev) =>
          prev.map((a) =>
            a.fight_id === fightId ? { ...a, fight_status: 'active', _justActivated: true } : a
          )
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al responder la asignaciÃ³n');
    } finally {
      setResponding(null);
    }
  };

  if (!isJudge) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-amber-50 text-amber-700 px-6 py-4 rounded-lg text-sm">Solo los jueces pueden acceder a esta pÃ¡gina</div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando asignaciones...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );

  if (assignments.length === 0) return (
    <div className="text-center py-20">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Mis Asignaciones</h2>
      <p className="text-gray-400 text-sm">No tienes asignaciones pendientes</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Mis Asignaciones</h2>

      {assignments.map((a) => {
        const isPending = a.assignment_status === 'pending';
        const isActive = a.fight_status === 'active';

        return (
          <div key={a.fight_id} className="bg-white rounded-xl shadow-sm p-5 mb-4">
            {a._justActivated && (
              <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold">
                La pelea alcanzÃ³ el mÃ­nimo de jueces confirmados y quedÃ³ activa.
              </div>
            )}

            <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
              <h3 className="text-lg font-bold text-gray-900 m-0">{a.event_name}</h3>
              <div className="flex gap-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(a.assignment_status)}`}>
                  {a.assignment_status}
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${fightStatusBadge(a.fight_status)}`}>
                  {a.fight_status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Evento</label>
                <span className="text-sm font-semibold text-gray-800">{a.event_name}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha</label>
                <span className="text-sm font-semibold text-gray-800">{formatDate(a.scheduled_date)}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Lugar</label>
                <span className="text-sm font-semibold text-gray-800">{a.venue || '\u2014'}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Boxeador Rojo</label>
                <span className="text-sm font-semibold text-gray-800">{a.boxer_red}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Boxeador Azul</label>
                <span className="text-sm font-semibold text-gray-800">{a.boxer_blue}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5">Tipo de asignaciÃ³n</label>
                <span className="text-sm font-semibold text-gray-800">{assignmentTypeLabel(a.assignment_type)}</span>
              </div>
            </div>

            {isPending ? (
              <div className="flex gap-2">
                <button
                  disabled={responding === a.fight_id}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => handleRespond(a.fight_id, 'confirmed')}
                >
                  {responding === a.fight_id ? 'Respondiendo...' : 'Confirmar'}
                </button>
                <button
                  disabled={responding === a.fight_id}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => handleRespond(a.fight_id, 'rejected')}
                >
                  {responding === a.fight_id ? 'Respondiendo...' : 'Rechazar'}
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                Respondiste: {formatDate(a.responded_at)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Confirmation;
