'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userAuthEvents } from './userAuthEvents';

interface UserSession {
  email: string;
  subscription_key: string;
  access_token: string;
  expires_at: string;
}

interface Subscription {
  key: string;
  email: string;
  subdomain: string;
  tier: string;
  status: string;
  limits: {
    request_limit: number;
    current_usage: number;
    usage_percentage: number;
  };
  dates: {
    created_at: string;
    start_date: string;
    end_date: string;
    expires_at: string;
  };
  llm_config: {
    main_llm: {
      provider: string;
      model: string;
      endpoint: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    fallback_llm: {
      provider: string;
      model: string;
      endpoint: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
  };
}

interface UserAuthContextType {
  user: UserSession | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, subscriptionKey: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};

export const UserAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref to call latest logout without creating dependency cycles/order issues
  const logoutRef = useRef<() => void>(() => {});

  const loadSubscriptionData = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubscription(data.subscription);
        }
      } else if (response.status === 401) {
        // Emit global unauthorized event to trigger logout
        userAuthEvents.emitUnauthorized();
        return;
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  }, []);

  // Moved checkExistingSession useEffect below (after function declarations) to avoid
  // 'used before declaration' TypeScript errors for dependencies.

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const scheduleAutoLogout = useCallback((expiresAtIso: string) => {
    clearLogoutTimer();
    const expiresAt = new Date(expiresAtIso).getTime();
    const now = Date.now();
    const delay = Math.max(0, expiresAt - now - 5000); // logout 5s early to avoid race
    if (delay === 0) {
      logoutRef.current();
      return;
    }
    logoutTimerRef.current = setTimeout(() => {
      logoutRef.current();
    }, delay);
  }, []);

  const login = async (email: string, subscriptionKey: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          subscription_key: subscriptionKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      if (data.success) {
        const userSession: UserSession = {
          email: data.user_info.email,
          subscription_key: data.user_info.subscription_key,
          access_token: data.access_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
        };

        setUser(userSession);
        localStorage.setItem('user_session', JSON.stringify(userSession));
        scheduleAutoLogout(userSession.expires_at);
        
        // Load subscription data
        await loadSubscriptionData(data.access_token);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearLogoutTimer();
    setUser(null);
    setSubscription(null);
    localStorage.removeItem('user_session');
    
    // Optional: Call logout endpoint
    if (user?.access_token) {
      fetch('/api/user/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      }).catch((err) => {
        // Log but do not block UI logout
        console.error('Logout API error:', err);
      });
    }
  }, [user?.access_token]);

  // Keep ref pointing to latest logout function
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Check for existing session on mount (placed after function declarations)
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedUser = localStorage.getItem('user_session');
        if (storedUser) {
          const userSession = JSON.parse(storedUser);
          
          // Verify token is still valid
          const response = await fetch('/api/user/verify-token', {
            headers: {
              'Authorization': `Bearer ${userSession.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            setUser(userSession);
            scheduleAutoLogout(userSession.expires_at);
            await loadSubscriptionData(userSession.access_token);
          } else {
            // Token invalid, clear session
            localStorage.removeItem('user_session');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        localStorage.removeItem('user_session');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, [loadSubscriptionData, scheduleAutoLogout]);

  const refreshUserData = useCallback(async () => {
    if (!user?.access_token) return;
    
    try {
      await loadSubscriptionData(user.access_token);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [user?.access_token, loadSubscriptionData]);

  useEffect(() => {
    // Auto logout on any 401 Unauthorized from user API calls
    const unsubscribe = userAuthEvents.onUnauthorized(() => {
      logoutRef.current();
    });
    return unsubscribe;
  }, []);
  
  const value: UserAuthContextType = {
    user,
    subscription,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUserData
  };
  
  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};