import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getOfficialCard, createOfficialCard } from '../../services/fightService';
import DetailPageHeader from '../../components/detail/DetailPageHeader';
import DetailSection from '../../components/detail/DetailSection';
import { PageActionButton } from '../../components/detail/PageActions';
import { ConfirmModal } from '../../components/common/modals';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

const OfficialCards = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [card, setCard] = useState(null);
  const [rounds, setRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';
  const totalRounds = fight?.total_rounds || 0;

  const allComplete = totalRounds > 0 && Array.from({ length: totalRounds }, (_, i) => i + 1).every(
    (rn) => {
      const r = rounds[rn];
      return r && Number(r.score_red) >= 1 && Number(r.score_red) <= 10 && Number(r.score_blue) >= 1 && Number(r.score_blue) <= 10;
    }
  );

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isStaff) {
          setError('La tarjeta oficial solo está disponible para administradores y supervisores.');
          setLoading(false);
          return;
        }

        const fightRes = await getFightById(fightId, token);
        if (cancelled) return;
        const f = fightRes.data;
        setFight(f);

        if (f.status !== 'completed') {
          setError('La pelea debe finalizar antes de cargar la tarjeta oficial.');
          setLoading(false);
          return;
        }

        const cardRes = await getOfficialCard(fightId, token);
        if (cancelled) return;

        if (cardRes.data) {
          setCard(cardRes.data);
          const rd = {};
          cardRes.data.rounds.forEach((r) => {
            rd[r.round_number] = { score_red: r.score_red, score_blue: r.score_blue };
          });
          setRounds(rd);
        } else {
          const rd = {};
          Array.from({ length: f.total_rounds }, (_, i) => {
            rd[i + 1] = { score_red: '', score_blue: '' };
          });
          setRounds(rd);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Error al cargar la tarjeta oficial');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fightId, token, user, isStaff]);

  const handleChange = (rn, field, value) => {
    setRounds((prev) => ({
      ...prev,
      [rn]: { ...prev[rn], [field]: value === '' ? '' : Number(value) },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        rounds: Object.entries(rounds).map(([rn, data]) => ({
          round_number: Number(rn),
          score_red: Number(data.score_red),
          score_blue: Number(data.score_blue),
        })),
      };
      const res = await createOfficialCard(fightId, payload, token);
      setCard(res.data);
      setShowConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la tarjeta oficial');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-wbo-700 mx-auto" />
          <span className="ml-3 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando tarjeta oficial...</span>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">{error}</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!fight) {
    return <p className="text-slate-400 dark:text-[#64748B] py-10 text-center">Pelea no encontrada.</p>;
  }

  if (!isStaff && !card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] px-10 py-12 text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 dark:text-amber-300 font-medium text-base leading-relaxed">Solo el personal autorizado puede crear la tarjeta oficial.</p>
          <button
            className="mt-6 px-8 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors shadow-sm"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 animate-fadeIn">
      <DetailPageHeader
        title={card ? 'Tarjeta Oficial' : 'Cargar Tarjeta Oficial'}
        subtitle={`${fight.boxer_red} vs ${fight.boxer_blue}`}
        description={fight.event_name}
        status={card ? 'completed' : undefined}
        backFallback="/fights"
      />

      {error && card && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 mb-4">
          <p className="text-red-700 dark:text-red-300 text-sm m-0">{error}</p>
        </div>
      )}

      {card ? (
        <DetailSection icon={ClipboardDocumentCheckIcon} title="Resultado de la Tarjeta Oficial">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-1 m-0">Tarjeta oficial cargada correctamente.</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-1 m-0">Total Rojo</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0">{card.total_score_red}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-1 m-0">Total Azul</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0">{card.total_score_blue}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#1F2937] border border-slate-100 dark:border-[#1E293B]">
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-1 m-0">Ganador</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] m-0">{card.winner || 'Empate'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="space-y-1.5">
                <div className="grid grid-cols-[70px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-wbo-700 text-white rounded-lg text-xs font-semibold">
                  <span>Round</span>
                  <span className="text-center">{fight.boxer_red}</span>
                  <span className="text-center">{fight.boxer_blue}</span>
                </div>
                {card.rounds.map((r) => (
                  <div key={r.round_number} className="grid grid-cols-[70px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-slate-50 dark:bg-[#1F2937] even:bg-white dark:even:bg-[#111827] rounded-lg border border-slate-100 dark:border-[#1E293B]">
                    <span className="font-bold text-wbo-700 dark:text-wbo-400 text-sm">R{r.round_number}</span>
                    <span className="text-center font-bold text-slate-800 dark:text-[#F8FAFC]">{r.score_red}</span>
                    <span className="text-center font-bold text-slate-800 dark:text-[#F8FAFC]">{r.score_blue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DetailSection>
      ) : (
        <DetailSection icon={ClipboardDocumentCheckIcon} title="Cargar Puntuaciones" description="Ingresá el puntaje de cada round para ambos boxeadores">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="space-y-1.5">
                <div className="grid grid-cols-[70px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-wbo-700 text-white rounded-lg text-xs font-semibold">
                  <span>Round</span>
                  <span className="text-center">{fight.boxer_red}</span>
                  <span className="text-center">{fight.boxer_blue}</span>
                </div>
                {Array.from({ length: totalRounds }, (_, i) => {
                  const rn = i + 1;
                  const data = rounds[rn] || {};
                  return (
                    <div key={rn} className="grid grid-cols-[70px_1fr_1fr] gap-3 items-center px-4 py-2.5 bg-slate-50 dark:bg-[#1F2937] even:bg-white dark:even:bg-[#111827] rounded-lg border border-slate-100 dark:border-[#1E293B]">
                      <span className="font-bold text-wbo-700 dark:text-wbo-400 text-sm">R{rn}</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={data.score_red ?? ''}
                        onChange={(e) => handleChange(rn, 'score_red', e.target.value)}
                        className="w-full px-3 py-2 text-center rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-[#F8FAFC] text-sm font-bold focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                      />
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={data.score_blue ?? ''}
                        onChange={(e) => handleChange(rn, 'score_blue', e.target.value)}
                        className="w-full px-3 py-2 text-center rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-[#F8FAFC] text-sm font-bold focus:outline-none focus:border-wbo-700 focus:ring-2 focus:ring-wbo-700/20 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <PageActionButton
              onClick={() => setShowConfirm(true)}
              disabled={!allComplete || saving}
              loading={saving}
            >
              Guardar tarjeta oficial
            </PageActionButton>
          </div>
        </DetailSection>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => { if (!saving) setShowConfirm(false); }}
        onConfirm={handleSave}
        title="Guardar tarjeta oficial"
        description="Una vez guardada no podrá modificarse. ¿Deseás continuar?"
        confirmLabel={saving ? 'Guardando...' : 'Guardar'}
        type="warning"
        loading={saving}
      />
    </div>
  );
};

export default OfficialCards;
