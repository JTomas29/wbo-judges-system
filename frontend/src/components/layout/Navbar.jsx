import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoSrc from '../../assets/logoWbo.png';
import NotificationCenter from '../common/NotificationCenter';

const roleLabels = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  judge: 'Juez',
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase();
};

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SunIconSm = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIconSm = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: null },
    ...(user?.role === 'judge'
      ? [{
          label: 'Mis Designaciones',
          path: '/judges/confirmation',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        }]
      : []),
    ...(user?.role !== 'judge'
      ? [{
          label: 'Peleas',
          path: '/fights',
          icon: (
            <svg viewBox="0 0 64 64" fill="none" className="w-4 h-4">
              <ellipse cx="20" cy="36" rx="10" ry="14" fill="currentColor" opacity="0.8"/>
              <ellipse cx="44" cy="36" rx="10" ry="14" fill="currentColor" opacity="0.8"/>
              <circle cx="20" cy="36" r="6" fill="white" opacity="0.2"/>
              <circle cx="44" cy="36" r="6" fill="white" opacity="0.2"/>
            </svg>
          ),
        }]
      : []),
    ...(user?.role !== 'judge'
      ? [{
          label: 'Jueces',
          path: '/judges',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          ),
        }]
      : []),
    ...(user?.role !== 'judge'
      ? [{
          label: 'Análisis',
          path: '/analysis/statistics',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          ),
        }]
      : []),
    ...(user?.role === 'admin'
      ? [{
          label: 'Usuarios',
          path: '/admin/users',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
            </svg>
          ),
        }]
      : []),
    ...(user?.role === 'admin'
      ? [{
          label: 'Historial',
          path: '/history',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          ),
        }]
      : []),
  ];

  return (
    <header className="bg-white dark:bg-slate-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-[42px] h-[42px] rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm shrink-0 ring-2 ring-slate-100 dark:ring-slate-600 overflow-hidden">
              <img src={logoSrc} alt="WBO" className="w-full h-full object-contain p-1" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-tight">WBO Judges</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight tracking-wider">Evaluation System</p>
            </div>
            <span className="sm:hidden text-[15px] font-bold text-slate-800 dark:text-slate-100">WBO</span>
          </div>

          {/* CENTER: Nav */}
          <nav className="hidden lg:flex items-center h-[68px] gap-[2px]">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `px-5 h-full flex items-center text-sm font-semibold gap-2 transition-all duration-200 border-b-[3px] ${
                    isActive
                      ? 'text-wbo-700 dark:text-wbo-400 border-wbo-700 dark:border-wbo-400'
                      : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-wbo-600 hover:border-wbo-300'
                  }`
                }
              >
                {item.icon && item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* RIGHT: Theme Toggle + Notifications + Profile + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <>
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                  title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                >
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>

                {/* Avatar + Name (desktop) */}
                <NavLink
                  to={`/profile/${user.id}`}
                  className="hidden sm:flex items-center gap-3 pr-4 sm:pr-5 border-r border-slate-100 dark:border-slate-700 rounded-xl -m-1 p-1 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="relative group/avatar">
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ring-2 ring-white dark:ring-slate-800 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 transition-all duration-200 group-hover/avatar:shadow-md group-hover/avatar:-translate-y-0.5 group-hover/avatar:from-wbo-800 group-hover/avatar:to-wbo-900 cursor-pointer select-none">
                      {getInitials(user.name)}
                    </div>
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                      {roleLabels[user.role] || user.role}
                    </p>
                  </div>
                </NavLink>

                {/* Notification Center */}
                <NotificationCenter />

                {/* Logout */}
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Salir
                </button>
              </>
            )}

            {/* Mobile avatar + hamburger */}
            {user && (
              <div className="lg:hidden flex items-center gap-2">
                <NavLink to={`/profile/${user.id}`} onClick={() => setMobileOpen(false)}>
                  <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-[11px] font-bold shadow-sm ring-2 ring-white dark:ring-slate-800 cursor-pointer select-none">
                    {getInitials(user.name)}
                  </div>
                </NavLink>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 animate-fadeIn transition-colors duration-200">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-wbo-700 dark:text-wbo-400 bg-wbo-50 dark:bg-wbo-900/30 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-wbo-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`
                }
              >
                {item.icon && item.icon}
                {item.label}
              </NavLink>
            ))}

            {/* Mobile theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-wbo-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
            >
              {theme === 'light' ? <MoonIconSm /> : <SunIconSm />}
              {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </button>
          </div>
          {user && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2">
              <NavLink
                to={`/profile/${user.id}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-wbo-700 dark:text-wbo-400 bg-wbo-50 dark:bg-wbo-900/30 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-wbo-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi Perfil
              </NavLink>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {roleLabels[user.role] || user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-all shrink-0"
                >
                  Salir
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
