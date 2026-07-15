import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJudges } from '../../services/judgeService';
import { updateJudge } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';

const levelBadge = (level) => {
  const map = {
    elite: 'bg-green-100 text-green-800',
    senior: 'bg-blue-100 text-blue-800',
    junior: 'bg-yellow-100 text-yellow-800',
  };
  return map[level] || 'bg-gray-100 text-gray-500';
};

const statusBadge = (active) => {
  return active
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-500';
};

const JudgeList = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getJudges(token)
      .then((res) => {
        setJudges(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al cargar jueces');
        setLoading(false);
      });
  }, [token]);

  const handleToggleActive = async (juez) => {
    try {
      await updateJudge(juez.id, {
        name: juez.name,
        email: juez.email,
        level: juez.level || 'junior',
        is_active: !juez.is_active,
      }, token);
      setJudges((prev) =>
        prev.map((j) => (j.id === juez.id ? { ...j, is_active: !j.is_active } : j))
      );
      setConfirmTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado del juez');
      setConfirmTarget(null);
    }
  };

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';

  if (!isStaff) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800 font-medium">No tienes permiso para acceder a la gestión de jueces.</p>
        <button
          className="mt-4 px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
        <span className="ml-3 text-gray-500 text-sm">Cargando jueces...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 m-0">Gestión de Jueces</h2>
          <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">
            + Crear Juez
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
          No hay jueces registrados
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 m-0">Gestión de Jueces</h2>
        <button className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">
          + Crear Juez
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {judges.map((juez) => (
              <tr key={juez.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">{juez.name}</td>
                <td className="py-3 px-4 text-gray-600">{juez.email}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${levelBadge(juez.level)}`}>
                    {juez.level || '—'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(juez.is_active)}`}>
                    {juez.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {user?.role === 'admin' && (
                      <button className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors"
                        onClick={() => navigate(`/judges/${juez.id}/edit`)}>Editar</button>
                    )}
                    {isStaff && (
                      <button
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          juez.is_active
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        onClick={() => setConfirmTarget(juez)}
                      >
                        {juez.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {confirmTarget.is_active ? 'Desactivar juez' : 'Activar juez'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que quieres {confirmTarget.is_active ? 'desactivar' : 'activar'} a <strong>{confirmTarget.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => setConfirmTarget(null)}
              >
                No
              </button>
              <button
                className="px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors"
                onClick={() => handleToggleActive(confirmTarget)}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgeList;
