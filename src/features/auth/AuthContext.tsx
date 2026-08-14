import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/services/storage';

interface AuthContextData {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    storage.getToken().then((storedToken) => {
      if (storedToken) {
        setTokenState(storedToken);
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken: string) => {
    await storage.setToken(newToken);
    setTokenState(newToken);
  };

  const logout = async () => {
    await storage.removeToken();
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
