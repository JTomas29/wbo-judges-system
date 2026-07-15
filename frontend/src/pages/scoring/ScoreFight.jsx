import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById } from '../../services/fightService';
import { getMyScorecard, createScorecard, saveRound, finalizeScorecard } from '../../services/scoringService';

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

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

        if (user.role !== 'judge' || f.status !== 'active') {
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
      <div className="max-w-[700px]">
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
      <div className="max-w-[700px]">
        <p className="text-gray-400 py-10">No se pudo cargar la información de la pelea.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px]">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Tarjeta de Puntuación</h2>
          <p className="text-sm text-gray-400">
            {fight.boxer_red} vs {fight.boxer_blue}
          </p>
          <p className="text-xs text-gray-400">{fight.event_name}</p>
        </div>
        <div className="text-right">
          {!isFinalized && (
            <>
              <p className="text-sm font-semibold text-gray-700">
                Rounds completos: {completedRounds} / {totalRounds}
              </p>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#6b1421] rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          )}
          {isFinalized && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Finalizada
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {isFinalized ? (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Tarjeta enviada correctamente.</h3>
            <p className="text-sm text-gray-400">Enviada el {formatDateTime(scoreCard.submitted_at)}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Rojo</p>
              <p className="text-2xl font-extrabold text-gray-900">{scoreCard.total_score_red}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Azul</p>
              <p className="text-2xl font-extrabold text-gray-900">{scoreCard.total_score_blue}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ganador</p>
              <p className="text-sm font-extrabold text-gray-900">{scoreCard.winner || 'Empate'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-5">
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
      )}

      {!isFinalized && (
        <div className="mt-4 flex justify-center">
          <button
            disabled={!allComplete || finalizing}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#6b1421] text-white rounded-lg text-sm font-bold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setShowConfirmModal(true)}
          >
            {finalizing ? 'Enviando...' : 'Enviar tarjeta final'}
          </button>
        </div>
      )}

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
