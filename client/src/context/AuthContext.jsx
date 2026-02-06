import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const EMPTY_AUTH = { user: null, partner: null, loading: false, login: async () => {}, register: async () => {}, registerPartner: async () => {}, logout: () => {}, setUser: () => {}, setPartner: () => {} };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clyr_token');
    if (token) {
      api.get('/auth/me').then(res => {
        setUser(res.data.user);
        setPartner(res.data.partner);
      }).catch(() => {
        localStorage.removeItem('clyr_token');
        localStorage.removeItem('clyr_refresh_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('clyr_token', data.token);
    localStorage.setItem('clyr_refresh_token', data.refreshToken);
    setUser(data.user);
    setPartner(data.partner);
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('clyr_token', data.token);
    localStorage.setItem('clyr_refresh_token', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const registerPartner = async (userData) => {
    const { data } = await api.post('/auth/register/partner', userData);
    localStorage.setItem('clyr_token', data.token);
    localStorage.setItem('clyr_refresh_token', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('clyr_refresh_token');
    api.post('/auth/logout', { refreshToken }).catch(() => {});
    localStorage.removeItem('clyr_token');
    localStorage.removeItem('clyr_refresh_token');
    setUser(null);
    setPartner(null);
  };

  return (
    <AuthContext.Provider value={{ user, partner, loading, login, register, registerPartner, logout, setUser, setPartner }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || EMPTY_AUTH;
};
