'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  adminToken: string | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (token) {
        const isValid = await apiService.testAdminToken(token);
        if (isValid) {
          setAdminToken(token);
          setIsAuthenticated(true);
          apiService.setAdminToken(token);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('admin_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token: string): Promise<boolean> => {
    try {
      const isValid = await apiService.testAdminToken(token);
      if (isValid) {
        setAdminToken(token);
        setIsAuthenticated(true);
        apiService.setAdminToken(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setAdminToken(null);
    setIsAuthenticated(false);
    apiService.clearAdminToken();
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      adminToken,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}