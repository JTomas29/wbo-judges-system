import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFightById, updateFight } from '../../services/fightService';
import { getReferees } from '../../services/refereeService';
import { useAuth } from '../../context/AuthContext';
import FormCard from '../../components/common/FormCard';
import FormSection from '../../components/common/FormSection';
import InputField from '../../components/common/InputField';
import SelectField from '../../components/common/SelectField';
import TextareaField from '../../components/common/TextareaField';
import { Skeleton } from '../../components/common/Skeletons';

const ROUNDS = [4, 6, 8, 10, 12];

const EditFight = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getFightById(id, token),
      getReferees(),
    ])
      .then(([fightRes, refereesRes]) => {
        const f = fightRes.data;
        setForm({
          event_name: f.event_name || '',
          boxer_red: f.boxer_red || '',
          boxer_blue: f.boxer_blue || '',
          scheduled_date: f.scheduled_date ? f.scheduled_date.split('T')[0] : '',
          weight_class: f.weight_class || '',
          total_rounds: f.total_rounds || 12,
          venue: f.venue || '',
          title: f.title || '',
          broadcaster: f.broadcaster || '',
          referee_id: f.referee_id ? String(f.referee_id) : '',
          notes: f.notes || '',
        });
        setReferees(refereesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) setError('Fight not found');
        else setError(err.response?.data?.message || 'Failed to load fight');
        setLoading(false);
      });
  }, [id, token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  const validate = () => {
    const errs = {};
    if (!form.event_name.trim()) errs.event_name = 'Event name is required';
    if (!form.boxer_red.trim()) errs.boxer_red = 'Required';
    if (!form.boxer_blue.trim()) errs.boxer_blue = 'Required';
    if (form.boxer_red.trim().toLowerCase() === form.boxer_blue.trim().toLowerCase()) {
      errs.boxer_blue = 'Cannot be the same as red';
    }
    if (!form.scheduled_date) errs.scheduled_date = 'Required';
    if (!form.weight_class.trim()) errs.weight_class = 'Required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        event_name: form.event_name.trim(),
        boxer_red: form.boxer_red.trim(),
        boxer_blue: form.boxer_blue.trim(),
        scheduled_date: form.scheduled_date,
        total_rounds: Number(form.total_rounds),
        weight_class: form.weight_class.trim(),
        venue: form.venue.trim() || undefined,
        title: form.title.trim() || undefined,
        broadcaster: form.broadcaster.trim() || undefined,
        notes: form.notes.trim() || undefined,
        referee_id: form.referee_id ? Number(form.referee_id) : undefined,
      };
      await updateFight(id, payload, token);
      navigate(`/fights/${id}`, { state: { toast: { type: 'success', message: 'Fight updated successfully.' } } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );

  if (error && !form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">Fight not found</div>
    </div>
  );

  return (
    <FormCard
      title="Edit Fight"
      subtitle="Update the information of this fight."
      backRoute="/fights"
      error={error}
      icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    >
      <div className="flex items-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulseDot" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">Editing</span>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Fight information ── */}
        <FormSection
          icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          title="Fight Information"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              className="sm:col-span-2"
              name="event_name"
              label="Event Name"
              value={form.event_name}
              onChange={handleChange}
              placeholder="Event name"
              required
              error={fieldErrors.event_name}
            />
            <InputField
              name="weight_class"
              label="Weight Class"
              value={form.weight_class}
              onChange={handleChange}
              placeholder="e.g. Heavyweight"
              required
              error={fieldErrors.weight_class}
            />
            <InputField
              name="scheduled_date"
              label="Scheduled Date"
              type="date"
              value={form.scheduled_date}
              onChange={handleChange}
              required
              error={fieldErrors.scheduled_date}
            />
            <SelectField
              name="total_rounds"
              label="Rounds"
              value={form.total_rounds}
              onChange={handleChange}
              options={ROUNDS.map((r) => ({ value: r, label: `${r} rounds` }))}
              required
            />
          </div>
        </FormSection>

        {/* ── Boxers ── */}
        <FormSection
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Boxers"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="boxer_red"
              label="Red Corner"
              value={form.boxer_red}
              onChange={handleChange}
              placeholder="Full name"
              required
              error={fieldErrors.boxer_red}
            />
            <InputField
              name="boxer_blue"
              label="Blue Corner"
              value={form.boxer_blue}
              onChange={handleChange}
              placeholder="Full name"
              required
              error={fieldErrors.boxer_blue}
            />
          </div>
        </FormSection>

        {/* ── Event information ── */}
        <FormSection
          icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          title="Event Information"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="venue"
              label="Venue"
              value={form.venue}
              onChange={handleChange}
              placeholder="e.g. Luna Park"
            />
            <InputField
              name="broadcaster"
              label="Broadcaster"
              value={form.broadcaster}
              onChange={handleChange}
              placeholder="e.g. ESPN"
            />
            <InputField
              name="title"
              label="Title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. WBO Championship"
            />
            <SelectField
              name="referee_id"
              label="Referee"
              value={form.referee_id}
              onChange={handleChange}
              placeholder="— Unassigned —"
              options={referees.map((r) => ({ value: r.id, label: r.full_name }))}
            />
          </div>
        </FormSection>

        {/* ── Comments ── */}
        <FormSection
          icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          title="Comments"
        >
          <TextareaField
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Additional notes and observations about the fight..."
            rows={3}
          />
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 mt-10">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-wbo-700 rounded-xl hover:bg-wbo-800 transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/fights/${id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-slate-300 dark:hover:border-[#374151] transition-all duration-250 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </FormCard>
  );
};

export default EditFight;
