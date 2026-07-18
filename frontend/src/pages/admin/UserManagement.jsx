import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registerRequest } from '../../services/authService';
import FormCard from '../../components/common/FormCard';
import FormSection from '../../components/common/FormSection';
import InputField from '../../components/common/InputField';
import SelectField from '../../components/common/SelectField';

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

  return (
    <FormCard
      title="Crear Nuevo Usuario"
      subtitle="Complete los datos para crear un nuevo usuario en el sistema."
      backRoute="/dashboard"
      error={serverError}
      success={success}
      maxWidth="max-w-xl"
      icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    >
      <form onSubmit={handleSubmit}>

        {/* ── Información personal ── */}
        <FormSection
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Información personal"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="name"
              label="Nombre completo"
              value={form.name}
              onChange={handleChange}
              placeholder="Nombre y apellido"
              required
              error={fieldErrors.name}
            />
            <InputField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              required
              error={fieldErrors.email}
            />
          </div>
        </FormSection>

        {/* ── Información de acceso ── */}
        <FormSection
          icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          title="Información de acceso"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="password"
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              error={fieldErrors.password}
            />
            <SelectField
              name="role"
              label="Rol"
              value={form.role}
              onChange={handleChange}
              options={ROLES}
              required
            />
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 mt-10">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {saving ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </FormCard>
  );
};

export default UserManagement;
