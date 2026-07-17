import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById } from '../../services/fightService';
import { getJudges, getFightAssignments, createAssignment, deleteAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
};

const levelBadge = (level) => {
  const map = {
    elite: 'bg-green-100 text-green-700',
    senior: 'bg-blue-100 text-blue-700',
    junior: 'bg-yellow-100 text-yellow-700',
  };
  return map[level] || 'bg-gray-100 text-gray-500';
};

const assignmentTypeLabel = (type) => {
  const map = {
    evaluator: 'Evaluador del combate',
    referee_evaluator: 'Evaluador del árbitro',
  };
  return map[type] || type;
};

const formatDateTime = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AssignJudges = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [fight, setFight] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [availableJudges, setAvailableJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedJudge, setSelectedJudge] = useState('');
  const [selectedType, setSelectedType] = useState('evaluator');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [fightRes, assignRes, judgesRes] = await Promise.all([
        getFightById(fightId, token),
        getFightAssignments(fightId, token),
        getJudges(token),
      ]);
      setFight(fightRes.data);
      setAssignments(assignRes.data);
      setAvailableJudges(judgesRes.data);
    } catch (err) {
      if (err.response?.status === 404) setError('Pelea no encontrada');
      else setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fightId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Jueces no asignados aún a esta pelea
  const assignedIds = new Set(assignments.map((a) => a.judge_id));
  const unassignedJudges = availableJudges.filter((j) => !assignedIds.has(j.id));

  const handleAssign = async () => {
    if (!selectedJudge || !selectedType) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await createAssignment(fightId, { judge_id: Number(selectedJudge), assignment_type: selectedType }, token);
      setSelectedJudge('');
      setSelectedType('evaluator');
      await loadData();
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Error al asignar juez');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (judgeId) => {
    setError(null);
    try {
      await deleteAssignment(fightId, judgeId, token);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar asignación');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando...</span>
    </div>
  );

  if (!isAdmin && !loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800 font-medium">Solo los administradores pueden asignar jueces.</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (fight && fight.status !== 'pending') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800 font-medium">No es posible modificar las designaciones de esta pelea.</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate(`/fights/${fightId}`)}
        >
          Volver a la pelea
        </button>
      </div>
    );
  }

  if (error && !fight) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );

  const confirmedCount = assignments.filter((a) => a.status === 'confirmed').length;
  const minRequired = fight?.min_judges_required || 0;

  return (
    <div>
      <div className="mb-4">
        <BackButton fallbackRoute={`/fights/${fightId}`} />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Asignar Jueces</h1>
          {fight && (
            <p className="text-sm text-gray-500 mt-1">
              {fight.event_name} \u2014 {fight.boxer_red} vs {fight.boxer_blue}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="text-sm">
            <span className="text-gray-500">Confirmados: </span>
            <span className="font-semibold text-gray-800">{confirmedCount} / {minRequired}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {assignError && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{assignError}</div>
      )}

      {/* Formulario de asignación �?" solo admin */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Nueva Asignación</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Juez</label>
              <select value={selectedJudge} onChange={(e) => setSelectedJudge(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 bg-white">
                <option value="">\u2014 Seleccionar juez \u2014</option>
                {unassignedJudges.map((j) => (
                  <option key={j.id} value={j.id}>{j.name} ({j.level || 'sin nivel'})</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Tipo</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 bg-white">
                <option value="evaluator">Evaluador del combate</option>
                <option value="referee_evaluator">Evaluador del árbitro</option>
              </select>
            </div>
            <div>
              <button disabled={!selectedJudge || assigning}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleAssign}>
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de asignaciones */}
      <div className="bg-white rounded-xl shadow-sm card-minimal overflow-x-auto">
        {assignments.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No hay jueces asignados a esta pelea</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Juez</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Asignado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Respuesta</th>
                {isAdmin && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.judge_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-800">{a.name}</td>
                  <td className="py-3 px-4 text-gray-600">{a.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${levelBadge(a.level)}`}>{a.level || '\u2014'}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{assignmentTypeLabel(a.assignment_type)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">{formatDateTime(a.assigned_at)}</td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">{formatDateTime(a.responded_at)}</td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <button disabled={a.status !== 'pending'}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleRemove(a.judge_id)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <BackButton fallbackRoute={`/fights/${fightId}`} />
      </div>
    </div>
  );
};

export default AssignJudges;
