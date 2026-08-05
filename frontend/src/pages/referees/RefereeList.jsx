import { useEffect, useMemo, useState } from 'react';
import BackButton from '../../components/common/BackButton';
import FilterBar, { FilterInput, FilterSelect } from '../../components/common/FilterBar';
import { ConfirmModal } from '../../components/common/modals';
import { createReferee, deactivateReferee, getReferees, updateReferee } from '../../services/refereeService';
import RefereeModal from './RefereeModal';

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
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 shadow-lg px-4 py-3 text-sm font-semibold">✓ {toast}</div>}
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

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {loading ? <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm p-16 flex items-center justify-center gap-3 text-slate-500"><span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-wbo-700 animate-spin" />Loading referees...</div>
        : visibleReferees.length === 0 ? <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-slate-100 dark:border-[#1E293B] p-12 text-center text-slate-500">No referees found with the applied filters.</div>
        : <>
          <div className="hidden md:block bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-sm overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-wbo-700 text-white"><th className="text-left p-4 text-xs uppercase tracking-wider">First name</th><th className="text-left p-4 text-xs uppercase tracking-wider">Last name</th><th className="text-left p-4 text-xs uppercase tracking-wider">License</th><th className="text-left p-4 text-xs uppercase tracking-wider">Federation</th><th className="text-left p-4 text-xs uppercase tracking-wider">Status</th><th className="text-left p-4 text-xs uppercase tracking-wider">Created</th><th className="text-left p-4 text-xs uppercase tracking-wider">Actions</th></tr></thead>
              <tbody>{visibleReferees.map((referee) => <tr key={referee.id} className="border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1A2435]"><td className="p-4 font-semibold text-slate-900 dark:text-white">{referee.first_name}</td><td className="p-4 font-semibold text-slate-900 dark:text-white">{referee.last_name}</td><td className="p-4 text-slate-600 dark:text-slate-300">{referee.license_number || '—'}</td><td className="p-4 text-slate-600 dark:text-slate-300">{referee.federation || '—'}</td><td className="p-4"><StatusBadge active={referee.active} /></td><td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(referee.created_at)}</td><td className="p-4">{actionButtons(referee)}</td></tr>)}</tbody>
            </table></div>
          </div>
          <div className="md:hidden grid gap-3">{visibleReferees.map((referee) => <article key={referee.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-sm p-5"><div className="flex justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">{referee.first_name} {referee.last_name}</h2><p className="mt-1 text-xs text-slate-500">Created {formatDate(referee.created_at)}</p></div><StatusBadge active={referee.active} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">License</dt><dd className="mt-1 text-slate-700 dark:text-slate-200">{referee.license_number || '—'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Federation</dt><dd className="mt-1 text-slate-700 dark:text-slate-200">{referee.federation || '—'}</dd></div></dl><div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#1E293B]">{actionButtons(referee)}</div></article>)}</div>
        </>}

      <RefereeModal isOpen={modalReferee !== undefined} referee={modalReferee} onClose={() => setModalReferee(undefined)} onSave={saveReferee} saving={saving} />
      <ConfirmModal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleDeactivate} title="Deactivate referee" description="The referee will no longer be available for future fights." cancelLabel="Cancel" confirmLabel="Deactivate" type="warning" danger loading={saving} />
    </div>
  );
};

export default RefereeList;
