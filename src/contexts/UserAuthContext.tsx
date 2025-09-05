'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userAuthEvents } from './userAuthEvents';

interface UserSession {
  email: string;
  subscription_key: string;
  access_token: string;
  expires_at: string;
  refresh_token?: string;
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
  accessToken: string | null;
  login: (email: string, subscriptionKey: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  extendSession: () => Promise<boolean>;
  isIdleWarningOpen: boolean;
  warningSecondsLeft: number;
  staySignedIn: () => void;
  forceLogoutForIdle: () => void;
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
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number>(0);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const userRef = useRef<UserSession | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
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
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    setShowIdleWarning(false);
    setWarningSecondsLeft(0);
  };

  const clearActivityTimer = () => {
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }
  };

  const startIdleTracking = useCallback(() => {
    clearActivityTimer();
    lastActivityRef.current = Date.now();

    const reset = () => {
      // Broadcast activity to other tabs
      try {
        if (!bcRef.current) bcRef.current = new BroadcastChannel('user-activity');
        bcRef.current.postMessage({ type: 'activity', ts: Date.now() });
      } catch { /* noop broadcast */ }

      lastActivityRef.current = Date.now();
      clearActivityTimer();
      // Show idle warning at 60s before idle timeout
      idleWarningTimerRef.current = setTimeout(() => {
        setShowIdleWarning(true);
        setWarningSecondsLeft(60);
      }, 14 * 60 * 1000);
      // Idle logout at 15 minutes
      activityTimerRef.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastActivityRef.current >= 15 * 60 * 1000) {
          logoutRef.current();
        }
      }, 15 * 60 * 1000);
    };

    // initial
    // Schedule initial idle warning at 14 minutes of inactivity
    idleWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, 14 * 60 * 1000);

    // Schedule initial auto logout at 15 minutes of inactivity
    activityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 15 * 60 * 1000) {
        logoutRef.current();
      }
    }, 15 * 60 * 1000);

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];
    events.forEach(evt => window.addEventListener(evt, reset, { passive: true } as EventListenerOptions));

    // Listen activity from other tabs
    try {
      if (!bcRef.current) bcRef.current = new BroadcastChannel('user-activity');
      bcRef.current.onmessage = (evt) => {
        if (evt?.data?.type === 'activity') {
          lastActivityRef.current = Date.now();
          clearActivityTimer();
          activityTimerRef.current = setTimeout(() => {
            const now = Date.now();
            if (now - lastActivityRef.current >= 15 * 60 * 1000) {
              logoutRef.current();
            }
          }, 15 * 60 * 1000);
        }
      };
    } catch { /* noop channel subscribe */ }

    return () => {
      clearActivityTimer();
      events.forEach(evt => window.removeEventListener(evt, reset));
      try { bcRef.current?.close?.(); } catch { /* close noop */ }
    };
  }, []);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const scheduleAutoLogout = useCallback((expiresAtIso: string) => {
    clearLogoutTimer();
    clearRefreshTimer();
    const expiresAt = new Date(expiresAtIso).getTime();
    const now = Date.now();
    const delay = Math.max(0, expiresAt - now - 5000); // logout 5s early to avoid race
    if (delay === 0) {
      logoutRef.current();
      return;
    }
    // Show warning 60s before logout
    const warningDelay = Math.max(0, delay - 60 * 1000);
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, warningDelay);

    // Proactive refresh at 2 minutes before expiry if user is active and refresh token exists
    refreshTimerRef.current = setTimeout(async () => {
      const active = Date.now() - lastActivityRef.current < 15 * 60 * 1000;
      const currentUser = userRef.current;
      if (active && currentUser?.refresh_token) {
        try {
          // single-flight guard
          if (!refreshInFlightRef.current) {
            refreshInFlightRef.current = fetch('/api/user/refresh-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: currentUser.refresh_token })
            })
              .then(r => r.ok ? r.json() : null)
              .then((ok) => {
                if (ok?.access_token) {
                  const newSession: UserSession = {
                    ...(userRef.current as UserSession),
                    access_token: ok.access_token,
                    refresh_token: ok.refresh_token || currentUser.refresh_token,
                    expires_at: new Date(Date.now() + (ok.expires_in || 1800) * 1000).toISOString()
                  };
                  setUser(newSession);
                  localStorage.setItem('user_session', JSON.stringify(newSession));
                  scheduleAutoLogout(newSession.expires_at);
                  return true;
                }
                return false;
              })
              .finally(() => {
                refreshInFlightRef.current = null;
              });
          }
          await refreshInFlightRef.current;
          return; // avoid firing logout timer below
        } catch (e) {
          console.error('proactive refresh failed', e);
        }
      }
    }, Math.max(0, delay - 2 * 60 * 1000));

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

      let data;
      try {
        data = await response.json();
      } catch {
        // If response is not JSON, try to get text
        const text = await response.text();
        throw new Error(text || 'Login failed');
      }

      if (!response.ok) {
        throw new Error(data?.detail || data?.message || 'Login failed');
      }

      if (data.success) {
        const userSession: UserSession = {
          email: data.user_info.email,
          subscription_key: data.user_info.subscription_key,
          access_token: data.access_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          refresh_token: data.refresh_token
        };

        setUser(userSession);
        localStorage.setItem('user_session', JSON.stringify(userSession));
        scheduleAutoLogout(userSession.expires_at);
        startIdleTracking();
        
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
    clearActivityTimer();
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

  // Keep refs updated
  useEffect(() => {
    logoutRef.current = logout;
    userRef.current = user;
  }, [logout, user]);

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
            startIdleTracking();
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
  // Run once on mount; scheduleAutoLogout is stable via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSubscriptionData]);

  const extendSession = async (): Promise<boolean> => {
    if (!user?.refresh_token) return false;
    try {
      const resp = await fetch('/api/user/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: user.refresh_token })
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (!data?.access_token) return false;
      const newSession: UserSession = {
        ...user,
        access_token: data.access_token,
        refresh_token: data.refresh_token || user.refresh_token,
        expires_at: new Date(Date.now() + (data.expires_in || 1800) * 1000).toISOString()
      };
      setUser(newSession);
      localStorage.setItem('user_session', JSON.stringify(newSession));
      scheduleAutoLogout(newSession.expires_at);
      return true;
    } catch (e) {
      console.error('extendSession failed', e);
      return false;
    }
  };

  // Countdown while the warning is shown
  useEffect(() => {
    if (!showIdleWarning) return;
    setWarningSecondsLeft((s) => (s && s > 0 ? s : 60));
    const id = setInterval(() => {
      setWarningSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [showIdleWarning]);

  const staySignedIn = () => {
    // If expiry is < 2 mins and we have a refresh token, extend immediately
    const current = userRef.current;
    const expMs = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
    const msLeft = expMs - Date.now();
    if (current?.refresh_token && msLeft > 0 && msLeft <= 2 * 60 * 1000) {
      extendSession().catch(() => {});
    }

    // Treat as immediate user activity across all tabs
    try {
      if (!bcRef.current) bcRef.current = new BroadcastChannel('user-activity');
      bcRef.current.postMessage({ type: 'activity', ts: Date.now() });
    } catch { /* noop post */ }

    lastActivityRef.current = Date.now();

    // Reset idle timers and warning just like any other activity would
    clearActivityTimer();
    setShowIdleWarning(false);

    // Schedule idle warning at 14 minutes of inactivity
    idleWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, 14 * 60 * 1000);

    // Schedule auto logout at 15 minutes of inactivity
    activityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 15 * 60 * 1000) {
        logoutRef.current();
      }
    }, 15 * 60 * 1000);
  };

  const forceLogoutForIdle = () => {
    logoutRef.current();
  };

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
    accessToken: user?.access_token || null,
    login,
    logout,
    refreshUserData,
    extendSession,
    isIdleWarningOpen: showIdleWarning,
    warningSecondsLeft,
    staySignedIn,
    forceLogoutForIdle
  };
  
  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};