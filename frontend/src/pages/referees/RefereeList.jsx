import { useEffect, useMemo, useState } from 'react';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { ConfirmModal } from '../../components/common/modals';
import { createReferee, deactivateReferee, getReferees, updateReferee } from '../../services/refereeService';
import RefereeModal from './RefereeModal';
import { TableSkeleton } from '../../components/common/Skeletons';

const statusClass = (active) => active
  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50'
  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600';

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${statusClass(active)}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

const RefereeList = () => {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState('az');
  const [modalReferee, setModalReferee] = useState(undefined);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const loadReferees = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getReferees();
      setReferees(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load referees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReferees(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleReferees = useMemo(() => [...referees]
    .filter((referee) => {
      const fullName = `${referee.first_name} ${referee.last_name}`.toLowerCase();
      if (search && !fullName.includes(search.toLowerCase())) return false;
      if (status === 'active' && !referee.active) return false;
      if (status === 'inactive' && referee.active) return false;
      return true;
    })
    .sort((a, b) => order === 'recent'
      ? new Date(b.created_at) - new Date(a.created_at)
      : `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'es')),
  [referees, search, status, order]);

  const saveReferee = async (form) => {
    setSaving(true);
    setError('');
    try {
      if (modalReferee) {
        const { data } = await updateReferee(modalReferee.id, form);
        setReferees((current) => current.map((referee) => referee.id === data.id ? data : referee));
        setToast('Referee updated successfully.');
      } else {
        const { data } = await createReferee(form);
        setReferees((current) => [data, ...current]);
        setToast('Referee created successfully.');
      }
      setModalReferee(undefined);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    setSaving(true);
    try {
      const { data } = await deactivateReferee(confirmTarget.id);
      setReferees((current) => current.map((referee) => referee.id === confirmTarget.id ? data.referee : referee));
      setConfirmTarget(null);
      setToast('Referee deactivated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to deactivate the referee.');
      setConfirmTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => { setSearch(''); setStatus(''); setOrder('az'); };
  const hasFilters = search || status || order !== 'az';

  const actionButtons = (referee) => (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setModalReferee(referee)} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-slate-200 hover:text-wbo-700 hover:border-wbo-400 hover:bg-wbo-50 dark:hover:bg-red-900/30">Edit</button>
      {referee.active && <button onClick={() => setConfirmTarget(referee)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700">Deactivate</button>}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-200 dark:ring-emerald-800/50 shadow-lg px-4 py-3 text-sm font-semibold">✓ {toast}</div>}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <BackButton fallbackRoute="/dashboard" />
          <p className="mt-4 text-xs font-bold tracking-[0.18em] uppercase text-wbo-700 dark:text-red-400">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Referees</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage the referee registry without links to system users.</p>
        </div>
        <button onClick={() => setModalReferee(null)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-wbo-700 hover:bg-wbo-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-wbo-700/20">
          <span className="text-lg leading-none">+</span> Create referee
        </button>
      </div>

      <FilterBar onClear={hasFilters ? clearFilters : null}>
        <FilterInput value={search} onChange={setSearch} placeholder="Search by name..." />
        <FilterSelect value={status} onChange={setStatus} placeholder="All" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <FilterSelect value={order} onChange={setOrder} placeholder="Order" options={[{ value: 'az', label: 'A-Z' }, { value: 'recent', label: 'Most recent' }]} />
      </FilterBar>

      {error && <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</div>}

      {loading ? <TableSkeleton rows={6} cols={7} />
        : visibleReferees.length === 0 ? <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-slate-100 dark:border-[#1E293B] p-12 text-center text-slate-500 dark:text-slate-400">No referees found with the applied filters.</div>
        : <>
          {/* ─── Mobile Card View ─── */}
          <div className="md:hidden space-y-4">
            {visibleReferees.map((referee) => (
              <article key={referee.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                      {`${referee.first_name?.[0] || ''}${referee.last_name?.[0] || ''}`.toUpperCase() || '??'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{referee.first_name} {referee.last_name}</p>
                      <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">{referee.federation || 'No federation'}</p>
                    </div>
                  </div>
                  <StatusBadge active={referee.active} />
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {referee.license_number && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                      </svg>
                      {referee.license_number}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-[#94A3B8]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {formatDate(referee.created_at)}
                  </span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
                  <button
                    onClick={() => setModalReferee(referee)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 bg-white dark:bg-[#1F2937] border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-[#F8FAFC] rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#374151] hover:border-slate-400 transition-all active:scale-[0.97]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  {referee.active && (
                    <button
                      onClick={() => setConfirmTarget(referee)}
                      className="inline-flex items-center justify-center min-h-11 min-w-11 px-3 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all active:scale-[0.97] shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* ─── Desktop Table ─── */}
          <div className="hidden md:block bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-sm overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-wbo-700 text-white"><th className="text-left p-4 text-xs uppercase tracking-wider">First name</th><th className="text-left p-4 text-xs uppercase tracking-wider">Last name</th><th className="text-left p-4 text-xs uppercase tracking-wider">License</th><th className="text-left p-4 text-xs uppercase tracking-wider">Federation</th><th className="text-left p-4 text-xs uppercase tracking-wider">Status</th><th className="text-left p-4 text-xs uppercase tracking-wider">Created</th><th className="text-left p-4 text-xs uppercase tracking-wider">Actions</th></tr></thead>
              <tbody>{visibleReferees.map((referee) => <tr key={referee.id} className="border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1A2435]"><td className="p-4 font-semibold text-slate-900 dark:text-white">{referee.first_name}</td><td className="p-4 font-semibold text-slate-900 dark:text-white">{referee.last_name}</td><td className="p-4 text-slate-600 dark:text-slate-300">{referee.license_number || '—'}</td><td className="p-4 text-slate-600 dark:text-slate-300">{referee.federation || '—'}</td><td className="p-4"><StatusBadge active={referee.active} /></td><td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(referee.created_at)}</td><td className="p-4">{actionButtons(referee)}</td></tr>)}</tbody>
            </table></div>
          </div>
        </>}

      <RefereeModal isOpen={modalReferee !== undefined} referee={modalReferee} onClose={() => setModalReferee(undefined)} onSave={saveReferee} saving={saving} />
      <ConfirmModal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleDeactivate} title="Deactivate referee" description="The referee will no longer be available for future fights." cancelLabel="Cancel" confirmLabel="Deactivate" type="warning" danger loading={saving} />
    </div>
  );
};

export default RefereeList;
