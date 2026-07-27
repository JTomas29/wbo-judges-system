import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, deleteFight, analyzeFight } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';

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

const assignmentLabel = (t) => t === 'referee_evaluator' ? 'Evaluador de \u00c1rbitro' : 'Evaluador';

const statusBadge = (status) => {
  const m = { confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  return m[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '\u2014';

const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

/* ─── Sub-components ─── */

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
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <StatusIcon type={cfg.icon} />
      {cfg.label}
    </span>
  );
};

const SummaryBadge = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 dark:bg-[#1F2937]">
        <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-none dark:text-[#F8FAFC]">{value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 dark:text-[#94A3B8]">{label}</p>
      </div>
    </div>
  </div>
);

const InfoCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:bg-[#111827] dark:border-[#1E293B]">
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${color || 'bg-red-50'} flex items-center justify-center shrink-0 dark:bg-[#1F2937]`}>
        <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 dark:text-[#94A3B8]">{label}</p>
        <p className="text-sm font-bold text-slate-900 truncate dark:text-[#F8FAFC]">{value || '\u2014'}</p>
      </div>
    </div>
  </div>
);

const FighterCard = ({ name, corner, color }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 text-center dark:bg-[#111827] dark:border-[#1E293B]">
    <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white shadow-sm ${color}`}>
      {initials(name)}
    </div>
    <p className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">{name}</p>
    <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold ${corner === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
      Esquina {corner === 'red' ? 'Roja' : 'Azul'}
    </span>
  </div>
);

const JudgeRow = ({ judge }) => (
  <tr className="border-b border-slate-50 hover:bg-red-50/40 transition-colors dark:border-[#1E293B] dark:hover:bg-[#1A2435]">
    <td className="py-3.5 px-5">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
          {initials(judge.name)}
        </span>
        <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">{judge.name}</span>
      </div>
    </td>
    <td className="py-3.5 px-5">{levelBadge(judge.level)}</td>
    <td className="py-3.5 px-5 text-sm text-slate-600 dark:text-[#94A3B8]">{assignmentLabel(judge.assignment_type)}</td>
    <td className="py-3.5 px-5">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusBadge(judge.status)}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${judge.status === 'confirmed' ? 'bg-emerald-500' : judge.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
        {judge.status === 'confirmed' ? 'Confirmado' : judge.status === 'pending' ? 'Pendiente' : 'Rechazado'}
      </span>
    </td>
  </tr>
);

/* ─── Main Component ─── */
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
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-800 dark:border-[#374151]" />
        <span className="text-sm text-slate-500 font-medium dark:text-[#94A3B8]">Cargando pelea...</span>
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
  const canScore = user?.role === 'judge' && myAssignment?.status === 'confirmed' && fight?.status === 'active';

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
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

      {/* ═══ BACK ═══ */}
      <BackButton fallbackRoute="/fights" />

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-slate-900 tracking-tight leading-tight dark:text-[#F8FAFC]">{fight.event_name}</h1>
          <p className="text-base text-slate-500 mt-1 font-semibold dark:text-[#94A3B8]">{fight.boxer_red} vs {fight.boxer_blue}</p>
          <p className="text-sm text-slate-400 mt-0.5 dark:text-slate-500">
            {formatDate(fight.scheduled_date)}
            {fight.weight_class ? ` \u00B7 ${fight.weight_class}` : ''}
          </p>
          {fight.status === 'archived' && (
            <p className="text-xs text-slate-400 mt-1 italic dark:text-slate-500">Archivada el {formatDate(fight.archived_at)}</p>
          )}
        </div>
        <FightStatusBadge status={fight.status} />
      </div>

      {/* ═══ SUMMARY BADGES ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryBadge icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" label="Lugar" value={fight.venue || '\u2014'} />
        <SummaryBadge icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Fecha" value={formatDate(fight.scheduled_date)} />
        <SummaryBadge icon="M13 10V3L4 14h7v7l9-11h-7z" label="Rounds" value={`${fight.total_rounds} rounds`} />
        <SummaryBadge icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" label="Jueces asignados" value={fight.assigned_judges?.length || 0} />
        <SummaryBadge icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Estado" value={getStatus(fight.status).label} />
      </div>

      {/* ═══ FIGHTERS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FighterCard name={fight.boxer_red} corner="red" color="bg-gradient-to-br from-red-700 to-red-900" />
        <FighterCard name={fight.boxer_blue} corner="blue" color="bg-gradient-to-br from-blue-600 to-blue-800" />
      </div>

      {/* ═══ INFO GRID ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-[#1F2937]">
            <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Información</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Detalles de la pelea</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <InfoCard icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Fecha" value={formatDate(fight.scheduled_date)} />
          <InfoCard icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" label="Lugar" value={fight.venue} />
          <InfoCard icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Categoría" value={fight.weight_class} color="bg-amber-50" />
          <InfoCard icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Título" value={fight.title} color="bg-emerald-50" />
          <InfoCard icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" label="Televisora" value={fight.broadcaster} color="bg-blue-50" />
          <InfoCard icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label="Árbitro" value={fight.referee_name} color="bg-purple-50" />
          <InfoCard icon="M13 10V3L4 14h7v7l9-11h-7z" label="Rounds" value={`${fight.total_rounds} rounds`} color="bg-orange-50" />
          <InfoCard icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" label="Jueces requeridos" value={fight.min_judges_required} color="bg-sky-50" />
        </div>
      </div>

      {/* ═══ NOTES ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md dark:bg-[#111827] dark:border-[#1E293B]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-[#1F2937]">
            <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Información adicional</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Notas del combate</h3>
          </div>
        </div>
        {fight.notes ? (
          <p className="text-sm text-slate-700 leading-relaxed dark:text-[#94A3B8]">{fight.notes}</p>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm text-slate-400 italic dark:text-slate-500">No hay observaciones registradas.</p>
          </div>
        )}
      </div>

      {/* ═══ JUDGES ═══ */}
      {fight.assigned_judges?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-[#111827] dark:border-[#1E293B]">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-[#1F2937]">
                <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Cuerpo de Árbitros</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Jueces Asignados</h3>
              </div>
            </div>
          </div>
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
        </div>
      )}

      {/* ═══ JUDGE SCORING ═══ */}
      {canScore && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md dark:bg-[#111827] dark:border-[#1E293B]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-[#1F2937]">
              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Puntuación</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Tu tarjeta de puntuación</h3>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            onClick={() => navigate(`/scoring/${fight.id}`)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Puntuar pelea
          </button>
        </div>
      )}

      {/* ═══ ACTIONS ═══ */}
      {isStaff && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md dark:bg-[#111827] dark:border-[#1E293B]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-[#1F2937]">
              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide dark:text-[#94A3B8]">Gestión</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Acciones</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {user?.role === 'admin' && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
                disabled={fight.status !== 'completed'}
                title={fight.status !== 'completed' ? 'La pelea debe estar finalizada' : ''}
                onClick={() => navigate(`/official-cards/${fight.id}`)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Cargar Tarjeta Oficial
              </button>
            )}

            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:active:scale-100 dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155] dark:disabled:hover:bg-[#0B1120]"
              disabled={fight.status !== 'pending'}
              onClick={() => navigate(`/judges/assign/${fight.id}`)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Asignar Jueces
            </button>

            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:active:scale-100 dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155] dark:disabled:hover:bg-[#0B1120]"
              disabled={fight.status !== 'active'}
              title={fight.status !== 'active' ? 'La pelea debe estar activa' : ''}
              onClick={() => navigate(`/scoring/live/${fight.id}`)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Seguimiento en vivo
            </button>

            {user?.role === 'admin' && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:active:scale-100 dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155] dark:disabled:hover:bg-[#0B1120]"
                disabled={fight.status !== 'completed' || !fight.official_card || analyzing}
                title={fight.status !== 'completed' || !fight.official_card ? 'La pelea debe estar finalizada y tener tarjeta oficial' : ''}
                onClick={async () => {
                  setAnalyzeError(null);
                  setAnalyzing(true);
                  try {
                    await analyzeFight(id, token);
                    navigate(`/analysis/${id}`);
                  } catch (err) {
                    setAnalyzeError(err.response?.data?.message || 'Error al ejecutar el an\u00e1lisis');
                    setAnalyzing(false);
                  }
                }}
              >
                {analyzing ? (
                  <span className="inline-flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-red-800 border-t-transparent rounded-full" />Procesando...</span>
                ) : (
                  <span className="inline-flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Analizar Pelea</span>
                )}
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300 disabled:active:scale-100 dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155] dark:disabled:hover:bg-[#0B1120]"
                disabled={fight.status === 'completed' || fight.status === 'analyzed' || fight.status === 'cancelled' || fight.status === 'archived'}
                title={fight.status === 'completed' || fight.status === 'analyzed' || fight.status === 'cancelled' || fight.status === 'archived' ? 'No se puede editar esta pelea' : ''}
                onClick={() => navigate(`/fights/${fight.id}/edit`)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Editar
              </button>
            )}

            <div className="flex-1" />

            {user?.role === 'admin' && fight.status !== 'archived' && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all active:scale-[0.98] dark:text-red-400 dark:bg-[#0B1120] dark:border-red-800/50 dark:hover:bg-red-900/20"
                onClick={() => { setShowDeleteModal(true); setDeleteError(null); }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Eliminar Pelea
              </button>
            )}
          </div>

          {analyzeError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 dark:bg-red-900/30 dark:border-red-800/50">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{analyzeError}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ FOOTER BUTTONS ═══ */}
      <div className="flex gap-3 flex-wrap">
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md active:scale-[0.98] dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155]"
          onClick={() => navigate(`/official-cards/${fight.id}`)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Ver Tarjetas
        </button>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md active:scale-[0.98] dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435] dark:hover:border-[#334155]"
          onClick={() => navigate(`/analysis/${fight.id}`)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Ver Análisis
        </button>
      </div>

      {/* ═══ DELETE MODAL ═══ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { if (!deleting) { setShowDeleteModal(false); setDeleteError(null); } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-[fadeIn_0.2s_ease-out] dark:bg-[#111827] dark:border dark:border-[#1E293B]" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4 dark:bg-red-900/30">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2 dark:text-[#F8FAFC]">Eliminar pelea</h3>
            <p className="text-sm text-slate-500 text-center mb-1 dark:text-[#94A3B8]">La pelea <strong>{fight.event_name}</strong> será archivada.</p>
            <p className="text-xs text-slate-500 text-center mb-1 dark:text-slate-500">Ya no aparecerá en el listado principal.</p>
            <p className="text-xs text-slate-400 text-center mb-6 dark:text-slate-500">Esta acción no elimina tarjetas, análisis ni estadísticas.</p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-300">{deleteError}</div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all dark:text-[#94A3B8] dark:bg-[#0B1120] dark:border-[#1E293B] dark:hover:bg-[#1A2435]"
                disabled={deleting}
                onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {deleting ? 'Archivando...' : 'Archivar pelea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FightDetails;
