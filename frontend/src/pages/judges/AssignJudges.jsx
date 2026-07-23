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
  const canManage = user?.role === 'admin' || user?.role === 'supervisor';

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

  if (!canManage && !loading) {
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
    <div className="animate-fadeIn space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <BackButton fallbackRoute="/dashboard" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asignar Jueces</h1>
          {fight && (
            <p className="text-sm text-slate-500 mt-0.5">{fight.event_name} — {fight.boxer_red} vs {fight.boxer_blue}</p>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div className="leading-none">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Confirmados</span>
              <p className="text-lg font-bold text-emerald-800 mt-0.5">{confirmedCount}<span className="text-sm font-semibold text-emerald-500"> / {minRequired}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* ── Fight Info Card ── */}
      {fight && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Información de la pelea</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                Evento
              </p>
              <p className="text-sm font-bold text-slate-900">{fight.event_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Boxeador Rojo
              </p>
              <p className="text-sm font-bold text-slate-900">{fight.boxer_red}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Boxeador Azul
              </p>
              <p className="text-sm font-bold text-slate-900">{fight.boxer_blue}</p>
            </div>
            {fight.scheduled_date && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Fecha
                </p>
                <p className="text-sm font-bold text-slate-900">{new Date(fight.scheduled_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {fight.venue && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Lugar
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">{fight.venue}</p>
              </div>
            )}
            {fight.weight_class && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                  Categoría
                </p>
                <p className="text-sm font-bold text-slate-900">{fight.weight_class}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {assignError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {assignError}
        </div>
      )}

      {/* ── Nueva Asignación ── */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-700">Nueva Asignación</h3>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Juez</label>
                <select value={selectedJudge} onChange={(e) => setSelectedJudge(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white transition-all duration-200 hover:border-slate-300">
                  <option value="">— Seleccionar juez —</option>
                  {unassignedJudges.map((j) => (
                    <option key={j.id} value={j.id}>{j.name} ({j.level || 'sin nivel'})</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tipo</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 bg-white transition-all duration-200 hover:border-slate-300">
                  <option value="evaluator">Evaluador del combate</option>
                  <option value="referee_evaluator">Evaluador del árbitro</option>
                </select>
              </div>
              <button disabled={!selectedJudge || assigning}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-800 text-white rounded-xl text-sm font-bold hover:bg-red-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                onClick={handleAssign}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">No hay jueces asignados</p>
            <p className="text-xs text-slate-400 mt-1">Usá el formulario de arriba para asignar jueces a esta pelea.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Juez</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Nivel</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tipo</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Asignado</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Respuesta</th>
                  {canManage && <th className="text-right py-3.5 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.judge_id} className="border-b border-slate-100 last:border-0 hover:bg-red-50/30 transition-all duration-200">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white shadow-sm">
                          {a.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="font-semibold text-slate-800 truncate">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 text-xs hidden md:table-cell">{a.email}</td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">{levelBadge(a.level)}</td>
                    <td className="py-3.5 px-5 text-slate-600 text-xs hidden lg:table-cell">{assignmentTypeLabel(a.assignment_type)}</td>
                    <td className="py-3.5 px-5">{statusBadge(a.status)}</td>
                    <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap text-xs hidden xl:table-cell">{formatDateTime(a.assigned_at)}</td>
                    <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap text-xs hidden xl:table-cell">{formatDateTime(a.responded_at)}</td>
                    {canManage && (
                      <td className="py-3.5 px-5 text-right">
                        <button disabled={a.status !== 'pending'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-red-300"
                          onClick={() => handleRemove(a.judge_id)}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <BackButton fallbackRoute="/dashboard" />
      </div>
    </div>
  );
};

export default AssignJudges;
