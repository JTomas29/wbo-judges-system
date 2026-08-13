import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registerRequest } from '../../services/authService';
import FormCard from '../../components/common/FormCard';
import FormSection from '../../components/common/FormSection';
import InputField from '../../components/common/InputField';
import SelectField from '../../components/common/SelectField';

const ROLES = [
  { value: 'judge', label: 'Judge' },
  { value: 'supervisor', label: 'Supervisor' },
];

const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl text-sm font-bold text-white bg-wbo-700 shadow-md shadow-wbo-700/20 hover:bg-wbo-800 hover:shadow-lg hover:shadow-wbo-700/25 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100';

const UserIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M6.5 7.5c0 3.035 2.465 5.5 5.5 5.5s5.5-2.465 5.5-5.5S15.035 2 12 2a5.503 5.503 0 0 0-5.5 5.5m1.5 0c0-2.205 1.795-4 4-4s4 1.795 4 4s-1.795 4-4 4s-4-1.795-4-4m10.57 10.91l1.015 3.785l1.45-.39l-1.015-3.785a4.76 4.76 0 0 0-4.59-3.52H8.57a4.75 4.75 0 0 0-4.59 3.52l-1.015 3.785l1.45.39L5.43 18.41A3.25 3.25 0 0 1 8.57 16h6.86c1.47 0 2.76.99 3.14 2.41" />
  </svg>
);

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
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Invalid email';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Must be at least 6 characters';
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
      setSuccess(`${form.role === 'judge' ? 'Judge' : 'Supervisor'} user created successfully.`);
      setForm({ name: '', email: '', password: '', role: 'judge' });
      setFieldErrors({});
    } catch (err) {
      setServerError(err.response?.data?.message || 'Error creating user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormCard
      title="Create New User"
      subtitle="Register a new user to access the system."
      backRoute="/dashboard"
      error={serverError}
      success={success}
      maxWidth="max-w-xl"
      icon={<UserIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />}
    >
      <form onSubmit={handleSubmit}>

        {/* ── Información personal ── */}
        <FormSection
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Personal Information"
          subtitle="User identification data"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <InputField
              name="name"
              label="Full name"
              value={form.name}
              onChange={handleChange}
              placeholder="First and last name"
              required
              error={fieldErrors.name}
            />
            <InputField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              error={fieldErrors.email}
            />
          </div>
        </FormSection>

        {/* ── Información de acceso ── */}
        <FormSection
          icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          title="Access Information"
          subtitle="Credentials for signing in"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <InputField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
              error={fieldErrors.password}
            />
            <SelectField
              name="role"
              label="Role"
              value={form.role}
              onChange={handleChange}
              options={ROLES}
              required
            />
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-9">
          <button
            type="submit"
            disabled={saving}
            className={primaryBtnClass}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </FormCard>
  );
};

export default UserManagement;
