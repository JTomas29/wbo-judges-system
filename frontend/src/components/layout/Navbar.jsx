import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoSrc from '../../assets/logoWbo.png';

const roleLabels = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  judge: 'Juez',
};

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: null },
  {
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
  },
  {
    label: 'Jueces',
    path: '/judges',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
  {
    label: 'Análisis',
    path: '/analysis/statistics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
  },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-3 shrink-0">
          <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 ring-2 ring-gray-100 overflow-hidden">
            <img src={logoSrc} alt="WBO" className="w-full h-full object-contain p-1" />
          </div>
            <div className="hidden sm:block">
              <p className="text-[15px] font-bold text-gray-800 leading-tight">WBO Judges</p>
              <p className="text-[10px] text-gray-400 leading-tight tracking-wider">Evaluation System</p>
            </div>
            <span className="sm:hidden text-[15px] font-bold text-gray-800">WBO</span>
          </div>

          {/* CENTER: Nav */}
          <nav className="hidden lg:flex items-center h-[68px] gap-[2px]">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `px-5 h-full flex items-center text-sm font-semibold gap-2 transition-colors border-b-[3px] ${
                    isActive
                      ? 'text-[#6b1421] border-[#6b1421]'
                      : 'text-gray-500 border-transparent hover:text-[#7a1f2b] hover:border-[#c97a84]'
                  }`
                }
              >
                {item.icon && item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* RIGHT: Notifications + Profile + Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg text-gray-400 hover:text-[#7a1f2b] hover:bg-[#fcf0f2] transition-all hidden sm:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>

            {/* Avatar + Name */}
            {user && (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight uppercase tracking-wider">
                    {roleLabels[user.role] || user.role}
                  </p>
                </div>
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#6b1421] to-[#4a0f14] text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ring-2 ring-white">
                  {user.name?.charAt(0) || 'U'}
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 border border-gray-200 rounded-lg px-3.5 py-2 hover:border-gray-300 hover:text-gray-600 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Salir
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
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
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#6b1421] bg-[#fcf0f2] font-semibold'
                      : 'text-gray-500 hover:text-[#7a1f2b] hover:bg-gray-50'
                  }`
                }
              >
                {item.icon && item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
          {user && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6b1421] to-[#4a0f14] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {roleLabels[user.role] || user.role}
                </p>
              </div>
              <button
                onClick={logout}
                className="text-sm font-medium text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-all shrink-0"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
