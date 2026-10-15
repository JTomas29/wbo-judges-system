import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ─── ScrollToTop ────────────────────────────────────────────────────────────────
// Utilidad que, al cambiar la ruta (pathname o query string), resetea el scroll
// de la ventana al inicio. Se monta una única vez a nivel del layout (App) y no
// renderiza nada (return null). No usa props ni contexto de negocio.
// ───────────────────────────────────────────────────────────────────────────────

const ScrollToTop = () => {
  // Observa los cambios de ubicación de react-router (solo interesan pathname y search)
  const { pathname, search } = useLocation();

  // Cada vez que cambia la ruta o la búsqueda, vuelve al tope de la página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  // No produce salida visual
  return null;
};

export default ScrollToTop;
