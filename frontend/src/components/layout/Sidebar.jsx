import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/logoWbo.png';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Peleas', path: '/fights', icon: '▣' },
  { label: 'Jueces', path: '/judges', icon: '⚖' },
  { label: 'Análisis', path: '/analysis/statistics', icon: '▤' },
];

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logoSrc} alt="WBO" />
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        {user?.name || 'Sin sesión'}
      </div>
    </aside>
  );
};

export default Sidebar;
