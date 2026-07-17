import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registerRequest } from '../../services/authService';
import BackButton from '../../components/common/BackButton';

const ROLES = [
  { value: 'judge', label: 'Juez' },
  { value: 'supervisor', label: 'Supervisor' },
];

const UserManagement = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'judge' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    if (serverError) setServerError(null);
    if (success) setSuccess(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!form.email.trim()) {
      errs.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Email inválido';
    }
    if (!form.password) {
      errs.password = 'La contraseña es obligatoria';
    } else if (form.password.length < 6) {
      errs.password = 'Debe tener al menos 6 caracteres';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await registerRequest(
        { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role },
        token
      );
      setSuccess(`Usuario ${form.role === 'judge' ? 'juez' : 'supervisor'} creado exitosamente.`);
      setForm({ name: '', email: '', password: '', role: 'judge' });
      setFieldErrors({});
    } catch (err) {
      setServerError(err.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red/20'
        : 'border-gray-200 focus:border-gold focus:ring-gold/20'
    }`;

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4">
        <BackButton fallbackRoute="/dashboard" />
      </div>
      <div className="bg-white rounded-b-xl border-t-4 border-wbo-700 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Gestión de Usuarios</h2>
        <p className="text-sm text-gray-400 mb-6">Crear nuevos usuarios en el sistema</p>

        {serverError && (
          <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{serverError}</div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Nombre completo *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre y apellido"
              className={inputClass('name')} />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com"
              className={inputClass('email')} />
            {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Contraseña *</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres"
              className={inputClass('password')} />
            {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Rol *</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-wbo-700 text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
              {saving ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
