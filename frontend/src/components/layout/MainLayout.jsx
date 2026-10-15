import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Toast from '../common/Toast';
import ErrorBoundary from '../common/ErrorBoundary';

// ─── MainLayout ─────────────────────────────────────────────────────────────────
// Layout principal de la aplicación. Envuelve las páginas con la Navbar, un <main>
// con ancho máximo centrado, un ErrorBoundary (para no tumbar la app ante un fallo
// de render) y el Toast global. Si la ruta es /login, renderiza el children pelado
// (sin navegación) para la pantalla de autenticación.
// CONTEXTO: usa useLocation de react-router (sin contexto de negocio directo).
// ───────────────────────────────────────────────────────────────────────────────

const MainLayout = ({ children }) => {
  // Observa la ruta actual para decidir si estamos en la pantalla de login
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  // Login: sin Navbar, contenedores ni Toast (vista limpia y centrada)
  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Barra de navegación superior fija */}
      <Navbar />
      {/* Contenido principal con tope de ancho y márgenes de la app */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Cada página aislada ante errores de render */}
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      {/* Notificación global tipo toast (lee location.state.toast) */}
      <Toast />
    </div>
  );
};

// Exporta el layout para envolver las rutas protegidas
export default MainLayout;
