/**
 * ThemeContext.jsx — Estado global de tema claro/oscuro.
 *
 * Provee:
 *   - theme      : 'light' | 'dark' (tema activo).
 *   - toggleTheme: alterna entre ambos temas.
 *   - setLight   : fuerza tema claro.
 *   - setDark    : fuerza tema oscuro.
 *
 * Persistencia: guarda en localStorage (clave "wbo_theme") la elección del
 * usuario y aplica la clase "dark" al <html> (document.documentElement) para
 * que Tailwind (modo dark por clase) reaccione. La inicialización lee el valor
 * guardado de forma defensiva (try/catch por si localStorage no está disponible).
 */

import { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Contexto base; el valor real lo define ThemeProvider.
const ThemeContext = createContext(null);

// Clave usada en localStorage para persistir el tema elegido.
const STORAGE_KEY = 'wbo_theme';

// Lee el tema inicial desde localStorage. Solo acepta 'dark' o 'light';
// cualquier otro valor (o ausencia de clave) cae en 'light'.
const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  // Estado del tema; el inicializador (getInitialTheme) se ejecuta una sola vez.
  const [theme, setTheme] = useState(getInitialTheme);

  // Se dispara en cada cambio de tema: sincroniza la clase 'dark' del <html>
  // y persiste el valor. El try/catch evita romper la app si localStorage falla.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Alterna claro <-> oscuro usando el valor previo del estado (funcional update).
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Atajos para fijar un tema concreto sin depender del estado actual.
  const setLight = useCallback(() => setTheme('light'), []);
  const setDark = useCallback(() => setTheme('dark'), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setLight, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook de acceso al contexto; lanza error si se usa fuera del Provider.
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
};

export default ThemeContext;
