import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getScorecards, completeFight } from '../../services/fightService';
import BackButton from '../../components/common/BackButton';

const statusBadge = (status) => {
  if (!status) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Sin tarjeta
    </span>
  );
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Draft
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      Finalizada
    </span>
  );
};

const LiveScore = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';

  const fetchData = useCallback(async () => {
    try {
      if (!isStaff) {
        setError('El seguimiento en vivo solo está disponible para administradores y supervisores.');
        setLoading(false);
        return;
      }
      const [fightRes, scRes] = await Promise.all([
        getFightById(fightId, token),
        getScorecards(fightId, token),
      ]);
      const f = fightRes.data;
      if (f.status !== 'active') {
        setFight(f);
        setError('El seguimiento en vivo solo está disponible para peleas activas.');
        setLoading(false);
        return;
      }
      setFight(f);
      setEntries(scRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fightId, token, isStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh cada 30 segundos si hay drafts
  useEffect(() => {
    if (!entries.length) return;
    const hasDraft = entries.some((e) => e.scorecard_status === 'draft' || !e.scorecard_status);
    if (!hasDraft) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [entries, fetchData]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeFight(fightId, token);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al finalizar la pelea');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 py-10 dark:text-[#94A3B8]">Cargando...</p>;
  }

  if (error && !fight) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 dark:bg-red-900/30 dark:border-red-800/50">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  const allFinalized = entries.length > 0 && entries.every((e) => e.scorecard_status === 'finalized');

  return (
    <div className="animate-fadeIn">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 m-0 dark:text-[#F8FAFC]">Puntuación en Vivo</h2>
          <p className="text-sm text-slate-400 dark:text-[#94A3B8]">
            {fight?.event_name} — {fight?.boxer_red} vs {fight?.boxer_blue}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Estado: <span className="font-semibold">{fight?.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:border-wbo-700 hover:text-wbo-700 hover:bg-wbo-50 transition-all duration-200 shadow-sm"
            onClick={fetchData}
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden dark:bg-[#111827] dark:border dark:border-[#1E293B]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-wbo-700 text-white text-xs uppercase tracking-wider rounded-xl">
              <th className="text-left px-5 py-3.5 font-semibold">Juez</th>
              <th className="text-left px-5 py-3.5 font-semibold">Nivel</th>
              <th className="text-left px-5 py-3.5 font-semibold">Tipo</th>
              <th className="text-center px-5 py-3.5 font-semibold">Rounds</th>
              <th className="text-center px-5 py-3.5 font-semibold">Estado</th>
              <th className="text-right px-5 py-3.5 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
            {entries.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-400 dark:text-[#94A3B8]">
                  No hay jueces confirmados para esta pelea.
                </td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr key={e.judge_id} className={`hover:bg-slate-50 transition-colors dark:hover:bg-[#1A2435] ${i % 2 === 0 ? 'even:bg-slate-50 dark:even:bg-[#0B1120]' : ''}`}>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-[#F8FAFC]">{e.judge_name}</td>
                <td className="px-4 py-3 text-slate-500 capitalize dark:text-[#94A3B8]">{e.level}</td>
                <td className="px-4 py-3 text-slate-500 capitalize dark:text-[#94A3B8]">{e.assignment_type}</td>
                <td className="px-4 py-3 text-center text-slate-700 dark:text-[#94A3B8]">
                  {e.completed_rounds} / {e.total_rounds}
                </td>
                <td className="px-4 py-3 text-center">{statusBadge(e.scorecard_status)}</td>
                <td className="px-4 py-3 text-right">
                  <ResultCell entry={e} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fight?.status === 'active' && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {allFinalized ? (
            <button
              className="inline-flex items-center justify-center px-6 py-3 bg-wbo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={completing}
              onClick={handleComplete}
            >
              {completing ? 'Finalizando...' : 'Finalizar pelea'}
            </button>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Esperando que todos los jueces finalicen sus tarjetas.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ResultCell = ({ entry }) => {
  if (!entry.scorecard_status) return <span className="text-slate-400 text-xs dark:text-slate-500">Sin comenzar</span>;
  if (entry.scorecard_status === 'draft') return <span className="text-amber-600 text-xs font-semibold dark:text-amber-400">En progreso</span>;

  const winner = entry.winner || 'Empate';
  return (
    <div className="leading-tight">
      <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">
        {entry.total_score_red} – {entry.total_score_blue}
      </span>
      <span className="block text-xs text-slate-500 mt-0.5 dark:text-[#94A3B8]">Ganador: {winner}</span>
    </div>
  );
};

export default LiveScore;
