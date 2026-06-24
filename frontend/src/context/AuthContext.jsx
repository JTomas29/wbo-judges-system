import { createContext, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockUser } from '../data/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(mockUser);
  const [token, setToken] = useState('mock-token-wbo');
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (credentials) => {
    setUser(mockUser);
    setToken('mock-token-wbo');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export default AuthContext;
