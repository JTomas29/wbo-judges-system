import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAssignments, respondAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';

const SEEN_KEY = 'wbo_seen_assignments';

const getSeenSet = (userId) => {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY}_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const markAsSeen = (userId, fightId) => {
  try {
    const set = getSeenSet(userId);
    set.add(fightId);
    localStorage.setItem(`${SEEN_KEY}_${userId}`, JSON.stringify([...set]));
  } catch {}
};

const markBatchAsSeen = (userId, fightIds) => {
  try {
    const set = getSeenSet(userId);
    fightIds.forEach((id) => set.add(id));
    localStorage.setItem(`${SEEN_KEY}_${userId}`, JSON.stringify([...set]));
  } catch {}
};

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  return map[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
};

const fightStatusBadge = (status) => {
  const map = {
    pending: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300',
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    analyzed: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  return map[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
};

const assignmentTypeLabel = (type) => {
  const map = {
    evaluator: 'Evaluador del combate',
    referee_evaluator: 'Evaluador del árbitro',
  };
  return map[type] || type;
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getLeftBorder = (a, isNew) => {
  if (isNew) return 'border-l-red-600';
  if (a.assignment_status === 'pending') return 'border-l-amber-500';
  if (a.assignment_status === 'rejected') return 'border-l-red-400';
  if (a.fight_status === 'active') return 'border-l-emerald-500';
  if (a.fight_status === 'completed') return 'border-l-red-500';
  if (a.fight_status === 'analyzed') return 'border-l-violet-500';
  if (a.assignment_status === 'confirmed') return 'border-l-emerald-500';
  return 'border-l-slate-300 dark:border-l-slate-600';
};

const StatCard = ({ label, count, icon, dotColor }) => (
  <div className="flex items-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm px-4 py-3 min-w-[130px] transition-all duration-250 hover:shadow-md hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <div>
      <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] leading-none">{count}</p>
      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">{label}</p>
    </div>
    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ml-auto`} />
  </div>
);

const Confirmation = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isJudge = user?.role === 'judge';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [seenTick, setSeenTick] = useState(0);

  const [searchEvent, setSearchEvent] = useState('');
  const [filterAssignStatus, setFilterAssignStatus] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const getAssignStatus = (a) => {
    if (a.assignment_status === 'pending') return 'pending';
    if (a.assignment_status === 'rejected') return 'rejected';
    if (a.assignment_status === 'confirmed') {
      if (a.fight_status === 'pending') return 'confirmed';
      if (a.fight_status === 'active') return 'active';
      if (a.fight_status === 'completed' || a.fight_status === 'analyzed') return 'finalized';
    }
    return 'pending';
  };

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];
    if (searchEvent) {
      result = result.filter((a) => a.event_name?.toLowerCase().includes(searchEvent.toLowerCase()));
    }
    if (filterAssignStatus) {
      result = result.filter((a) => getAssignStatus(a) === filterAssignStatus);
    }
    if (sortOrder === 'closest') {
      result.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    } else if (sortOrder === 'farthest') {
      result.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    } else {
      result.sort((a, b) => new Date(b.assigned_at || 0) - new Date(a.assigned_at || 0));
    }
    return result;
  }, [assignments, searchEvent, filterAssignStatus, sortOrder]);

  const clearFilters = () => {
    setSearchEvent('');
    setFilterAssignStatus('');
    setSortOrder('');
  };

  const hasActiveFilters = searchEvent || filterAssignStatus || sortOrder;

  const seenSet = useMemo(() => getSeenSet(user?.id), [user?.id, seenTick]);

  const newCount = useMemo(
    () => assignments.filter((a) => a.assignment_status === 'pending' && !seenSet.has(a.fight_id)).length,
    [assignments, seenSet],
  );

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

  const markVisiblePendingAsSeen = useCallback(() => {
    if (!user?.id) return;
    const pendingIds = assignments
      .filter((a) => a.assignment_status === 'pending')
      .map((a) => a.fight_id);
    if (pendingIds.length > 0) {
      markBatchAsSeen(user.id, pendingIds);
      setSeenTick((t) => t + 1);
    }
  }, [user?.id, assignments]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    if (assignments.length > 0 && user?.id) {
      const timer = setTimeout(() => markVisiblePendingAsSeen(), 2000);
      return () => clearTimeout(timer);
    }
  }, [assignments, user?.id, markVisiblePendingAsSeen]);

  const handleRespond = async (fightId, response, reason) => {
    setResponding(fightId);
    setError(null);
    try {
      const body = { response };
      if (reason) body.reason = reason;
      const res = await respondAssignment(fightId, body, token);
      if (user?.id) markAsSeen(user.id, fightId);
      setSeenTick((t) => t + 1);
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
      setError(err.response?.data?.message || 'Error al responder la asignación');
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
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-6 py-4 rounded-xl text-sm font-semibold">Solo los jueces pueden acceder a esta página</div>
    </div>
  );

  if (loading) return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-600 border-t-red-800" />
        <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Cargando asignaciones...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-sm font-semibold">{error}</div>
    </div>
  );

  const pending = assignments.filter(a => a.assignment_status === 'pending').length;
  const confirmed = assignments.filter(a => a.assignment_status === 'confirmed').length;
  const rejected = assignments.filter(a => a.assignment_status === 'rejected').length;

  if (assignments.length === 0) return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-2">No tenés designaciones pendientes</h3>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Cuando un administrador te asigne una pelea aparecerá aquí.</p>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-10 sm:pb-12">
      {/* ─── Header ─── */}
      <div className="max-w-[1440px] mx-auto mb-8">
        <div className="mb-4">
          <BackButton fallbackRoute="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Mis Designaciones</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Aquí puedes consultar todas las peleas asignadas y su estado actual.</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {newCount > 0 && (
              <StatCard label="Nuevas" count={newCount} dotColor="bg-red-500" icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            )}
            <StatCard label="Pendientes" count={pending} dotColor="bg-amber-500" icon="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            <StatCard label="Confirmadas" count={confirmed} dotColor="bg-emerald-500" icon="M5 13l4 4L19 7" />
            <StatCard label="Rechazadas" count={rejected} dotColor="bg-red-500" icon="M6 18L18 6M6 6l12 12" />
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="max-w-[1440px] mx-auto mb-6">
        <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
          <FilterInput value={searchEvent} onChange={setSearchEvent} placeholder="Buscar por evento..." />
          <FilterSelect
            value={filterAssignStatus}
            onChange={setFilterAssignStatus}
            options={[
              { value: 'pending', label: 'Pendiente' },
              { value: 'confirmed', label: 'Confirmada' },
              { value: 'active', label: 'Activa' },
              { value: 'finalized', label: 'Finalizada' },
            ]}
            placeholder="Estado"
          />
          <FilterSelect
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'closest', label: 'Fecha más próxima' },
              { value: 'farthest', label: 'Fecha más lejana' },
            ]}
            placeholder="Ordenar por"
          />
        </FilterBar>
      </div>

      {/* ─── List ─── */}
      <div className="max-w-[1440px] mx-auto space-y-5">
        {filteredAssignments.map((a) => {
          const isPending = a.assignment_status === 'pending';
          const isActive = a.fight_status === 'active';
          const isNew = isPending && !seenSet.has(a.fight_id);

          return (
            <div key={a.fight_id} className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-l-[5px] ${getLeftBorder(a, isNew)} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5${isNew ? ' ring-1 ring-red-200/60 dark:ring-red-800/40' : ''}`}>
              {a._justActivated && (
                <div className="mx-6 mt-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  La pelea quedó activa. Ya podés cargar tu tarjeta de puntuación.
                </div>
              )}

              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{a.event_name}</h2>
                      <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        {a.venue ? `${a.venue}${a.weight_class ? ` · ${a.weight_class}` : ''}` : (a.weight_class || 'Sin detalles')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isNew && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-sm animate-pulse">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Nueva
                      </span>
                    )}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(a.assignment_status)}`}>
                      {a.assignment_status === 'pending' ? 'Pendiente' : a.assignment_status === 'confirmed' ? 'Confirmada' : 'Rechazada'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${fightStatusBadge(a.fight_status)}`}>
                      {a.fight_status === 'pending' ? 'Esperando' : a.fight_status === 'active' ? 'Activa' : a.fight_status === 'completed' ? 'Completada' : a.fight_status === 'analyzed' ? 'Analizada' : a.fight_status === 'cancelled' ? 'Cancelada' : a.fight_status}
                    </span>
                    <button
                      onClick={() => navigate(`/scoring/${a.fight_id}`)}
                      className="w-12 h-12 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/40 hover:shadow-sm transition-all duration-250"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Fecha
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{formatDate(a.scheduled_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Boxeador rojo
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{a.boxer_red}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Boxeador azul
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{a.boxer_blue}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lugar
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{a.venue || '\u2014'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Tipo de asignación
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{assignmentTypeLabel(a.assignment_type)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6">
                {isPending ? (
                  <div>
                    {rejecting === a.fight_id ? (
                      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-5 mb-3 border border-red-100 dark:border-red-800/30">
                        <label className="block text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Motivo del rechazo *</label>
                        <textarea
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 resize-none mb-3 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
                          rows={3}
                          placeholder="Explique por qué no puede aceptar la designación..."
                          value={rejectReasons[a.fight_id] || ''}
                          onChange={(e) => setRejectReasons((prev) => ({ ...prev, [a.fight_id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={responding === a.fight_id}
                            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            onClick={() => confirmReject(a.fight_id)}
                          >
                            {responding === a.fight_id ? 'Enviando...' : 'Enviar rechazo'}
                          </button>
                          <button
                            disabled={responding === a.fight_id}
                            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-all duration-250"
                            onClick={() => cancelReject(a.fight_id)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          disabled={responding === a.fight_id}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all duration-250 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                          onClick={() => handleRespond(a.fight_id, 'confirmed')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {responding === a.fight_id ? 'Respondiendo...' : 'Confirmar'}
                        </button>
                        <button
                          disabled={responding === a.fight_id}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#0B1120] border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                          onClick={() => startReject(a.fight_id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                ) : a.assignment_status === 'rejected' && a.rejection_reason ? (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-2">Respondiste: {formatDateTime(a.responded_at)}</p>
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/30">{a.rejection_reason}</div>
                  </div>
                ) : a.assignment_status === 'confirmed' ? (
                  <div>
                    {isActive && a.scorecard_status === 'finalized' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Tarjeta enviada correctamente
                        </div>
                        <button
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-red-800 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-250 active:scale-[0.98]"
                          onClick={() => navigate(`/scoring/${a.fight_id}`)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalle de mi tarjeta
                        </button>
                      </div>
                    ) : isActive ? (
                      <button
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-sm font-semibold transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98]"
                        onClick={() => navigate(`/scoring/${a.fight_id}`)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Puntuar pelea
                      </button>
                    ) : a.fight_status === 'completed' || a.fight_status === 'analyzed' ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-semibold border border-slate-200 dark:border-[#1E293B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        La pelea ya finalizó
                      </div>
                    ) : a.fight_status === 'pending' ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-semibold border border-slate-200 dark:border-[#1E293B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Esperando que la pelea comience
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Respondiste: {formatDateTime(a.responded_at)}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Respondiste: {formatDateTime(a.responded_at)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Confirmation;
