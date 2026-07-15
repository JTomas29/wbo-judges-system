import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFightById } from '../../services/fightService';

const FightAnalysis = () => {
  const { fightId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fight, setFight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        if (!isStaff) {
          setError('El análisis solo está disponible para administradores y supervisores.');
          setLoading(false);
          return;
        }
        const res = await getFightById(fightId, token);
        if (cancelled) return;
        const f = res.data;
        if (f.status !== 'analyzed') {
          setFight(f);
          setError('El análisis todavía no fue generado.');
          setLoading(false);
          return;
        }
        setFight(f);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Error al cargar la pelea');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fightId, token, user, isStaff]);

  if (loading) {
    return <p className="text-gray-400 py-10">Cargando...</p>;
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800 font-medium">{error}</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!fight) {
    return <p className="text-gray-400 py-10">Pelea no encontrada.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Análisis de Pelea</h2>
      <p className="text-sm text-gray-400 mb-6">
        {fight.boxer_red} vs {fight.boxer_blue}
      </p>
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-400">Sección en construcción — próximamente.</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    </div>
  );
};

export default FightAnalysis;
