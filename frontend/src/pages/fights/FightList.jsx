import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFights } from '../../services/fightService';
import { useAuth } from '../../context/AuthContext';
import FilterBar, { FilterInput, FilterSelect, FilterDate } from '../../components/common/FilterBar';

const canEdit = (status) => status === 'pending' || status === 'active';

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    active: 'bg-green-50 text-green-700 border border-green-200',
    completed: 'bg-blue-50 text-blue-700 border border-blue-200',
    analyzed: 'bg-green-50 text-green-700 border border-green-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border border-gray-200';
};

const statusLabel = (status) => {
  const map = {
    pending: 'Pendiente',
    active: 'Activa',
    completed: 'Finalizada',
    analyzed: 'Analizada',
    cancelled: 'Cancelada',
  };
  return map[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'active', label: 'Activa' },
  { value: 'completed', label: 'Finalizada' },
  { value: 'analyzed', label: 'Analizada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const FightList = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchEvent, setSearchEvent] = useState('');
  const [searchBoxer, setSearchBoxer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getFights(token)
      .then((res) => { setFights(res.data); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.message || 'Error al cargar peleas'); setLoading(false); });
  }, [token]);

  const categories = useMemo(() => {
    const cats = [...new Set(fights.map((f) => f.weight_class).filter(Boolean))];
    return cats.map((c) => ({ value: c, label: c }));
  }, [fights]);

  const filteredFights = useMemo(() => {
    return fights.filter((fight) => {
      if (searchEvent && !fight.event_name.toLowerCase().includes(searchEvent.toLowerCase())) return false;
      if (searchBoxer) {
        const q = searchBoxer.toLowerCase();
        const matchesRed = fight.boxer_red?.toLowerCase().includes(q);
        const matchesBlue = fight.boxer_blue?.toLowerCase().includes(q);
        if (!matchesRed && !matchesBlue) return false;
      }
      if (filterStatus && fight.status !== filterStatus) return false;
      if (filterCategory && fight.weight_class !== filterCategory) return false;
      if (dateFrom && fight.scheduled_date) {
        const fightDate = new Date(fight.scheduled_date).toISOString().split('T')[0];
        if (fightDate < dateFrom) return false;
      }
      if (dateTo && fight.scheduled_date) {
        const fightDate = new Date(fight.scheduled_date).toISOString().split('T')[0];
        if (fightDate > dateTo) return false;
      }
      return true;
    });
  }, [fights, searchEvent, searchBoxer, filterStatus, filterCategory, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchEvent('');
    setSearchBoxer('');
    setFilterStatus('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchEvent || searchBoxer || filterStatus || filterCategory || dateFrom || dateTo;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando peleas...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 m-0">Listado de Peleas</h2>
        <button className="inline-flex items-center justify-center px-4 py-2 bg-wbo-700 text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-all" onClick={() => navigate('/fights/create')}>
          + Crear Pelea
        </button>
      </div>

      {/* Filters */}
      <FilterBar onClear={hasActiveFilters ? clearFilters : null}>
        <FilterInput value={searchEvent} onChange={setSearchEvent} placeholder="Buscar por evento..." />
        <FilterInput value={searchBoxer} onChange={setSearchBoxer} placeholder="Buscar por boxeador..." />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="Estado" />
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={categories} placeholder="Categoría" />
        <FilterDate value={dateFrom} onChange={setDateFrom} placeholder="Fecha desde" />
        <FilterDate value={dateTo} onChange={setDateTo} placeholder="Fecha hasta" />
      </FilterBar>

      {filteredFights.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
          {hasActiveFilters ? 'No se encontraron peleas con los filtros aplicados' : 'No hay peleas registradas'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm card-minimal overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evento</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rojo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Azul</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lugar</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Árbitro</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jueces</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFights.map((fight, i) => (
                <tr key={fight.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-100/50 transition-colors`}>
                  <td className="py-4 px-4 font-semibold text-gray-950">{fight.event_name}</td>
                  <td className="py-4 px-4 text-gray-600 text-sm">{fight.boxer_red}</td>
                  <td className="py-4 px-4 text-gray-600 text-sm">{fight.boxer_blue}</td>
                  <td className="py-4 px-4 text-gray-500 whitespace-nowrap">{formatDate(fight.scheduled_date)}</td>
                  <td className="py-4 px-4 text-gray-600">{fight.weight_class || '\u2014'}</td>
                  <td className="py-4 px-4 text-gray-600">{fight.venue || '\u2014'}</td>
                  <td className="py-4 px-4 text-gray-600">{fight.referee_name || '\u2014'}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(fight.status)}`}>{statusLabel(fight.status)}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{fight.confirmed_judges} / {fight.min_judges_required}</td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:border-[#6b1421] hover:text-[#6b1421] hover:bg-[#6b1421]/5 transition-all" onClick={() => navigate(`/fights/${fight.id}`)}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Ver
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all ${
                            canEdit(fight.status)
                              ? 'border-gray-300 text-gray-700 hover:border-[#6b1421] hover:text-[#6b1421] hover:bg-[#6b1421]/5'
                              : 'border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                          }`}
                          disabled={!canEdit(fight.status)}
                          onClick={() => navigate(`/fights/${fight.id}/edit`)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FightList;