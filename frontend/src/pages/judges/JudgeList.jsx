import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJudges } from '../../services/judgeService';
import { updateJudge } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { ConfirmModal } from '../../components/common/modals';

const levelBadge = (level) => {
  const map = {
    elite: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
    senior: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
    junior: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
  };
  return map[level] || 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600';
};

const statusBadge = (active) => {
  return active
    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50'
    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600';
};

const levelIcon = (level) => {
  if (level === 'elite') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    );
  }
  if (level === 'senior') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
};

const statusIcon = (active) => {
  if (active) {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
};

const LEVEL_OPTIONS = [
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'elite', label: 'Elite' },
];

const JudgeList = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterActive, setFilterActive] = useState('');

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

  const filteredJudges = useMemo(() => {
    return judges.filter((juez) => {
      if (searchName && !juez.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (searchEmail && !juez.email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
      if (filterLevel && juez.level !== filterLevel) return false;
      if (filterActive === 'active' && !juez.is_active) return false;
      if (filterActive === 'inactive' && juez.is_active) return false;
      return true;
    });
  }, [judges, searchName, searchEmail, filterLevel, filterActive]);

  const clearFilters = () => {
    setSearchName('');
    setSearchEmail('');
    setFilterLevel('');
    setFilterActive('');
  };

  const hasActiveFilters = searchName || searchEmail || filterLevel || filterActive;

  const isStaff = user?.role === 'admin' || user?.role === 'supervisor';

  if (!isStaff) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl shadow-sm p-6 text-center">
        <p className="text-slate-700 dark:text-[#F8FAFC] font-medium">No tienes permiso para acceder a la gestión de jueces.</p>
        <button
          className="mt-4 px-5 py-2.5 bg-wbo-700 text-white rounded-xl text-sm font-semibold hover:bg-wbo-800 transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-[#374151] border-t-wbo-700" />
        <span className="ml-3 text-slate-500 dark:text-[#94A3B8] text-sm">Cargando jueces...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm flex items-center justify-center py-20">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-4">
        <BackButton fallbackRoute="/dashboard" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-4">Gestión de Jueces</h2>

      {/* Filters */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchName} onChange={setSearchName} placeholder="Buscar por nombre..." />
        <FilterInput value={searchEmail} onChange={setSearchEmail} placeholder="Buscar por email..." />
        <FilterSelect value={filterLevel} onChange={setFilterLevel} options={LEVEL_OPTIONS} placeholder="Nivel" />
        <FilterSelect
          value={filterActive}
          onChange={setFilterActive}
          options={[
            { value: 'active', label: 'Activo' },
            { value: 'inactive', label: 'Inactivo' },
          ]}
          placeholder="Estado"
        />
      </FilterBar>

      {filteredJudges.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm p-10 text-center text-slate-400 dark:text-[#94A3B8] text-sm">
          {hasActiveFilters ? 'No se encontraron jueces con los filtros aplicados' : 'No hay jueces registrados'}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-wbo-700 dark:bg-red-900/50 text-white rounded-lg">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Nivel</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Estado</th>
                  {isStaff && <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredJudges.map((juez) => (
                <tr key={juez.id} className="border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1A2435] transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-[#F8FAFC]">{juez.name}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-[#94A3B8]">{juez.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${levelBadge(juez.level)}`}>
                      {levelIcon(juez.level)}
                      {juez.level || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(juez.is_active)}`}>
                      {statusIcon(juez.is_active)}
                      {juez.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isStaff && (
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#F8FAFC] rounded-xl text-xs font-semibold hover:border-red-300 dark:hover:border-red-800/50 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 shadow-sm"
                          onClick={() => navigate(`/profile/${juez.id}`)}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Ver Perfil
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#F8FAFC] rounded-xl text-xs font-semibold hover:border-wbo-700 dark:hover:border-red-800/50 hover:text-wbo-700 dark:hover:text-red-400 hover:bg-wbo-50 dark:hover:bg-red-900/30 transition-all duration-200 shadow-sm"
                              onClick={() => navigate(`/judges/${juez.id}/edit`)}>Editar</button>
                            <button
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                                juez.is_active
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              onClick={() => setConfirmTarget(juez)}
                            >
                              {juez.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => handleToggleActive(confirmTarget)}
        title={confirmTarget?.is_active ? 'Desactivar juez' : 'Activar juez'}
        description={<>¿Estás seguro de que quieres {confirmTarget?.is_active ? 'desactivar' : 'activar'} a <strong className="text-slate-800 dark:text-[#F8FAFC]">{confirmTarget?.name}</strong>?</>}
        confirmLabel={confirmTarget?.is_active ? 'Sí, desactivar' : 'Sí, activar'}
        cancelLabel="No"
        type="warning"
      />
    </div>
  );
};

export default JudgeList;
