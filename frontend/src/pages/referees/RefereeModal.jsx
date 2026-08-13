import { useEffect, useState } from 'react';
import BaseModal from '../../components/common/modals/BaseModal';
import InputField from '../../components/common/InputField';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  license_number: '',
  federation: '',
  phone: '',
  active: true,
};

const RefereeModal = ({ isOpen, referee, onClose, onSave, saving }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(referee ? {
      first_name: referee.first_name || '',
      last_name: referee.last_name || '',
      license_number: referee.license_number || '',
      federation: referee.federation || '',
      phone: referee.phone || '',
      active: referee.active !== false,
    } : EMPTY_FORM);
    setErrors({});
  }, [isOpen, referee]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.first_name.trim()) nextErrors.first_name = 'First name is required.';
    if (!form.last_name.trim()) nextErrors.last_name = 'Last name is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSave(form);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={saving ? () => {} : onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-700 to-[#8f2030] text-white">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-white/70">Administration</p>
          <h2 className="mt-1 text-xl font-bold">{referee ? 'Edit referee' : 'Create referee'}</h2>
          <p className="mt-1 text-sm text-white/80">Referees are independent records and do not have access to the system.</p>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField name="first_name" label="First name" required value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Referee first name" error={errors.first_name} />
          <InputField name="last_name" label="Last name" required value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="Referee last name" error={errors.last_name} />
          <InputField name="license_number" label="License" value={form.license_number} onChange={(e) => setField('license_number', e.target.value)} placeholder="License number" />
          <InputField name="federation" label="Federation" value={form.federation} onChange={(e) => setField('federation', e.target.value)} placeholder="Federation" />
          <InputField name="phone" label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Contact phone" />
          <div>
            <label htmlFor="referee-active" className="block text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Status</label>
            <select id="referee-active" value={form.active ? 'true' : 'false'} onChange={(e) => setField('active', e.target.value === 'true')} className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-medium bg-white dark:bg-[#1F2937] text-slate-800 dark:text-white outline-none focus:border-wbo-600 focus:ring-4 focus:ring-wbo-700/10">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0B1120] border-t border-slate-100 dark:border-[#1E293B] flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-[#374151] text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-wbo-700 hover:bg-wbo-800 text-white shadow-lg shadow-wbo-700/20 disabled:opacity-60">
            {saving ? 'Saving...' : referee ? 'Save changes' : 'Create referee'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default RefereeModal;
