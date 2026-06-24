import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import logoSrc from '../../assets/logoWbo.png';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/fights': 'Peleas',
  '/fights/create': 'Nueva Pelea',
  '/judges': 'Jueces',
  '/judges/assign': 'Asignar Jueces',
  '/analysis/statistics': 'Estadísticas',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getTitle = () => {
    const match = Object.entries(pageTitles).find(([path]) =>
      location.pathname.startsWith(path)
    );
    if (match) return match[1];

    if (location.pathname.startsWith('/fights/')) return 'Detalle de Pelea';
    if (location.pathname.startsWith('/judges/confirmation/')) return 'Confirmación';
    if (location.pathname.startsWith('/scoring/live/')) return 'Puntuación en Vivo';
    if (location.pathname.startsWith('/scoring/')) return 'Tarjeta de Juez';
    if (location.pathname.startsWith('/official-cards/')) return 'Tarjetas Oficiales';
    if (location.pathname.startsWith('/analysis/')) return 'Análisis';
    return 'WBO Judges';
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <img src={logoSrc} alt="WBO" />
        <div className="navbar-divider" />
        <span className="navbar-brand">
          WBO <span>Judges Evaluation System</span>
        </span>
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user?.email || 'admin@wbo.com'}</span>
        <button className="btn-logout" onClick={logout}>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default Navbar;
