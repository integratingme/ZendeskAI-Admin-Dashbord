'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  }, []);

  // Check for existing session on mount
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
  }, [loadSubscriptionData]);

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

  const logout = () => {
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
      }).catch(console.error);
    }
  };

  const refreshUserData = useCallback(async () => {
    if (!user?.access_token) return;
    
    try {
      await loadSubscriptionData(user.access_token);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [user?.access_token, loadSubscriptionData]);

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