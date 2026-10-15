/**
 * App.jsx — Composición raíz de la aplicación.
 *
 * Define el árbol de Providers y el layout principal de toda la SPA.
 * Orden de anidación (de afuera hacia adentro):
 *   1. BrowserRouter        → provee el historial de React Router (rutas).
 *   2. ThemeProvider        → estado global de tema claro/oscuro (usa localStorage).
 *   3. AuthProvider         → estado global de sesión (token JWT + usuario).
 *   4. ScrollToTop          → restaura el scroll al principio en cada cambio de ruta.
 *   5. MainLayout           → shell visual (header, sidebar, contenedor) común a todas las páginas.
 *   6. AppRoutes            → define qué componente se renderiza según la URL.
 */

// BrowserRouter: sincroniza el árbol de React Router con la barra de direcciones del navegador.
import { BrowserRouter } from 'react-router-dom';
// AuthProvider: expone el contexto de autenticación (user, token, login, logout) a toda la app.
import { AuthProvider } from './context/AuthContext';
// ThemeProvider: expone el contexto de tema (theme, toggleTheme, setLight, setDark).
import { ThemeProvider } from './context/ThemeContext';
// AppRoutes: tabla de rutas de la aplicación (con rutas protegidas por rol).
import AppRoutes from './routes/AppRoutes';
// MainLayout: layout persistente (header/navegación) que envuelve el contenido de cada ruta.
import MainLayout from './components/layout/MainLayout';
// ScrollToTop: componente utilitario que mueve el scroll al tope al navegar entre rutas.
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* Restaura el scroll en cada navegación (depende de la ubicación de react-router). */}
          <ScrollToTop />
          {/* Layout persistente; AppRoutes renderiza dentro de él la página de la ruta activa. */}
          <MainLayout>
            <AppRoutes />
          </MainLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
