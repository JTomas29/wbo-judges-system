/**
 * AuthContext.jsx — Estado global de autenticación.
 *
 * Provee a toda la app:
 *   - user   : objeto con los datos del usuario autenticado (incluye "role":
 *              'admin' | 'supervisor' | 'judge' | 'referee').
 *   - token  : JWT de la sesión activa (null si no hay sesión).
 *   - loading: true mientras se restaura la sesión desde localStorage.
 *   - login  : inicia sesión (persiste token + usuario en localStorage).
 *   - logout : cierra sesión y limpia localStorage.
 *
 * Persistencia: usa las claves "wbo_token" (JWT) y "wbo_user" (objeto en JSON)
 * en localStorage. El token también lo lee api.js para inyectar el header
 * Authorization en cada request.
 *
 * Se renderiza solo cuando !loading para evitar flash de "no autenticado"
 * mientras se valida el token guardado.
 */

import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { loginRequest, getMeRequest } from '../services/authService';

// Contexto base; el valor real (user, token, login, ...) lo define el Provider.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Estado de la sesión: datos del usuario, token JWT y bandera de carga.
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // loading arranca en true para bloquear la app mientras se restaura la sesión.
  const [loading, setLoading] = useState(true);

  // Efecto de montaje (una sola vez): restaura la sesión persistida.
  useEffect(() => {
    const storedToken = localStorage.getItem('wbo_token');
    if (storedToken) {
      setToken(storedToken);
      // Valida contra /auth/me para obtener los datos frescos del usuario.
      getMeRequest()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          // Token inválido/expirado: se limpia la sesión corrupta de localStorage.
          localStorage.removeItem('wbo_token');
          localStorage.removeItem('wbo_user');
          setToken(null);
        })
        .finally(() => setLoading(false)); // En ambos casos termina la carga.
    } else {
      setLoading(false); // Sin token guardado: sesión anónima, sin demora.
    }
  }, []);

  // Inicia sesión con credenciales. Si /auth/me falla justo después del login,
  // se degrada al user devuelto por el propio login (los datos siguen siendo válidos).
  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    // Persiste la sesión para que sobreviva a un refresh de la página.
    localStorage.setItem('wbo_token', data.token);
    localStorage.setItem('wbo_user', JSON.stringify(data.user));
    setToken(data.token);
    try {
      const meRes = await getMeRequest();
      setUser(meRes.user);
    } catch {
      setUser(data.user);
    }
    return data;
  }, []);

  // Cierra sesión: elimina del localStorage y resetea el estado en memoria.
  const logout = useCallback(() => {
    localStorage.removeItem('wbo_token');
    localStorage.removeItem('wbo_user');
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {/* Oculta los hijos hasta terminar la restauración de sesión (evita rutas parpadeando). */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook de acceso al contexto. Fuerza el uso dentro de AuthProvider para
// no devolver silentemente un contexto nulo (error temprano de configuración).
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export default AuthContext;
