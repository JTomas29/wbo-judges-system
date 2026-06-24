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
      await login({ email, password });
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
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logoSrc} alt="WBO Logo" />
        </div>
        <div className="login-title">World Boxing Organization</div>
        <div className="login-subtitle">Sistema de Evaluación de Jueces</div>
        <hr className="login-divider" />

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wbo.com"
              disabled={submitting}
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-footer">WBO Judges Evaluation System v1.0</div>
      </div>

      {import.meta.env.DEV && (
        <div className="login-dev-accounts">
          <div className="dev-accounts-header">Credenciales de prueba</div>
          <div className="dev-accounts-list">
            {devAccounts.map((acc) => (
              <div className="dev-account-item" key={acc.email}>
                <div className="dev-account-info">
                  <div className="dev-account-label">{acc.label}</div>
                  <div className="dev-account-email">{acc.email}</div>
                  <div className="dev-account-pass">{acc.password}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-red btn-sm dev-use-btn"
                  onClick={() => fillCredentials(acc)}
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
