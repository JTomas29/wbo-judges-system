import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJudgeById, updateJudge } from '../../services/judgeService';
import { useAuth } from '../../context/AuthContext';
import FormCard from '../../components/common/FormCard';
import FormSection from '../../components/common/FormSection';
import InputField from '../../components/common/InputField';
import SelectField from '../../components/common/SelectField';
import { DeleteModal } from '../../components/common/modals';

const LEVELS = ['Sin Asignar', 'Principiante', 'Intermedio', 'Avanzado'];

const EditJudge = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    getJudgeById(id, token)
      .then((res) => {
        const j = res.data;
        setForm({
          name: j.name || '',
          email: j.email || '',
          level: j.level || '',
          is_active: j.is_active !== false,
          password: '',
          confirmPassword: '',
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
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!form.email.trim()) errs.email = 'Obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido';
    if (!form.level) errs.level = 'Obligatorio';
    if (form.password && form.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
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
      navigate('/admin/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el juez');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { deleteJudge } = await import('../../services/judgeService');
      await deleteJudge(id, token);
      navigate('/admin/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar el juez');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">
          No tienes permisos para editar jueces.
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-600 border-t-red-800" />
        <span className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Cargando juez...</span>
      </div>
    </div>
  );

  if (error && !form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-6 py-4 text-sm font-semibold text-red-700 dark:text-red-300">Juez no encontrado</div>
    </div>
  );

  return (
    <FormCard
      title="Editar Juez"
      subtitle="Actualiza la información del juez."
      backRoute="/admin/users"
      error={error}
      icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    >
      <div className="flex items-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulseDot" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">Editando</span>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Información personal ── */}
        <FormSection
          icon="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
          title="Información personal"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="name"
              label="Nombre"
              value={form.name}
              onChange={handleChange}
              placeholder="Nombre completo"
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
            <SelectField
              name="level"
              label="Nivel"
              value={form.level}
              onChange={handleChange}
              placeholder="Seleccionar nivel"
              options={LEVELS.map((l) => ({ value: l, label: l }))}
              required
              error={fieldErrors.level}
            />
            {/* Estado Activo / Inactivo */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1.5">Estado</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
                    form.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${form.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {form.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </FormSection>

        {/* ── Cambiar contraseña ── */}
        <FormSection
          icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          title="Cambiar contraseña"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-2">Deja los campos vacíos si no deseas cambiar la contraseña.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InputField
              name="password"
              label="Nueva Contraseña"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              error={fieldErrors.password}
            />
            <InputField
              name="confirmPassword"
              label="Confirmar Contraseña"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              error={fieldErrors.confirmPassword}
            />
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-250 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar Juez
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1E293B] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-slate-300 dark:hover:border-[#374151] transition-all duration-250 active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-800 rounded-xl hover:bg-red-900 transition-all duration-250 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Juez"
        itemName={form.name}
        loading={deleting}
      />
    </FormCard>
  );
};

export default EditJudge;
