import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById } from '../../services/fightService';
import { getMyScorecard, createScorecard, saveRound, finalizeScorecard } from '../../services/scoringService';
import DetailPageHeader from '../../components/detail/DetailPageHeader';
import DetailSection from '../../components/detail/DetailSection';
import DetailSummaryCard from '../../components/detail/DetailSummaryCard';
import { PageActionButton } from '../../components/detail/PageActions';
import { ConfirmModal } from '../../components/common/modals';
import { CalendarIcon, MapPinIcon, UserGroupIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDate = (d) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const inputBase = "w-full px-2 py-1.5 text-center rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-[#F8FAFC] text-sm font-bold shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed";

const SuccessHero = ({ submittedAt }) => (
  <div className="bg-gradient-to-br from-white via-white to-wbo-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#1a1528] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-wbo-700 shadow-lg p-8 sm:p-10 text-center animate-[fadeIn_0.4s_ease-out]">
    <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5 animate-[scaleIn_0.5s_ease-out] shadow-md">
      <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-3 m-0 tracking-tight">Tarjeta enviada correctamente</h2>
    <p className="text-base text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto mb-6 m-0">
      La puntuación fue registrada exitosamente y ya no puede modificarse.
    </p>
    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 border border-wbo-200/60 dark:border-wbo-800/30 text-sm font-semibold text-wbo-800 dark:text-wbo-300 shadow-sm">
      <svg className="w-4 h-4 text-wbo-600 dark:text-wbo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Enviada el {submittedAt}
    </div>
  </div>
);

const accentMap = {
  red: { border: 'border-t-red-500', iconBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-700 dark:text-red-400', valueColor: 'text-red-700 dark:text-red-400', hoverRing: 'hover:ring-red-200/50' },
  blue: { border: 'border-t-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-700 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-400', hoverRing: 'hover:ring-blue-200/50' },
  amber: { border: 'border-t-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-700 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-400', hoverRing: 'hover:ring-amber-200/50' },
  emerald: { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-700 dark:text-emerald-400', valueColor: 'text-emerald-700 dark:text-emerald-400', hoverRing: 'hover:ring-emerald-200/50' },
};

const ResultCard = ({ label, value, icon, accent = 'red' }) => {
  const a = accentMap[accent];
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] border-t-[3px] ${a.border} shadow-sm p-5 sm:p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
      <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center mx-auto mb-3 transition-transform duration-200 group-hover:scale-110`}>
        <svg className={`w-5 h-5 ${a.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <p className={`text-3xl sm:text-4xl font-extrabold ${a.valueColor} mb-0.5 m-0`}>{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-[#64748B] uppercase tracking-wider m-0">{label}</p>
    </div>
  );
};

const FightSummaryCard = ({ fight, scoreCard, roleLabel }) => {
  const infoItems = [
    { icon: CalendarIcon, label: 'Fecha', value: formatDate(fight.scheduled_date) },
    { icon: MapPinIcon, label: 'Lugar', value: fight.venue || '\u2014' },
    { icon: UserGroupIcon, label: 'Rol', value: roleLabel },
    { icon: CheckBadgeIcon, label: 'Estado', value: 'Finalizada' },
  ];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-[#111827] dark:to-[#141d2f] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-md p-6 sm:p-8 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-[#1E293B]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] m-0">Resumen del Combate</h3>
          <p className="text-xs text-slate-400 dark:text-[#64748B] m-0">Detalles de la pelea</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {infoItems.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-100 dark:border-[#1E293B] transition-all duration-200 hover:shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wbo-50 to-wbo-100/60 dark:from-wbo-900/20 dark:to-wbo-800/10 flex items-center justify-center shrink-0">
              <item.icon className="w-4.5 h-4.5 text-wbo-700 dark:text-wbo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-0.5 m-0">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate m-0">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionButtons = ({ navigate }) => (
  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[fadeIn_0.6s_ease-out]">
    <button
      onClick={() => navigate('/dashboard')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      Volver al Dashboard
    </button>
    <button
      onClick={() => navigate('/judges/confirmation')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1F2937] border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:border-red-200 dark:hover:border-red-800/40 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Mis Designaciones
    </button>
  </div>
);

const ScoreFight = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [scoreCard, setScoreCard] = useState(null);
  const [roundData, setRoundData] = useState({});
  const [roundErrors, setRoundErrors] = useState({});
  const [savingRound, setSavingRound] = useState(null);
  const [justSavedRound, setJustSavedRound] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restriction, setRestriction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [expired, setExpired] = useState(false);

  const totalRounds = fight?.total_rounds || 0;
  const isFinalized = scoreCard?.status === 'finalized';

  const completedRounds = Object.keys(roundData).filter(
    (r) => roundData[r]?.score_red >= 1 && roundData[r]?.score_blue >= 1
  ).length;
  const allComplete = completedRounds >= totalRounds && totalRounds > 0;
  const progressPct = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0;

  const timersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setRestriction(null);

        const fightRes = await getFightById(fightId, token);
        if (cancelled) return;
        const f = fightRes.data;
        setFight(f);

        if (user.role !== 'judge') {
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        let myRes;
        try {
          myRes = await getMyScorecard(fightId, token);
        } catch (err) {
          if (cancelled) return;
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        if (cancelled) return;

        if (myRes.data.score_card && myRes.data.score_card.status === 'finalized') {
          setScoreCard(myRes.data.score_card);
          const rd = {};
          myRes.data.round_scores.forEach((rs) => {
            rd[rs.round_number] = {
              score_red: rs.score_red,
              score_blue: rs.score_blue,
              referee_score: rs.referee_score,
              referee_notes: rs.referee_notes || '',
            };
          });
          setRoundData(rd);
          setLoading(false);
          return;
        }

        if (f.scheduled_date && new Date(f.scheduled_date) < new Date()) {
          setExpired(true);
          setLoading(false);
          return;
        }

        if (f.status !== 'active') {
          setRestriction('Esta pelea no está disponible para puntuar.');
          setLoading(false);
          return;
        }

        if (!myRes.data.score_card) {
          const createRes = await createScorecard(fightId, token);
          if (cancelled) return;
          setScoreCard(createRes.data.score_card);
          setRoundData({});
        } else {
          setScoreCard(myRes.data.score_card);
          const rd = {};
          myRes.data.round_scores.forEach((rs) => {
            rd[rs.round_number] = {
              score_red: rs.score_red,
              score_blue: rs.score_blue,
              referee_score: rs.referee_score,
              referee_notes: rs.referee_notes || '',
            };
          });
          setRoundData(rd);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 409) {
          setExpired(true);
          setLoading(false);
          return;
        }
        const msg = err.response?.data?.message || 'Error al cargar la tarjeta';
        setRestriction(msg);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [fightId, token, user]);

  const updateRound = useCallback((roundNum, field, value) => {
    if (isFinalized) return;
    setRoundData((prev) => {
      const current = prev[roundNum] || { score_red: null, score_blue: null, referee_score: null, referee_notes: '' };
      return { ...prev, [roundNum]: { ...current, [field]: value } };
    });
    setRoundErrors((prev) => {
      const next = { ...prev };
      delete next[roundNum];
      return next;
    });
  }, [isFinalized]);

  const handleBlur = useCallback(async (roundNum) => {
    if (isFinalized) return;
    const data = roundData[roundNum];
    if (!data || data.score_red == null || data.score_blue == null) return;

    const sRed = Number(data.score_red);
    const sBlue = Number(data.score_blue);

    if (sRed < 1 || sRed > 10) {
      setRoundErrors((prev) => ({ ...prev, [roundNum]: 'score_red debe estar entre 1 y 10' }));
      return;
    }
    if (sBlue < 1 || sBlue > 10) {
      setRoundErrors((prev) => ({ ...prev, [roundNum]: 'score_blue debe estar entre 1 y 10' }));
      return;
    }

    setSavingRound(roundNum);
    try {
      await saveRound(scoreCard.id, { round_number: roundNum, ...data }, token);
      setJustSavedRound(roundNum);
      if (timersRef.current[roundNum]) clearTimeout(timersRef.current[roundNum]);
      timersRef.current[roundNum] = setTimeout(() => {
        setJustSavedRound((prev) => (prev === roundNum ? null : prev));
      }, 2000);
    } catch (err) {
      if (err.response?.status === 409) {
        setExpired(true);
        return;
      }
      const msg = err.response?.data?.message || 'Error al guardar';
      if (msg.includes('finalizada')) {
        setError('La tarjeta ya fue enviada y no puede modificarse.');
      } else {
        setRoundErrors((prev) => ({ ...prev, [roundNum]: msg }));
      }
    } finally {
      setSavingRound((prev) => (prev === roundNum ? null : prev));
    }
  }, [roundData, scoreCard, token, isFinalized]);

  const handleFinalize = async () => {
    setFinalizing(true);
    setError(null);
    try {
      const res = await finalizeScorecard(scoreCard.id, token);
      setScoreCard(res.data.scorecard);
      setShowConfirmModal(false);
      navigate(`/scoring/${fightId}`, {
        state: { toast: { type: 'success', message: 'Tu tarjeta fue enviada correctamente y quedó lista para su revisión.' } },
        replace: true,
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setExpired(true);
        return;
      }
      setError(err.response?.data?.message || 'Error al enviar la tarjeta');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-wbo-700 mx-auto" />
          <span className="ml-3 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando tarjeta...</span>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-lg p-10 sm:p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-2 m-0">Período de puntuación vencido</h2>
          <p className="text-slate-500 dark:text-[#94A3B8] mb-6 m-0 max-w-md mx-auto">
            La fecha programada para esta pelea ya pasó y no se recibió tu tarjeta a tiempo.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (restriction) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-6 text-center">
          <p className="text-amber-800 dark:text-amber-300 font-medium m-0">{restriction}</p>
          <button
            className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-lg text-sm font-semibold hover:bg-wbo-800 transition-colors"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!fight || !scoreCard) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-slate-400 dark:text-[#64748B] py-10 text-center m-0">No se pudo cargar la información de la pelea.</p>
      </div>
    );
  }

  const roleLabel = user?.role === 'judge' ? 'Juez' : user?.role || '\u2014';
  const diff = scoreCard?.total_score_red != null && scoreCard?.total_score_blue != null
    ? Math.abs(scoreCard.total_score_red - scoreCard.total_score_blue)
    : '\u2014';

  if (isFinalized) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 space-y-8 md:space-y-10 animate-[fadeIn_0.3s_ease-out]">

        {/* ── Fight Header Card ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 sm:p-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0 leading-tight tracking-tight">
                {fight.event_name}
              </h1>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 m-0">
                {fight.boxer_red} <span className="text-slate-400 dark:text-slate-500 font-normal">vs</span> {fight.boxer_blue}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800/50 shrink-0 self-start sm:self-center">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Finalizada
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Fecha:</span> {formatDate(fight.scheduled_date)}
              </span>
            </div>
            {fight.weight_class && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Categoría:</span> {fight.weight_class}
                </span>
              </div>
            )}
            {fight.venue && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Lugar:</span> {fight.venue}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
          </div>
        )}

        <SuccessHero submittedAt={formatDateTime(scoreCard.submitted_at)} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-[fadeIn_0.5s_ease-out]">
          <ResultCard
            label="Total Rojo"
            value={scoreCard.total_score_red}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            accent="red"
          />
          <ResultCard
            label="Total Azul"
            value={scoreCard.total_score_blue}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            accent="blue"
          />
          <ResultCard
            label="Ganador"
            value={scoreCard.winner || 'Empate'}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            accent="amber"
          />
          <ResultCard
            label="Diferencia"
            value={diff === '\u2014' ? diff : `${diff} pts`}
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            accent="emerald"
          />
        </div>

        <div className="animate-[fadeIn_0.6s_ease-out]">
          <FightSummaryCard fight={fight} scoreCard={scoreCard} roleLabel={roleLabel} />
        </div>

        <ActionButtons navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.4s_ease-out]">
      <DetailPageHeader
        title="Tarjeta de Puntuación"
        subtitle={`${fight.boxer_red} vs ${fight.boxer_blue}`}
        description={fight.event_name}
        backFallback="/scoring/live"
      >
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700 dark:text-[#94A3B8] m-0">
            Rounds completos: {completedRounds} / {totalRounds}
          </p>
          <div className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-wbo-700 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </DetailPageHeader>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 mb-4">
          <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
        </div>
      )}

      <DetailSection title="Puntuación por Round">
        <div className="space-y-1.5">
          <div className="grid grid-cols-[70px_1fr_1fr_90px_1fr_80px] gap-2 items-center px-3 py-2.5 bg-wbo-700 text-white rounded-lg text-xs font-semibold">
            <span>Round</span>
            <span className="text-center">{fight.boxer_red}</span>
            <span className="text-center">{fight.boxer_blue}</span>
            <span className="text-center">Árbitro</span>
            <span className="text-center">Notas</span>
            <span className="text-center"></span>
          </div>
          {Array.from({ length: totalRounds }, (_, i) => {
            const rn = i + 1;
            const data = roundData[rn] || {};
            const saving = savingRound === rn;
            const saved = justSavedRound === rn;
            const err = roundErrors[rn];

            return (
              <div key={rn} className="grid grid-cols-[70px_1fr_1fr_90px_1fr_80px] gap-2 items-center px-3 py-2 bg-slate-50 dark:bg-[#1F2937] even:bg-white dark:even:bg-[#111827] rounded-lg border border-slate-100 dark:border-[#1E293B]">
                <span className="font-bold text-wbo-700 dark:text-wbo-400 text-sm">R{rn}</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.score_red ?? ''}
                  onChange={(e) => updateRound(rn, 'score_red', e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  className={inputBase}
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.score_blue ?? ''}
                  onChange={(e) => updateRound(rn, 'score_blue', e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  className={inputBase}
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.referee_score ?? ''}
                  onChange={(e) => updateRound(rn, 'referee_score', e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  placeholder="-"
                  className={inputBase}
                />
                <input
                  type="text"
                  value={data.referee_notes || ''}
                  onChange={(e) => updateRound(rn, 'referee_notes', e.target.value)}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  placeholder="Notas..."
                  className={inputBase}
                />
                <div className="flex justify-center text-xs">
                  {saving && <span className="text-slate-400 dark:text-slate-500">Guardando...</span>}
                  {saved && <span className="text-green-600 dark:text-green-400 font-medium">Guardado</span>}
                  {err && <span className="text-red-600 dark:text-red-400" title={err}>Error</span>}
                </div>
              </div>
            );
          })}
        </div>
      </DetailSection>

      <div className="mt-6 flex justify-center">
        <PageActionButton
          onClick={() => setShowConfirmModal(true)}
          disabled={!allComplete || finalizing}
          loading={finalizing}
        >
          Enviar tarjeta final
        </PageActionButton>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => { if (!finalizing) setShowConfirmModal(false); }}
        onConfirm={handleFinalize}
        title="Enviar tarjeta final"
        description="Una vez enviada la tarjeta no podrás modificarla. ¿Deseás continuar?"
        confirmLabel={finalizing ? 'Enviando...' : 'Enviar'}
        type="warning"
        loading={finalizing}
      />
    </div>
  );
};

export default ScoreFight;
