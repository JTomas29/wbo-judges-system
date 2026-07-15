import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJudgeById, updateJudge } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';

const LEVELS = ['junior', 'senior', 'elite'];

const EditJudge = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  if (user && user.role !== 'admin') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getJudgeById(id, token)
      .then((res) => {
        const j = res.data;
        setForm({
          name: j.name || '',
          email: j.email || '',
          level: j.level || 'junior',
          is_active: j.is_active !== undefined ? j.is_active : true,
          password: '',
          confirm_password: '',
        });
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) setError('Juez no encontrado');
        else setError(err.response?.data?.message || 'Error al cargar el juez');
        setLoading(false);
      });
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setFieldErrors({ ...fieldErrors, [name]: null });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!form.email.trim()) {
      errs.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email inv\u00e1lido';
    }
    if (form.password && form.password.length > 0 && form.password.length < 6) {
      errs.password = 'M\u00ednimo 6 caracteres';
    }
    if (form.password !== form.confirm_password) {
      errs.confirm_password = 'Las contrase\u00f1as no coinciden';
    }
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
        name: form.name.trim(),
        email: form.email.trim(),
        level: form.level,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      await updateJudge(id, payload, token);
      navigate('/judges');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el juez');
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red/20'
        : 'border-gray-200 focus:border-[#6b1421] focus:ring-[#6b1421]/20'
    }`;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#6b1421]" />
      <span className="ml-3 text-gray-500 text-sm">Cargando juez...</span>
    </div>
  );

  if (error && !form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">{error}</div>
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg text-sm">Juez no encontrado</div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 max-w-[500px]">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Editar Juez</h2>
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Nombre *</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre del juez"
            className={inputClass('name')} />
          {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="juez@example.com"
            className={inputClass('email')} />
          {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Nivel</label>
          <select name="level" value={form.level} onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6b1421] focus:ring-2 focus:ring-[#6b1421]/20 bg-white">
            {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-[#6b1421] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Activo</span>
          </label>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Nueva Contrase\u00f1a <span className="text-gray-400 font-normal normal-case">(opcional)</span></label>
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Dejar vac\u00edo para mantener"
            className={inputClass('password')} />
          {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Confirmar Contrase\u00f1a</label>
          <input name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} placeholder="Repetir contrase\u00f1a"
            className={inputClass('confirm_password')} />
          {fieldErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm_password}</p>}
        </div>
        <div className="flex gap-2 mt-2">
          <button type="submit" disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors"
            onClick={() => navigate('/judges')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default EditJudge;
