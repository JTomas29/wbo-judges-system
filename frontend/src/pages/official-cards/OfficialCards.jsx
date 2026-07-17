import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getOfficialCard, createOfficialCard } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';

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
  const isAdmin = user?.role === 'admin';
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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
        <span className="ml-3 text-gray-500 text-sm">Cargando tarjeta oficial...</span>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-cream rounded-2xl shadow-md px-10 py-12 text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 font-medium text-base leading-relaxed">{error}</p>
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
    return <p className="text-gray-400 py-10">Pelea no encontrada.</p>;
  }

  if (!isAdmin && !card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-cream rounded-2xl shadow-md px-10 py-12 text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-900 font-medium text-base leading-relaxed">Solo los administradores pueden crear la tarjeta oficial.</p>
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
    <div className="max-w-[900px]">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">
            {card ? 'Tarjeta Oficial' : 'Cargar Tarjeta Oficial'}
          </h2>
          <p className="text-sm text-gray-400">
            {fight.boxer_red} vs {fight.boxer_blue}
          </p>
          <p className="text-xs text-gray-400">{fight.event_name}</p>
        </div>
        {card && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Finalizada
          </span>
        )}
      </div>

      {error && card && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {card ? (
        <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Tarjeta oficial cargada correctamente.</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Rojo</p>
              <p className="text-2xl font-extrabold text-gray-900">{card.total_score_red}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Azul</p>
              <p className="text-2xl font-extrabold text-gray-900">{card.total_score_blue}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ganador</p>
              <p className="text-sm font-extrabold text-gray-900">{card.winner || 'Empate'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2.5 bg-[#6b1421] text-white rounded-lg text-xs font-semibold">
              <span>Round</span>
              <span className="text-center">{fight.boxer_red}</span>
              <span className="text-center">{fight.boxer_blue}</span>
            </div>
            {card.rounds.map((r) => (
              <div key={r.round_number} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2 bg-gray-50 even:bg-white rounded-lg">
                <span className="font-bold text-[#6b1421] text-sm">R{r.round_number}</span>
                <span className="text-center font-bold text-gray-800">{r.score_red}</span>
                <span className="text-center font-bold text-gray-800">{r.score_blue}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm card-minimal p-5">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2.5 bg-[#6b1421] text-white rounded-lg text-xs font-semibold">
                <span>Round</span>
                <span className="text-center">{fight.boxer_red}</span>
                <span className="text-center">{fight.boxer_blue}</span>
              </div>
              {Array.from({ length: totalRounds }, (_, i) => {
                const rn = i + 1;
                const data = rounds[rn] || {};
                return (
                  <div key={rn} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center px-3 py-2 bg-gray-50 even:bg-white rounded-lg">
                    <span className="font-bold text-[#6b1421] text-sm">R{rn}</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={data.score_red ?? ''}
                      onChange={(e) => handleChange(rn, 'score_red', e.target.value)}
                      className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={data.score_blue ?? ''}
                      onChange={(e) => handleChange(rn, 'score_blue', e.target.value)}
                      className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              disabled={!allComplete || saving}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#6b1421] text-white rounded-lg text-sm font-bold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setShowConfirm(true)}
            >
              {saving ? 'Guardando...' : 'Guardar tarjeta oficial'}
            </button>
          </div>
        </>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!saving) setShowConfirm(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Guardar tarjeta oficial</h3>
            <p className="text-sm text-gray-600 mb-6">
              Una vez guardada no podrá modificarse. ¿Deseás continuar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                disabled={saving}
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                disabled={saving}
                onClick={handleSave}
              >
                {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialCards;
