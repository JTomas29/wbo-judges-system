import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/logoWbo.png';

const devAccounts = [
  { label: 'Administrador', email: 'admin@wbo.com', password: 'admin123' },
  { label: 'Supervisor', email: 'supervisor@wbo.com', password: 'super123' },
  { label: 'Juez', email: 'rmendez@wbo.com', password: 'juez123' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#2d080a] via-[#6b1421] to-[#2d080a] p-5">
      <div className="bg-white rounded-xl shadow-2xl border-t-4 border-gold w-[420px] max-w-full pt-12 px-10 pb-10 relative">
        <div className="text-center mb-2">
          <img src={logoSrc} alt="WBO Logo" className="max-h-[120px] w-auto object-contain inline-block" />
        </div>
        <div className="text-center text-xl font-extrabold text-gray-900 tracking-wide mb-1">
          World Boxing Organization
        </div>
        <div className="text-center text-sm text-gray-400 font-medium mb-7">
          Sistema de Evaluación de Jueces
        </div>
        <hr className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent border-0 mx-0 mb-7" />

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@wbo.com"
              disabled={submitting}
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              disabled={submitting}
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center px-5 py-3 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>

          {error && (
            <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mt-4">
              {error}
            </div>
          )}
        </form>

        <div className="text-center text-xs text-gray-300 mt-5">
          WBO Judges Evaluation System v1.0
        </div>
      </div>

      {import.meta.env.DEV && (
        <div className="w-[420px] max-w-full mt-6">
          <div className="text-center text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            Credenciales de prueba
          </div>
          <div className="flex flex-col gap-2">
            {devAccounts.map((acc) => (
              <div key={acc.email} className="flex items-center justify-between backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg px-3.5 py-3">
                <div className="leading-relaxed">
                  <div className="text-sm font-semibold text-white">{acc.label}</div>
                  <div className="text-xs text-white/60 font-mono">{acc.email}</div>
                  <div className="text-[11px] text-white/30 font-mono">{acc.password}</div>
                </div>
                <button
                  type="button"
                  onClick={() => fillCredentials(acc)}
                  className="shrink-0 text-xs font-semibold text-white bg-white/10 border border-white/30 rounded-lg px-3 py-1.5 hover:bg-white hover:text-[#4a0f14] transition-colors"
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
