import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authStorage } from '../storage/authStorage';
import { loginUser, registerUser, logoutUser, refreshToken, type RegisterPayload, type LoginPayload } from '../services/auth';
import { setRefreshHandler } from '../services/api';
import type { User } from '../types/auth';

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          authStorage.getToken(),
          authStorage.getUser(),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // session load failed
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Register the auto-refresh handler with the API layer
  useEffect(() => {
    setRefreshHandler(async () => {
      const rt = await authStorage.getRefreshToken();
      if (!rt) throw new Error('No refresh token');
      const res = await refreshToken(rt);
      const newAccess = res.access_token;
      await authStorage.setToken(newAccess);
      if (res.refresh_token) {
        await authStorage.setRefreshToken(res.refresh_token);
      }
      setToken(newAccess);
      return newAccess;
    });
    return () => setRefreshHandler(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginUser(payload);
    await Promise.all([
      authStorage.setSession(response.access_token, response.refresh_token),
      authStorage.setUser(JSON.stringify(response.user)),
    ]);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerUser(payload);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(token ?? undefined); } catch {}
    await authStorage.clear();
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
