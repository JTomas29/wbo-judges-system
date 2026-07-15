import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFight } from '../../services/fightService';
import { getJudges } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';

const ROUNDS = [4, 6, 8, 10, 12];

const CreateFight = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  if (user && !isAdmin) {
    return <p className="text-gray-400 py-10">Redirigiendo al Dashboard...</p>;
  }

  const [form, setForm] = useState({
    event_name: '',
    boxer_red: '',
    boxer_blue: '',
    scheduled_date: '',
    weight_class: '',
    total_rounds: 12,
    venue: '',
    title: '',
    broadcaster: '',
    referee_id: '',
    notes: '',
  });
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!token) return;
    getJudges(token)
      .then((res) => setReferees(res.data))
      .catch(() => {});
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  const validate = () => {
    const errs = {};
    if (!form.event_name.trim()) errs.event_name = 'El nombre del evento es obligatorio';
    if (!form.boxer_red.trim()) errs.boxer_red = 'Obligatorio';
    if (!form.boxer_blue.trim()) errs.boxer_blue = 'Obligatorio';
    if (form.boxer_red.trim().toLowerCase() === form.boxer_blue.trim().toLowerCase()) {
      errs.boxer_blue = 'No puede ser igual al rojo';
    }
    if (!form.scheduled_date) errs.scheduled_date = 'Obligatorio';
    if (!form.weight_class.trim()) errs.weight_class = 'Obligatorio';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
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
      const res = await createFight(payload, token);
      navigate(`/fights/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la pelea');
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red/20'
        : 'border-gray-200 focus:border-gold focus:ring-gold/20'
    }`;

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <button onClick={() => navigate('/fights')} className="flex items-center text-sm font-medium text-wbo-700 hover:text-opacity-80 transition-colors mb-4">
        ← Volver a Peleas
      </button>
      <div className="bg-white rounded-b-xl border-t-4 border-wbo-700 shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Crear Nueva Pelea</h2>
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="mb-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Evento *</label>
            <input name="event_name" value={form.event_name} onChange={handleChange} placeholder="Nombre del evento"
              className={inputClass('event_name')} />
            {fieldErrors.event_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.event_name}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Boxeador Rojo *</label>
            <input name="boxer_red" value={form.boxer_red} onChange={handleChange} placeholder="Nombre"
              className={inputClass('boxer_red')} />
            {fieldErrors.boxer_red && <p className="text-xs text-red-500 mt-1">{fieldErrors.boxer_red}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Boxeador Azul *</label>
            <input name="boxer_blue" value={form.boxer_blue} onChange={handleChange} placeholder="Nombre"
              className={inputClass('boxer_blue')} />
            {fieldErrors.boxer_blue && <p className="text-xs text-red-500 mt-1">{fieldErrors.boxer_blue}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Fecha *</label>
            <input name="scheduled_date" type="date" value={form.scheduled_date} onChange={handleChange}
              className={inputClass('scheduled_date')} />
            {fieldErrors.scheduled_date && <p className="text-xs text-red-500 mt-1">{fieldErrors.scheduled_date}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Categoría *</label>
            <input name="weight_class" value={form.weight_class} onChange={handleChange} placeholder="Ej: Peso Pesado"
              className={inputClass('weight_class')} />
            {fieldErrors.weight_class && <p className="text-xs text-red-500 mt-1">{fieldErrors.weight_class}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Rounds *</label>
            <select name="total_rounds" value={form.total_rounds} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white">
              {ROUNDS.map((r) => <option key={r} value={r}>{r} rounds</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Lugar</label>
            <input name="venue" value={form.venue} onChange={handleChange} placeholder="Ej: Luna Park"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Título</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="Ej: Campeonato WBO"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Televisora</label>
            <input name="broadcaster" value={form.broadcaster} onChange={handleChange} placeholder="Ej: ESPN"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Árbitro</label>
            <select name="referee_id" value={form.referee_id} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white">
              <option value="">— Sin asignar —</option>
              {referees.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="mb-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Notas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Observaciones adicionales"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 bg-wbo-700 text-white rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button"
            className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
            onClick={() => navigate('/fights')}>Cancelar</button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default CreateFight;
