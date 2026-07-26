import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { loginRequest, getMeRequest } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('wbo_token');
    if (storedToken) {
      setToken(storedToken);
      getMeRequest()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('wbo_token');
          localStorage.removeItem('wbo_user');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
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

  const logout = useCallback(() => {
    localStorage.removeItem('wbo_token');
    localStorage.removeItem('wbo_user');
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export default AuthContext;
