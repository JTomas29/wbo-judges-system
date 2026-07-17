import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById } from '../../services/fightService';
import { getMyScorecard, createScorecard, saveRound, finalizeScorecard } from '../../services/scoringService';
import BackButton from '../../components/common/BackButton';

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

// ─── Sub-components ───

const SuccessHero = ({ submittedAt }) => (
  <div className="bg-white rounded-2xl shadow-md border-t-4 border-[#6b1421] border-x border-b border-slate-200 p-8 sm:p-10 text-center animate-[fadeIn_0.4s_ease-out]">
    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5 animate-[scaleIn_0.5s_ease-out]">
      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Tarjeta enviada correctamente</h2>
    <p className="text-slate-500 max-w-md mx-auto mb-4">
      La puntuación fue registrada exitosamente y ya no puede modificarse.
    </p>
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Enviada el {submittedAt}
    </div>
  </div>
);

const ResultCard = ({ label, value, icon, color = '#6b1421' }) => (
  <div className="bg-white rounded-2xl border-t-4 border-[#6b1421] border-x border-b border-slate-200 shadow-sm p-5 sm:p-6 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
      <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-0.5">{value}</p>
    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
  </div>
);

const FightSummaryCard = ({ fight, scoreCard, roleLabel }) => {
  const infoItems = [
    { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', label: 'Evento', value: fight.event_name },
    { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Boxeador Rojo', value: fight.boxer_red, color: 'text-red-600' },
    { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Boxeador Azul', value: fight.boxer_blue, color: 'text-blue-600' },
    { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Fecha', value: formatDate(fight.scheduled_date) },
    { icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9', label: 'Lugar', value: fight.venue || '\u2014' },
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Rol', value: roleLabel },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border-t-4 border-[#6b1421] border-x border-b border-slate-200 p-6 sm:p-8 transition-all duration-200 hover:shadow-lg">
      <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Resumen del Combate
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {infoItems.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <p className={`text-sm font-bold text-slate-900 truncate ${item.color || ''}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionButtons = ({ fightId, navigate }) => (
  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-[fadeIn_0.6s_ease-out]">
    <button
      onClick={() => navigate('/dashboard')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-[#6b1421] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#4a0f14] hover:shadow-md transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      Volver al Dashboard
    </button>
    <button
      onClick={() => navigate('/judges/confirmation')}
      className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:border-red-200 hover:text-red-700 hover:bg-red-50 transition-all duration-200 active:scale-[0.98]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Mis Designaciones
    </button>
  </div>
);

// ─── Main Component ───

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
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar la tarjeta');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando tarjeta...</p>
      </div>
    );
  }

  if (restriction) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-medium">{restriction}</p>
          <button
            className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
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
        <p className="text-gray-400 py-10">No se pudo cargar la información de la pelea.</p>
      </div>
    );
  }

  const roleLabel = user?.role === 'judge' ? 'Juez' : user?.role || '\u2014';
  const diff = scoreCard?.total_score_red != null && scoreCard?.total_score_blue != null
    ? Math.abs(scoreCard.total_score_red - scoreCard.total_score_blue)
    : '\u2014';

  // ─── Finalized View (Redesigned Success Page) ───
  if (isFinalized) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        {/* Back button */}
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <BackButton />
        </div>

        {/* Header */}
        <div className="animate-[fadeIn_0.4s_ease-out]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Tarjeta de Puntuación</h1>
              <p className="text-lg text-slate-500 mt-1 font-semibold">{fight.boxer_red} vs {fight.boxer_blue}</p>
              <p className="text-sm text-slate-400">{fight.event_name} · {formatDate(fight.scheduled_date)}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Finalizada
            </span>
          </div>
          <hr className="mt-5 border-slate-200" />
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Hero */}
        <SuccessHero submittedAt={formatDateTime(scoreCard.submitted_at)} />

        {/* Results Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeIn_0.5s_ease-out]">
          <ResultCard
            label="Total Rojo"
            value={scoreCard.total_score_red}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
          <ResultCard
            label="Total Azul"
            value={scoreCard.total_score_blue}
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
          <ResultCard
            label="Ganador"
            value={scoreCard.winner || 'Empate'}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <ResultCard
            label="Diferencia"
            value={diff === '\u2014' ? diff : `${diff} pts`}
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </div>

        {/* Fight Summary */}
        <div className="animate-[fadeIn_0.6s_ease-out]">
          <FightSummaryCard fight={fight} scoreCard={scoreCard} roleLabel={roleLabel} />
        </div>

        {/* Actions */}
        <ActionButtons fightId={fightId} navigate={navigate} />
      </div>
    );
  }

  // ─── Draft View (Unchanged) ───
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Tarjeta de Puntuación</h2>
          <p className="text-sm text-gray-400">
            {fight.boxer_red} vs {fight.boxer_blue}
          </p>
          <p className="text-xs text-gray-400">{fight.event_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">
            Rounds completos: {completedRounds} / {totalRounds}
          </p>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[#6b1421] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
        <div className="space-y-1.5">
          <div className="grid grid-cols-[70px_1fr_1fr_90px_1fr_80px] gap-2 items-center px-3 py-2.5 bg-[#6b1421] text-white rounded-lg text-xs font-semibold">
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
              <div key={rn} className="grid grid-cols-[70px_1fr_1fr_90px_1fr_80px] gap-2 items-center px-3 py-2 bg-gray-50 even:bg-white rounded-lg">
                <span className="font-bold text-[#6b1421] text-sm">R{rn}</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.score_red ?? ''}
                  onChange={(e) => updateRound(rn, 'score_red', e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={data.score_blue ?? ''}
                  onChange={(e) => updateRound(rn, 'score_blue', e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                  className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  value={data.referee_notes || ''}
                  onChange={(e) => updateRound(rn, 'referee_notes', e.target.value)}
                  onBlur={() => handleBlur(rn)}
                  disabled={isFinalized}
                  placeholder="Notas..."
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <div className="flex justify-center text-xs">
                  {saving && <span className="text-gray-400">Guardando...</span>}
                  {saved && <span className="text-green-600 font-medium">Guardado</span>}
                  {err && <span className="text-red-600" title={err}>Error</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          disabled={!allComplete || finalizing}
          className="inline-flex items-center justify-center px-6 py-3 bg-[#6b1421] text-white rounded-lg text-sm font-bold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => setShowConfirmModal(true)}
        >
          {finalizing ? 'Enviando...' : 'Enviar tarjeta final'}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!finalizing) setShowConfirmModal(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Enviar tarjeta final</h3>
            <p className="text-sm text-gray-600 mb-6">
              Una vez enviada la tarjeta no podrás modificarla. ¿Deseás continuar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                disabled={finalizing}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                disabled={finalizing}
                onClick={handleFinalize}
              >
                {finalizing && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {finalizing ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreFight;