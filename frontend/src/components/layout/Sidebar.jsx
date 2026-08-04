import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/logoWbo.png';

const roleLabels = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  judge: 'Judge',
};

const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦' },
    ...(user?.role !== 'judge'
      ? [
          { label: 'Fights', path: '/fights', icon: '▣' },
          { label: 'Judges', path: '/judges', icon: '⚖' },
          { label: 'Ranking', path: '/ranking', icon: '▤' },
        ]
      : []),
    ...(user?.role === 'admin'
      ? [{ label: 'Users', path: '/admin/users', icon: '👤' }]
      : []),
    ...(user?.role === 'admin'
      ? [{ label: 'Referees', path: '/admin/referees', icon: '⚑' }]
      : []),
  ];

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
      {user && (
        <div className="sidebar-footer">
          {user.name}
          <br />
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            {roleLabels[user.role] || user.role}
          </span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
