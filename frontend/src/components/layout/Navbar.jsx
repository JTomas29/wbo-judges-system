import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoSrc from '../../assets/logoWbo.png';
import logoSrcDark from '../../assets/logoWboModoOscuro.png';
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
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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

const BoxingGloveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M16.584 6.057c2.335 0 2.962 3.187 1.958 5.285c-.449.939-1.226 1.763-1.847 2.594c-.597.796-.895 1.194-1.287 1.473c-.874.621-1.886.591-2.918.591h-1.032c-2.539 0-3.808 0-4.647-.71s-1.044-1.93-1.455-4.373c-.226-1.343-.385-2.685-.352-3.986c.06-2.382 1.885-4.388 4.348-4.782c1.174-.188 2.62-.206 3.793-.007c2.097.356 3.576 2.162 3.43 4.19c-.09 1.235-.592 2.508-.905 3.702" />
    <path d="M7.004 15.5V18c0 1.886 0 2.828.586 3.414c.585.586 1.528.586 3.414.586h1c1.886 0 2.828 0 3.414-.586s.586-1.528.586-3.414v-3m-9 4h3" />
  </svg>
);

const RankingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M16 22v-9c0-1.414 0-2.121-.44-2.56C15.122 10 14.415 10 13 10h-2c-1.414 0-2.121 0-2.56.44C8 10.878 8 11.585 8 13v9m0 0c0-1.414 0-2.121-.44-2.56C7.122 19 6.415 19 5 19s-2.121 0-2.56.44C2 19.878 2 20.585 2 22m20 0v-3c0-1.414 0-2.121-.44-2.56C21.122 16 20.415 16 19 16s-2.121 0-2.56.44C16 16.878 16 17.585 16 19v3" />
    <path d="M11.146 3.023C11.526 2.34 11.716 2 12 2s.474.34.854 1.023l.098.176c.108.194.162.29.246.354c.085.064.19.088.4.135l.19.044c.738.167 1.107.25 1.195.532s-.164.577-.667 1.165l-.13.152c-.143.167-.215.25-.247.354s-.021.215 0 .438l.02.203c.076.785.114 1.178-.115 1.352c-.23.175-.576.015-1.267-.303l-.178-.082c-.197-.09-.295-.136-.399-.136s-.202.046-.399.136l-.178.082c-.691.318-1.037.478-1.267.303c-.23-.174-.191-.567-.115-1.352l.02-.203c.021-.223.032-.334 0-.438s-.104-.187-.247-.354l-.13-.152c-.503-.588-.755-.882-.667-1.165c.088-.282.457-.365 1.195-.532l.19-.044c.21-.047.315-.07.4-.135c.084-.064.138-.16.246-.354z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M6.5 7.5c0 3.035 2.465 5.5 5.5 5.5s5.5-2.465 5.5-5.5S15.035 2 12 2a5.503 5.503 0 0 0-5.5 5.5m1.5 0c0-2.205 1.795-4 4-4s4 1.795 4 4s-1.795 4-4 4s-4-1.795-4-4m10.57 10.91l1.015 3.785l1.45-.39l-1.015-3.785a4.76 4.76 0 0 0-4.59-3.52H8.57a4.75 4.75 0 0 0-4.59 3.52l-1.015 3.785l1.45.39L5.43 18.41A3.25 3.25 0 0 1 8.57 16h6.86c1.47 0 2.76.99 3.14 2.41" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 15 15" fill="currentColor">
    <path d="M5.25 8c.228 0 .426 0 .6.042a1.5 1.5 0 0 1 1.11 1.107c.04.175.04.373.04.601v2.5c0 .228 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.372.04-.6.04h-2.5c-.228 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.108-1.108C1 12.676 1 12.478 1 12.25v-2.5c0-.228 0-.426.042-.6a1.5 1.5 0 0 1 1.107-1.108C2.324 8 2.522 8 2.75 8zm7 0c.228 0 .426 0 .6.042a1.5 1.5 0 0 1 1.109 1.107c.042.175.041.373.041.601v2.5c0 .228 0 .426-.041.6a1.5 1.5 0 0 1-1.108 1.109c-.175.042-.373.041-.601.041h-2.5c-.228 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.108-1.108C8 12.676 8 12.478 8 12.25v-2.5c0-.228 0-.426.042-.6a1.5 1.5 0 0 1 1.107-1.108C9.324 8 9.522 8 9.75 8zM2.8 9c-.307 0-.373.003-.416.014a.5.5 0 0 0-.37.37c-.01.043-.014.11-.014.416v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.043.01.11.013.416.013h2.4c.308 0 .374-.003.417-.014a.5.5 0 0 0 .37-.369c.01-.043.013-.11.013-.417V9.8c0-.307-.003-.373-.014-.416a.5.5 0 0 0-.369-.37C5.574 9.004 5.507 9 5.2 9zm7 0c-.307 0-.373.003-.416.014a.5.5 0 0 0-.37.37c-.01.043-.014.11-.014.416v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.043.01.11.013.416.013h2.4c.308 0 .374-.003.417-.014a.5.5 0 0 0 .37-.369c.01-.043.013-.11.013-.417V9.8c0-.307-.004-.373-.014-.416a.5.5 0 0 0-.369-.37c-.043-.01-.11-.014-.417-.014zM5.25 1c.228 0 .426 0 .6.042a1.5 1.5 0 0 1 1.11 1.107c.04.175.04.373.04.601v2.5c0 .228 0 .426-.041.6A1.5 1.5 0 0 1 5.85 6.96c-.174.04-.372.04-.6.04h-2.5c-.228 0-.426 0-.6-.041A1.5 1.5 0 0 1 1.041 5.85C1 5.676 1 5.478 1 5.25v-2.5c0-.228 0-.426.042-.6a1.5 1.5 0 0 1 1.107-1.108C2.324 1 2.522 1 2.75 1zm7 0c.228 0 .426 0 .6.042a1.5 1.5 0 0 1 1.109 1.107c.042.175.041.373.041.601v2.5c0 .228 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.372.04-.6.04h-2.5c-.228 0-.426 0-.6-.041A1.5 1.5 0 0 1 8.041 5.85C8 5.676 8 5.478 8 5.25v-2.5c0-.228 0-.426.042-.6a1.5 1.5 0 0 1 1.107-1.108C9.324 1 9.522 1 9.75 1zM2.8 2c-.307 0-.373.003-.416.014a.5.5 0 0 0-.37.37c-.01.043-.014.11-.014.416v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.043.01.11.013.416.013h2.4c.308 0 .374-.003.417-.014a.5.5 0 0 0 .37-.369c.01-.043.013-.11.013-.417V2.8c0-.307-.003-.373-.014-.416a.5.5 0 0 0-.369-.37C5.574 2.004 5.507 2 5.2 2zm7 0c-.307 0-.373.003-.416.014a.5.5 0 0 0-.37.37c-.01.043-.014.11-.014.416v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.043.01.11.013.416.013h2.4c.308 0 .374-.003.417-.014a.5.5 0 0 0 .37-.369c.01-.043.013-.11.013-.417V2.8c0-.307-.004-.373-.014-.416a.5.5 0 0 0-.369-.37c-.043-.01-.11-.014-.417-.014z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z" />
  </svg>
);

const ShirtIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 20a1 1 0 1 0 2 0zm5-6a1 1 0 1 0 0 2zm1 2a1 1 0 1 0 0-2zm-1-5l-.447.894a1 1 0 0 0 1.437-.753zm-8 0l-.99.141a1 1 0 0 0 1.437.753zm.78-7.625a1 1 0 0 0-1.56 1.25L8 4zm8 1.25a1 1 0 1 0-1.56-1.25L16 4zm-9.617.516l-.99.142zm9.674 0L15.847 5zM20 9.561h-1V18h2V9.562zM18 20v-1H6v2h12zM4 18h1V9.562H3V18zM5.515 7.621l.242.97l1.986-.496l-.243-.97l-.243-.97l-1.985.496zM16.5 7.125l-.242.97l1.985.496l.242-.97l.243-.97l-1.986-.496zM12 9h-1v11h2V9zm4 6v1h1v-2h-1zM8.153 4v1h7.694V3H8.153zm8.684 1.141L15.847 5l-.837 5.859L16 11l.99.141l.837-5.858zM16 11l.447-.894l-4-2L12 9l-.447.894l4 2zm-4-2l-.447-.894l-4 2L8 11l.447.894l4-2zm-4 2l.99-.141L8.153 5l-.99.141l-.99.142l.837 5.858zm4-2l.78-.625l-4-5L8 4l-.78.625l4 5zm0 0l.78.625l4-5L16 4l-.78-.625l-4 5zm-8 .562h1a1 1 0 0 1 .757-.97l-.242-.97l-.243-.97A3 3 0 0 0 3 9.561zM6 20v-1a1 1 0 0 1-1-1H3a3 3 0 0 0 3 3zm14-2h-1a1 1 0 0 1-1 1v2a3 3 0 0 0 3-3zM8.153 4V3a2 2 0 0 0-1.98 2.283l.99-.142l.99-.141zm7.694 0v1l.99.141l.99.142A2 2 0 0 0 15.847 3zM20 9.562h1a3 3 0 0 0-2.272-2.91l-.243.97l-.242.97a1 1 0 0 1 .757.97z" />
  </svg>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    ...(user?.role === 'judge'
      ? [{
          label: 'Mis Designaciones',
          path: '/judges/assignments',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        }]
      : []),
    ...(user?.role !== 'judge'
      ? [{
          label: 'Peleas',
          path: '/fights',
          icon: (
            <BoxingGloveIcon />
          ),
        }]
      : []),
    ...(user?.role !== 'judge'
      ? [{
          label: 'Ranking',
          path: '/ranking',
          icon: (
            <RankingIcon />
          ),
        }]
      : []),
    ...(user?.role === 'admin'
      ? [{
          label: 'Usuarios',
          path: '/admin/users',
          icon: (
            <UserIcon />
          ),
        }]
      : []),
    ...(user?.role === 'admin'
      ? [{
          label: 'Árbitros',
          path: '/admin/referees',
          icon: <ShirtIcon />,
        }]
      : []),
    ...(user?.role === 'admin'
      ? [{
          label: 'Fight History',
          path: '/history',
          icon: <HistoryIcon />,
        }]
      : []),
  ];

  return (
    <header className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)] sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-[42px] h-[42px] rounded-full bg-white dark:bg-[#1E293B] flex items-center justify-center shrink-0 ring-2 ring-slate-100 dark:ring-[#334155] overflow-hidden transition-all duration-200">
              <img src={theme === 'dark' ? logoSrcDark : logoSrc} alt="WBO" className="w-full h-full object-contain p-1" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[15px] font-bold text-slate-900 dark:text-[#F8FAFC] leading-tight transition-colors duration-200">WBO Judges</p>
              <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] leading-tight tracking-wider transition-colors duration-200">Evaluation System</p>
            </div>
            <span className="sm:hidden text-[15px] font-bold text-slate-900 dark:text-[#F8FAFC] transition-colors duration-200">WBO</span>
          </div>

          {/* CENTER: Nav */}
          <nav className="hidden lg:flex items-center h-[68px] gap-[2px]">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `relative px-5 h-full flex items-center text-[13px] font-semibold gap-2 transition-all duration-200 ${
                    isActive
                      ? 'text-wbo-700 dark:text-white'
                      : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC] dark:hover:bg-white/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon && item.icon}
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-28px)] h-[2.5px] rounded-full bg-wbo-700 dark:bg-wbo-500 transition-all duration-200" />
                    )}
                  </>
                )}
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
                  className="relative p-2 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-200 active:scale-90"
                  title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                >
                  <span className={`block transition-transform duration-300 ease-out ${theme === 'light' ? 'rotate-0' : 'rotate-360'}`} style={{ transform: `rotate(${theme === 'light' ? '0deg' : '360deg'})` }}>
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                  </span>
                </button>

                {/* Avatar + Name (desktop) */}
                <NavLink
                  to={`/profile/${user.id}`}
                  className="hidden sm:flex items-center gap-3 pr-4 sm:pr-5 border-r border-slate-200 dark:border-[#1E293B] rounded-xl -m-1 p-1 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <div className="relative group/avatar">
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ring-2 ring-white dark:ring-[#0F172A] ring-offset-1 ring-offset-white dark:ring-offset-[#0F172A] transition-all duration-200 group-hover/avatar:shadow-md group-hover/avatar:-translate-y-0.5 group-hover/avatar:from-wbo-800 group-hover/avatar:to-wbo-900 cursor-pointer select-none">
                      {getInitials(user.name)}
                    </div>
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9] transition-colors duration-200">{user.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mt-0.5 transition-colors duration-200">
                      {roleLabels[user.role] || user.role}
                    </p>
                  </div>
                </NavLink>

                {/* Notification Center */}
                <NotificationCenter />

                {/* Logout */}
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3.5 py-2 hover:border-slate-300 dark:hover:border-[#334155] hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all duration-200"
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
                  <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-[11px] font-bold shadow-sm ring-2 ring-white dark:ring-[#0F172A] cursor-pointer select-none">
                    {getInitials(user.name)}
                  </div>
                </NavLink>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-200"
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
        <div className="lg:hidden border-t border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0F172A] animate-fadeIn transition-colors duration-200">
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
                      ? 'text-wbo-700 dark:text-white bg-wbo-50 dark:bg-wbo-500/10 font-semibold border-l-[3px] border-wbo-700 dark:border-wbo-500'
                      : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/[0.04] border-l-[3px] border-transparent'
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/[0.04] border-l-[3px] border-transparent transition-all duration-200"
            >
              {theme === 'light' ? <MoonIconSm /> : <SunIconSm />}
              {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </button>
          </div>
          {user && (
            <div className="border-t border-slate-200 dark:border-[#1E293B] px-4 py-3 space-y-2">
              <NavLink
                to={`/profile/${user.id}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-wbo-700 dark:text-white bg-wbo-50 dark:bg-wbo-500/10 font-semibold border-l-[3px] border-wbo-700 dark:border-wbo-500'
                      : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/[0.04] border-l-[3px] border-transparent'
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi Perfil
              </NavLink>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wbo-700 to-wbo-800 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm ring-2 ring-white dark:ring-[#0F172A]">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9] truncate transition-colors duration-200">{user.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider transition-colors duration-200">
                    {roleLabels[user.role] || user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-400 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3 py-1.5 hover:border-slate-300 dark:hover:border-[#334155] hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-all shrink-0"
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
