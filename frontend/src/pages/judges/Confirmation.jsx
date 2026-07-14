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
  const [rejecting, setRejecting] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});

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

  const handleRespond = async (fightId, response, reason) => {
    setResponding(fightId);
    setError(null);
    try {
      const body = { response };
      if (reason) body.reason = reason;
      const res = await respondAssignment(fightId, body, token);
      setAssignments((prev) =>
        prev.map((a) =>
          a.fight_id === fightId
            ? { ...a, assignment_status: response, responded_at: new Date().toISOString(), rejection_reason: reason || null }
            : a
        )
      );
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
      setRejecting(null);
    }
  };

  const startReject = (fightId) => {
    setRejecting(fightId);
    setError(null);
  };

  const cancelReject = (fightId) => {
    setRejecting(null);
    setRejectReasons((prev) => ({ ...prev, [fightId]: '' }));
  };

  const confirmReject = (fightId) => {
    const reason = (rejectReasons[fightId] || '').trim();
    if (!reason) {
      setError('Debe indicar el motivo del rechazo');
      return;
    }
    handleRespond(fightId, 'rejected', reason);
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

  const pending = assignments.filter(a => a.assignment_status === 'pending').length;
  const confirmed = assignments.filter(a => a.assignment_status === 'confirmed').length;
  const rejected = assignments.filter(a => a.assignment_status === 'rejected').length;

  if (assignments.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">No tenés designaciones pendientes</h3>
      <p className="text-sm text-gray-400">Cuando un administrador te asigne una pelea aparecerÃ¡ aquÃ­.</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Mis Designaciones</h2>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pendientes: {pending}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Confirmadas: {confirmed}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Rechazadas: {rejected}
          </span>
        </div>
      </div>

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
              <div>
                {rejecting === a.fight_id ? (
                  <div className="bg-red-50 rounded-lg p-4 mb-3">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Motivo del rechazo *</label>
                    <textarea
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1421]/20 resize-none mb-3"
                      rows={3}
                      placeholder="Explique por qu\u00e9 no puede aceptar la designaci\u00f3n..."
                      value={rejectReasons[a.fight_id] || ''}
                      onChange={(e) => setRejectReasons((prev) => ({ ...prev, [a.fight_id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={responding === a.fight_id}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => confirmReject(a.fight_id)}
                      >
                        {responding === a.fight_id ? 'Enviando...' : 'Enviar rechazo'}
                      </button>
                      <button
                        disabled={responding === a.fight_id}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-gray-400 transition-colors"
                        onClick={() => cancelReject(a.fight_id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
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
                      onClick={() => startReject(a.fight_id)}
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ) : a.assignment_status === 'rejected' && a.rejection_reason ? (
              <div className="text-sm">
                <span className="text-gray-400">Respondiste: {formatDate(a.responded_at)}</span>
                <div className="mt-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{a.rejection_reason}</div>
              </div>
            ) : a.assignment_status === 'confirmed' ? (
              <div>
                {isActive ? (
                  <button
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
                    onClick={() => navigate(`/scoring/${a.fight_id}`)}
                  >
                    Puntuar pelea
                  </button>
                ) : a.fight_status === 'completed' || a.fight_status === 'analyzed' ? (
                  <p className="text-sm text-gray-400">La pelea ya finaliz\u00f3</p>
                ) : a.fight_status === 'pending' ? (
                  <p className="text-sm text-gray-400">Esperando que la pelea comience</p>
                ) : (
                  <p className="text-sm text-gray-400">Respondiste: {formatDate(a.responded_at)}</p>
                )}
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
