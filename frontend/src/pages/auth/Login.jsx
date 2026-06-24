import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/logoWbo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email, password });
    navigate('/dashboard');
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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wbo.com"
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
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Ingresar
          </button>
        </form>
        <div className="login-credentials">
          Credenciales de prueba: <strong>admin@wbo.com</strong> / cualquier contraseña
        </div>
        <div className="login-footer">WBO Judges Evaluation System v1.0</div>
      </div>
    </div>
  );
};

export default Login;
