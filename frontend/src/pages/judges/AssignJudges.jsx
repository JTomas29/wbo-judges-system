import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById } from '../../services/fightService';
import { getJudges, getFightAssignments, createAssignment, deleteAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';

const statusBadge = (status) => {
  const configs = {
    pending: {
      classes: 'bg-amber-100 text-amber-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      label: 'Pendiente',
    },
    confirmed: {
      classes: 'bg-green-100 text-green-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      label: 'Confirmado',
    },
    rejected: {
      classes: 'bg-red-100 text-red-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      label: 'Rechazado',
    },
  };
  const config = configs[status];
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
        {status || '—'}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${config.classes}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const levelBadge = (level) => {
  const configs = {
    elite: {
      classes: 'bg-green-100 text-green-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    senior: {
      classes: 'bg-blue-100 text-blue-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    junior: {
      classes: 'bg-yellow-100 text-yellow-700',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  };
  const config = configs[level];
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
        {level || '—'}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${config.classes}`}>
      {config.icon}
      {level}
    </span>
  );
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
    <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-wbo-700" />
        <span className="text-slate-500 text-sm">Cargando...</span>
      </div>
    </div>
  );

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-slate-700 font-medium">Solo los administradores pueden asignar jueces.</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-[#4a0f14] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            onClick={() => navigate('/dashboard')}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (fight && fight.status !== 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-slate-700 font-medium">No es posible modificar las designaciones de esta pelea.</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-[#4a0f14] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            onClick={() => navigate(`/fights/${fightId}`)}
          >
            Volver a la pelea
          </button>
        </div>
      </div>
    );
  }

  if (error && !fight) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-sm px-6 py-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    </div>
  );

  const confirmedCount = assignments.filter((a) => a.status === 'confirmed').length;
  const minRequired = fight?.min_judges_required || 0;

  return (
    <div className="animate-fadeIn">
      <div className="mb-4">
        <BackButton fallbackRoute={`/fights/${fightId}`} />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Asignar Jueces</h1>
          {fight && (
            <p className="text-sm text-slate-500 mt-1">
              {fight.event_name} \u2014 {fight.boxer_red} vs {fight.boxer_blue}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="text-sm">
            <span className="text-slate-500">Confirmados: </span>
            <span className="font-semibold text-slate-800">{confirmedCount} / {minRequired}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {assignError && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{assignError}</div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-wbo-700 pl-3">Nueva Asignación</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Juez</label>
              <select value={selectedJudge} onChange={(e) => setSelectedJudge(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white transition-colors">
                <option value="">\u2014 Seleccionar juez \u2014</option>
                {unassignedJudges.map((j) => (
                  <option key={j.id} value={j.id}>{j.name} ({j.level || 'sin nivel'})</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tipo</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white transition-colors">
                <option value="evaluator">Evaluador del combate</option>
                <option value="referee_evaluator">Evaluador del árbitro</option>
              </select>
            </div>
            <div>
              <button disabled={!selectedJudge || assigning}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-[#4a0f14] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleAssign}>
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {assignments.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No hay jueces asignados a esta pelea</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-wbo-700 text-white rounded-lg">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider rounded-tl-lg">Juez</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Nivel</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Asignado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Respuesta</th>
                {isAdmin && <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.judge_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{a.name}</td>
                  <td className="py-3 px-4 text-slate-600">{a.email}</td>
                  <td className="py-3 px-4">
                    {levelBadge(a.level)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{assignmentTypeLabel(a.assignment_type)}</td>
                  <td className="py-3 px-4">
                    {statusBadge(a.status)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">{formatDateTime(a.assigned_at)}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">{formatDateTime(a.responded_at)}</td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <button disabled={a.status !== 'pending'}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-red-300 text-red-700 rounded-xl text-xs font-semibold hover:bg-red-50 hover:border-red-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
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
