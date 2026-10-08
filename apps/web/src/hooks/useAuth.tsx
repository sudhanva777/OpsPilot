import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/api/authApi';
import { getToken, clearToken } from '../services/api/client';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have a stored token and fetch user profile
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi
        .getMe()
        .then((profile) => setUser(profile))
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    // Fetch full profile after login
    const profile = await authApi.getMe();
    setUser(profile ?? {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      createdAt: response.user.createdAt,
      updatedAt: response.user.createdAt,
      lastLoginAt: null,
    });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await authApi.register({ email, password, name });
    setUser({
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      createdAt: response.user.createdAt,
      updatedAt: response.user.createdAt,
      lastLoginAt: null,
    });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
