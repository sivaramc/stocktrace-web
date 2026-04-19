import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onUnauthorized } from '../api/client';
import { fetchMe, loginApi } from '../api/endpoints';
import type { Me } from '../api/types';
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  storeAuth,
  updateStoredUser,
} from './tokenStorage';

interface AuthContextValue {
  user: Me | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<Me | null>(() => getStoredUser());

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => onUnauthorized(logout), [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password);
    storeAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    updateStoredUser(me);
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      refreshMe,
    }),
    [user, token, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
