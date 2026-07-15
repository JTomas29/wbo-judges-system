import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById, getScorecards, completeFight } from '../../services/fightService';

const statusBadge = (status) => {
  if (!status) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Sin tarjeta</span>;
  if (status === 'draft') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Draft</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Finalizada</span>;
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
    return <p className="text-gray-400 py-10">Cargando...</p>;
  }

  if (error && !fight) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700">{error}</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  const allFinalized = entries.length > 0 && entries.every((e) => e.scorecard_status === 'finalized');

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Puntuación en Vivo</h2>
          <p className="text-sm text-gray-400">
            {fight?.event_name} — {fight?.boxer_red} vs {fight?.boxer_blue}
          </p>
          <p className="text-xs text-gray-400">
            Estado: <span className="font-semibold">{fight?.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors"
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#6b1421] text-white text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">Juez</th>
              <th className="text-left px-4 py-3 font-semibold">Nivel</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-center px-4 py-3 font-semibold">Rounds</th>
              <th className="text-center px-4 py-3 font-semibold">Estado</th>
              <th className="text-right px-4 py-3 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                  No hay jueces confirmados para esta pelea.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.judge_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{e.judge_name}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{e.level}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{e.assignment_type}</td>
                <td className="px-4 py-3 text-center text-gray-700">
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
              className="inline-flex items-center justify-center px-6 py-3 bg-[#6b1421] text-white rounded-lg text-sm font-bold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={completing}
              onClick={handleComplete}
            >
              {completing ? 'Finalizando...' : 'Finalizar pelea'}
            </button>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              Esperando que todos los jueces finalicen sus tarjetas.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ResultCell = ({ entry }) => {
  if (!entry.scorecard_status) return <span className="text-gray-400 text-xs">Sin comenzar</span>;
  if (entry.scorecard_status === 'draft') return <span className="text-yellow-600 text-xs font-semibold">En progreso</span>;

  const winner = entry.winner || 'Empate';
  return (
    <div>
      <span className="font-bold text-gray-900">
        {entry.total_score_red} – {entry.total_score_blue}
      </span>
      <span className="block text-xs text-gray-400">Ganador: {winner}</span>
    </div>
  );
};

export default LiveScore;
