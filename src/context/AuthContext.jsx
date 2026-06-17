import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = tokenStore.get();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.me();
        setUser(res.data);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    tokenStore.set(res.data.token);
    const meRes = await authAPI.me();
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    tokenStore.set(res.data.token);
    const meRes = await authAPI.me();
    setUser(meRes.data);
    return meRes.data;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
