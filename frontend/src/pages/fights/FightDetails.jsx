import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, deleteFight, analyzeFight } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import DetailSection from '../../components/detail/DetailSection';
import ActionPanel, { ActionButton } from '../../components/detail/ActionPanel';
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
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusBadge(judge.status)}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${judge.status === 'confirmed' ? 'bg-emerald-500' : judge.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
        {judge.status === 'confirmed' ? 'Confirmado' : judge.status === 'pending' ? 'Pendiente' : 'Rechazado'}
      </span>
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

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={MapPinIcon} label="Lugar" value={fight.venue || '—'} accent="sky" />
        <SummaryCard icon={CalendarIcon} label="Fecha" value={formatDate(fight.scheduled_date)} accent="violet" />
        <SummaryCard icon={BoltIcon} label="Rounds" value={`${fight.total_rounds} rounds`} accent="amber" />
        <SummaryCard icon={UserGroupIcon} label="Jueces" value={`${fight.assigned_judges?.length || 0} asignados`} accent="emerald" />
        <SummaryCard icon={CheckBadgeIcon} label="Confirmados" value={`${fight.assigned_judges?.filter(j => j.status === 'confirmed').length || 0}/${fight.assigned_judges?.length || 0}`} accent="blue" />
      </div>

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
