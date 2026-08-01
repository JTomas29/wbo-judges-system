import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, deleteFight, analyzeFight } from '../../services/fightService';
import { respondAssignment } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import DetailSection from '../../components/detail/DetailSection';
import ActionPanel, { ActionButton } from '../../components/detail/ActionPanel';
import RefereeEvaluationSection from '../../components/detail/RefereeEvaluation';
import { DeleteModal } from '../../components/common/modals';
import { MapPinIcon, CalendarIcon, BoltIcon, UserGroupIcon, CheckBadgeIcon, InformationCircleIcon, PencilSquareIcon, UsersIcon, StarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const summaryAccents = {
  blue: { border: 'border-t-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400' },
  violet: { border: 'border-t-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-700 dark:text-violet-400' },
  amber: { border: 'border-t-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-700 dark:text-amber-400' },
  sky: { border: 'border-t-sky-500', iconBg: 'bg-sky-50 dark:bg-sky-900/20', iconColor: 'text-sky-700 dark:text-sky-400' },
  emerald: { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-700 dark:text-emerald-400' },
};

const detailAccents = {
  red: { border: 'border-t-red-500/30', iconBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-700 dark:text-red-400' },
  blue: { border: 'border-t-blue-500/30', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400' },
  violet: { border: 'border-t-violet-500/30', iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-700 dark:text-violet-400' },
  amber: { border: 'border-t-amber-500/30', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-700 dark:text-amber-400' },
  emerald: { border: 'border-t-emerald-500/30', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-700 dark:text-emerald-400' },
  sky: { border: 'border-t-sky-500/30', iconBg: 'bg-sky-50 dark:bg-sky-900/20', iconColor: 'text-sky-700 dark:text-sky-400' },
};

const statusConfig = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800/50', icon: 'clock', label: 'Pendiente' },
  active: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'zap', label: 'Activa' },
  completed: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800/50', icon: 'check', label: 'Finalizada' },
  analyzed: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-800/50', icon: 'chart', label: 'Analizada' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-800/50', icon: 'x', label: 'Cancelada' },
  archived: { bg: 'bg-slate-100 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', border: 'border-slate-300 dark:border-slate-700', icon: 'archive', label: 'Archivada' },
};

const getStatus = (status) => statusConfig[status] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200', icon: 'clock', label: status };

const levelBadge = (level) => {
  if (!level) return null;
  const colors = {
    junior: 'bg-blue-100 text-blue-700 dark:bg-amber-900/30 dark:text-amber-300',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    senior: 'bg-purple-100 text-purple-700 dark:bg-blue-900/30 dark:text-blue-300',
    elite: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold capitalize ${colors[level] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{level}</span>;
};

const assignmentLabel = (t) => t === 'referee_evaluator' ? 'Evaluador de Árbitro' : 'Evaluador';

const statusBadge = (status) => {
  const m = { confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  return m[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

const StatusIcon = ({ type }) => {
  const paths = {
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    zap: 'M13 10V3L4 14h7v7l9-11h-7z',
    check: 'M5 13l4 4L19 7',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    x: 'M6 18L18 6M6 6l12 12',
    archive: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  };
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={paths[type] || paths.clock} /></svg>;
};

const FightStatusBadge = ({ status }) => {
  const cfg = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border} shadow-sm`}>
      <StatusIcon type={cfg.icon} />
      {cfg.label}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, label, value, accent = 'blue' }) => {
  const a = summaryAccents[accent];
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${a.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B] m-0 leading-none">{label}</p>
          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mt-1 m-0 leading-tight truncate">{value}</p>
        </div>
      </div>
    </div>
  );
};

const FighterCard = ({ name, corner, color }) => (
  <div className={`bg-white dark:bg-[#111827] rounded-2xl border-2 shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-center group ${corner === 'red' ? 'border-red-200/60 dark:border-red-800/30' : 'border-blue-200/60 dark:border-blue-800/30'}`}>
    <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${color}`}>
      {initials(name)}
    </div>
    <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] m-0">{name}</p>
    <span className={`inline-block mt-3 px-4 py-1 rounded-full text-xs font-semibold shadow-sm ring-1 ${corner === 'red' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-200 dark:ring-red-800/50' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/50'}`}>
      Esquina {corner === 'red' ? 'Roja' : 'Azul'}
    </span>
  </div>
);

const tabs = [
  { id: 'details', label: 'Detalles' },
  { id: 'notes', label: 'Notas' },
  { id: 'judges', label: 'Jueces' },
];

const SimpleTabs = ({ active, onChange, children }) => (
  <div>
    <div className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-100/80 dark:bg-[#1E293B]/80 rounded-2xl w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
            active === t.id
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F8FAFC] shadow-sm border-t-2 border-t-wbo-700'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
    <div className="animate-[fadeIn_0.25s_ease-out]">
      {children}
    </div>
  </div>
);

const JudgeRow = ({ judge }) => (
  <tr className="border-b border-slate-50 hover:bg-red-50/40 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
    <td className="py-3.5 px-5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm ring-1 ring-red-300 dark:ring-red-700/50">
          {initials(judge.name)}
        </span>
        <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{judge.name}</span>
      </div>
    </td>
    <td className="py-3.5 px-5">{levelBadge(judge.level)}</td>
    <td className="py-3.5 px-5 text-sm text-slate-600 dark:text-[#94A3B8]">{assignmentLabel(judge.assignment_type)}</td>
    <td className="py-3.5 px-5">
      <div className="flex flex-col gap-1.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusBadge(judge.status)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${judge.status === 'confirmed' ? 'bg-emerald-500' : judge.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
          {judge.status === 'confirmed' ? 'Confirmado' : judge.status === 'pending' ? 'Pendiente' : 'Rechazado'}
        </span>
        {judge.status === 'rejected' && judge.rejection_reason && (
          <span className="text-[11px] text-red-600 dark:text-red-400 leading-tight max-w-[180px] truncate" title={judge.rejection_reason}>
            {judge.rejection_reason}
          </span>
        )}
      </div>
    </td>
  </tr>
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
  const [activeTab, setActiveTab] = useState('details');
  const [responding, setResponding] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [respondError, setRespondError] = useState(null);

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
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-700 border-t-red-800" />
        <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Cargando pelea...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-300">{error}</div>
    </div>
  );

  if (!fight) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-300">Pelea no encontrada</div>
    </div>
  );

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const myAssignment = fight?.assigned_judges?.find(j => j.id === user?.id);
  const isExpired = user?.role === 'judge' &&
    myAssignment?.status === 'confirmed' &&
    fight?.scheduled_date && new Date(fight.scheduled_date) < new Date() &&
    (fight?.status === 'pending' || fight?.status === 'active');
  const canScore = user?.role === 'judge' && myAssignment?.status === 'confirmed' && fight?.status === 'active' && !isExpired;

  const handleConfirm = async () => {
    setResponding(true);
    setRespondError(null);
    try {
      await respondAssignment(id, { response: 'confirmed' }, token);
      setFight(prev => ({
        ...prev,
        assigned_judges: prev.assigned_judges.map(j =>
          j.id === user.id ? { ...j, status: 'confirmed' } : j
        ),
      }));
    } catch (err) {
      setRespondError(err.response?.data?.message || 'Error al confirmar la designación');
    } finally {
      setResponding(false);
    }
  };

  const handleShowReject = () => {
    setRejecting(true);
    setRejectReason('');
    setRespondError(null);
  };

  const handleCancelReject = () => {
    setRejecting(false);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRespondError('Debe indicar el motivo del rechazo');
      return;
    }
    setResponding(true);
    setRespondError(null);
    try {
      await respondAssignment(id, { response: 'rejected', reason: rejectReason.trim() }, token);
      setFight(prev => ({
        ...prev,
        assigned_judges: prev.assigned_judges.map(j =>
          j.id === user.id ? { ...j, status: 'rejected', rejection_reason: rejectReason.trim() } : j
        ),
      }));
      setRejecting(false);
    } catch (err) {
      setRespondError(err.response?.data?.message || 'Error al rechazar la designación');
    } finally {
      setResponding(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFight(id, token);
      setShowDeleteModal(false);
      navigate('/history', { state: { toast: { type: 'success', message: 'Pelea archivada correctamente' } } });
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error al archivar la pelea');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-white via-white to-wbo-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-2 border-t-wbo-700 shadow-md p-6 md:p-8 animate-[fadeIn_0.3s_ease-out]">
        <BackButton fallbackRoute="/fights" />
        <div className="mt-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight m-0 leading-tight">
            {fight.event_name}
          </h1>
          <p className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-300 mt-2 m-0">
            {fight.boxer_red} <span className="text-slate-400 dark:text-slate-500 font-normal">vs</span> {fight.boxer_blue}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
              {formatDate(fight.scheduled_date)}
            </span>
            {fight.weight_class && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                {fight.weight_class}
              </span>
            )}
            {fight.venue && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPinIcon className="w-4 h-4 text-slate-400 shrink-0" />
                {fight.venue}
              </span>
            )}
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#1E293B] flex items-center gap-3">
          <FightStatusBadge status={fight.status} />
          {fight.title && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full ring-1 ring-amber-200 dark:ring-amber-800/40 font-semibold">
              🏆 {fight.title}
            </span>
          )}
        </div>
      </div>

      {/* ── Judge Confirmation ── */}
      {user?.role === 'judge' && myAssignment?.status === 'pending' && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-50/40 dark:from-amber-900/10 dark:to-amber-900/5 rounded-2xl border border-amber-200 dark:border-amber-800/30 border-t-[3px] border-t-amber-500 shadow-sm p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 m-0">Designación pendiente</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 m-0 mt-0.5">Has sido designado para esta pelea. Confirmá o rechazá tu participación.</p>
            </div>
          </div>
          {rejecting ? (
            <div>
              <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Motivo del rechazo *</label>
              <textarea
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none mb-3 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500"
                rows={3}
                placeholder="Explique por qué no puede aceptar la designación..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  disabled={responding}
                  className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-40 shadow-sm"
                  onClick={handleConfirmReject}
                >
                  {responding ? 'Enviando...' : 'Enviar rechazo'}
                </button>
                <button
                  disabled={responding}
                  className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-all"
                  onClick={handleCancelReject}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                disabled={responding}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-40"
                onClick={handleConfirm}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {responding ? 'Respondiendo...' : 'Confirmar'}
              </button>
              <button
                disabled={responding}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#0B1120] border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/40 hover:text-red-600 dark:hover:text-red-400 transition-all disabled:opacity-40"
                onClick={handleShowReject}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazar
              </button>
            </div>
          )}
          {respondError && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-2.5">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 m-0">{respondError}</p>
            </div>
          )}
        </div>
      )}
      {user?.role === 'judge' && myAssignment?.status === 'confirmed' && (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/40 dark:from-emerald-900/5 dark:to-emerald-900/5 rounded-2xl border border-emerald-200 dark:border-emerald-800/20 border-t-[3px] border-t-emerald-500 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 m-0">Designación confirmada</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 m-0 mt-0.5">Ya confirmaste tu participación en esta pelea.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={MapPinIcon} label="Lugar" value={fight.venue || '—'} accent="sky" />
        <SummaryCard icon={CalendarIcon} label="Fecha" value={formatDate(fight.scheduled_date)} accent="violet" />
        <SummaryCard icon={BoltIcon} label="Rounds" value={`${fight.total_rounds} rounds`} accent="amber" />
        <SummaryCard icon={UserGroupIcon} label="Jueces" value={`${fight.assigned_judges?.length || 0} asignados`} accent="emerald" />
        <SummaryCard icon={CheckBadgeIcon} label="Confirmados" value={`${fight.assigned_judges?.filter(j => j.status === 'confirmed').length || 0}/${fight.assigned_judges?.length || 0}`} accent="blue" />
      </div>

      {/* ── Referee card ── */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-violet-500 shadow-sm p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-700 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Árbitro</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] m-0 mt-0.5">Oficial del combate</p>
          </div>
        </div>
        {fight.referee ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-violet-700 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Nombre</p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.referee.first_name} {fight.referee.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-violet-700 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Licencia</p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.referee.license_number || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-violet-700 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Federación</p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{fight.referee.federation || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-violet-700 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-0.5">Estado</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${fight.referee.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${fight.referee.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {fight.referee.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-sm text-slate-400 italic dark:text-slate-500 m-0">No se ha asignado un árbitro a esta pelea.</p>
          </div>
        )}
      </div>

      {/* ── Referee Evaluation ── */}
      <RefereeEvaluationSection fight={fight} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FighterCard name={fight.boxer_red} corner="red" color="bg-gradient-to-br from-red-700 to-red-900" />
        <FighterCard name={fight.boxer_blue} corner="blue" color="bg-gradient-to-br from-blue-600 to-blue-800" />
      </div>

      {/* ── Tabs: Detalles / Notas / Jueces ── */}
      <SimpleTabs active={activeTab} onChange={setActiveTab}>
        {activeTab === 'details' && (
          <DetailSection icon={InformationCircleIcon} title="Detalles de la pelea" description="Información general del combate">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[
                { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight.scheduled_date), a: detailAccents.blue },
                { icon: MapPinIcon, label: 'Lugar', value: fight.venue, a: detailAccents.sky },
                { icon: Cog6ToothIcon, label: 'Categoría', value: fight.weight_class, a: detailAccents.violet },
                { icon: CheckBadgeIcon, label: 'Título', value: fight.title, a: detailAccents.amber },
                { icon: BoltIcon, label: 'Rounds', value: `${fight.total_rounds} rounds`, a: detailAccents.red },
                { icon: UserGroupIcon, label: 'Jueces asignados', value: `${fight.assigned_judges?.length || 0} / 10`, a: detailAccents.emerald },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <div className={`w-9 h-9 rounded-lg ${item.a.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className={`w-4 h-4 ${item.a.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-0.5 m-0">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate m-0">{item.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {activeTab === 'notes' && (
          <DetailSection icon={PencilSquareIcon} title="Notas del combate" description="Observaciones del combate">
            {fight.notes ? (
              <div className="bg-gradient-to-br from-white to-amber-50/30 dark:from-[#1F2937] dark:to-[#1a1510] rounded-xl border border-amber-100 dark:border-amber-800/30 p-5">
                <p className="text-sm text-slate-700 leading-relaxed dark:text-[#94A3B8] m-0">{fight.notes}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <svg className="w-5 h-5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm text-slate-400 italic dark:text-slate-500 m-0">No hay observaciones registradas.</p>
              </div>
            )}
          </DetailSection>
        )}

        {activeTab === 'judges' && fight.assigned_judges?.length > 0 && (
          <DetailSection icon={UsersIcon} title="Jueces Asignados" description="Cuerpo de árbitros asignados a este combate">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E293B]">
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Nombre</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Nivel</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Rol</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fight.assigned_judges.map((j) => (
                    <JudgeRow key={j.id} judge={j} />
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>
        )}

        {activeTab === 'judges' && (!fight.assigned_judges || fight.assigned_judges.length === 0) && (
          <DetailSection icon={UsersIcon} title="Jueces Asignados" description="Cuerpo de árbitros asignados a este combate">
            <div className="flex items-center gap-3 py-2">
              <UsersIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 italic dark:text-slate-500 m-0">No hay jueces asignados a este combate.</p>
            </div>
          </DetailSection>
        )}
      </SimpleTabs>

      {isExpired && (
        <DetailSection icon={StarIcon} title="Tu tarjeta de puntuación" description="Puntuación">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 sm:p-5 text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 m-0">La fecha programada para esta pelea ya pasó y no se recibió tu tarjeta a tiempo.</p>
          </div>
        </DetailSection>
      )}
      {canScore && (
        <DetailSection icon={StarIcon} title="Tu tarjeta de puntuación" description="Puntuación">
          <ActionButton
            onClick={() => navigate(`/scoring/${fight.id}`)}
            icon={StarIcon}
          >
            Puntuar pelea
          </ActionButton>
        </DetailSection>
      )}

      {isStaff && (
        <DetailSection icon={Cog6ToothIcon} title="Acciones" description="Gestión de la pelea">
          <ActionPanel>
            {isStaff && (
              <ActionButton
                onClick={() => navigate(`/official-cards/${fight.id}`)}
                disabled={fight.status !== 'completed'}
              >
                Cargar Tarjeta Oficial
              </ActionButton>
            )}
            <ActionButton
              variant="secondary"
              onClick={() => navigate(`/judges/assign/${fight.id}`)}
              disabled={fight.status !== 'pending'}
            >
              Asignar Jueces
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => navigate(`/scoring/live/${fight.id}`)}
              disabled={fight.status !== 'active'}
            >
              Seguimiento en vivo
            </ActionButton>
            {isStaff && (
              <ActionButton
                variant="secondary"
                disabled={fight.status !== 'completed' || !fight.official_card || analyzing}
                onClick={async () => {
                  setAnalyzeError(null);
                  setAnalyzing(true);
                  try {
                    await analyzeFight(id, token);
                    navigate(`/analysis/${id}`);
                  } catch (err) {
                    setAnalyzeError(err.response?.data?.message || 'Error al ejecutar el análisis');
                    setAnalyzing(false);
                  }
                }}
              >
                {analyzing ? 'Procesando...' : 'Analizar Pelea'}
              </ActionButton>
            )}
            {user?.role === 'admin' && (
              <ActionButton
                variant="secondary"
                disabled={fight.status === 'completed' || fight.status === 'analyzed' || fight.status === 'cancelled' || fight.status === 'archived'}
                onClick={() => navigate(`/fights/${fight.id}/edit`)}
              >
                Editar
              </ActionButton>
            )}
            <div className="flex-1" />
            {user?.role === 'admin' && fight.status !== 'archived' && (
              <ActionButton
                variant="danger"
                onClick={() => { setShowDeleteModal(true); setDeleteError(null); }}
              >
                Eliminar Pelea
              </ActionButton>
            )}
          </ActionPanel>

          {analyzeError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 dark:bg-red-900/30 dark:border-red-800/50">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 m-0">{analyzeError}</p>
            </div>
          )}
        </DetailSection>
      )}

      <ActionPanel>
        <ActionButton variant="secondary" onClick={() => navigate(`/official-cards/${fight.id}`)}>
          Ver Tarjetas
        </ActionButton>
        <ActionButton variant="secondary" onClick={() => navigate(`/analysis/${fight.id}`)}>
          Ver Análisis
        </ActionButton>
      </ActionPanel>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Archivar pelea"
        itemName={fight.event_name}
        description={<>La pelea <strong>{fight.event_name}</strong> será archivada. Ya no aparecerá en el listado principal. Esta acción no elimina tarjetas, análisis ni estadísticas.</>}
        confirmLabel={deleting ? 'Archivando...' : 'Archivar pelea'}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default FightDetails;
