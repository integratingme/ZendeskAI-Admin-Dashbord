'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { apiService } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  adminToken: string | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  // Idle/Warning controls (admin)
  isIdleWarningOpen?: boolean;
  warningSecondsLeft?: number;
  staySignedIn: () => void;
  forceLogoutForIdle: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode a JWT without verifying to extract the exp (in seconds)
function getJwtExpSeconds(token: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad base64 string
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(atob(base64));
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    return exp;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // Idle/Warning state (admin)
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number>(0);

  // Inactivity tracking
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Token expiry UI timers
  const tokenWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh token cache for proactive refresh
  const refreshTokenRef = useRef<string | null>(null);

  // Stable logout ref to avoid stale closures in timers
  const logoutRef = useRef<() => void>(() => {});

  // Auto-logout timer
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Helpers to clear token UI timers
  const clearTokenUiTimers = useCallback(() => {
    if (tokenWarningTimerRef.current) {
      clearTimeout(tokenWarningTimerRef.current);
      tokenWarningTimerRef.current = null;
    }
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  }, []);

  // Helpers to clear inactivity timers
  const clearActivityTimers = useCallback(() => {
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }
    setShowIdleWarning(false);
    setWarningSecondsLeft(0);
  }, []);

  const doLogout = useCallback(() => {
    setAdminToken(null);
    setIsAuthenticated(false);
    clearLogoutTimer();
    clearTokenUiTimers();
    clearActivityTimers();
    apiService.clearAdminToken();
  }, [clearLogoutTimer, clearTokenUiTimers, clearActivityTimers]);

  const scheduleAutoLogoutFromToken = useCallback((access: string | null, expiresIn?: number) => {
    clearLogoutTimer();
    clearTokenUiTimers();
    if (!access) return;
    const expSec = getJwtExpSeconds(access);
    const nowMs = Date.now();
    let delayMs: number | null = null;
    if (typeof expSec === 'number') {
      delayMs = expSec * 1000 - nowMs - 5000; // schedule 5s early
    } else if (typeof expiresIn === 'number') {
      delayMs = expiresIn * 1000 - 5000;
    }
    if (delayMs === null || delayMs <= 0) {
      doLogout();
      return;
    }

    // Token expiry warning 60s before expiry
    const warningDelay = Math.max(0, delayMs - 60 * 1000);
    tokenWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, warningDelay);

    // Proactive refresh 2 minutes before expiry if active
    const refreshDelay = Math.max(0, delayMs - 2 * 60 * 1000);
    tokenRefreshTimerRef.current = setTimeout(async () => {
      const active = Date.now() - lastActivityRef.current < 15 * 60 * 1000;
      if (active && refreshTokenRef.current) {
        try {
          await apiService.refreshAdminTokens();
        } catch (err) {
          if (typeof console !== 'undefined' && console.debug) console.debug('admin token proactive refresh failed', err);
        }
      }
    }, refreshDelay);

    logoutTimerRef.current = setTimeout(() => {
      doLogout();
    }, delayMs);
  }, [clearLogoutTimer, clearTokenUiTimers, doLogout]);

  useEffect(() => {
    // Wire token change notifications to schedule auto-logout and cache refresh token
    apiService.onAdminTokensChanged = (access, refresh, meta) => {
      refreshTokenRef.current = refresh || null;
      if (access && refresh) {
        scheduleAutoLogoutFromToken(access, meta?.expires_in);
      } else {
        clearLogoutTimer();
        clearTokenUiTimers();
      }
    };
    return () => {
      apiService.onAdminTokensChanged = undefined;
      clearLogoutTimer();
      clearTokenUiTimers();
    };
  }, [clearLogoutTimer, clearTokenUiTimers, scheduleAutoLogoutFromToken]);

  const checkAuthStatus = async () => {
    try {
      const access = sessionStorage.getItem('admin_access_token');
      const refresh = sessionStorage.getItem('admin_refresh_token');
      if (access && refresh) {
        setAdminToken(access);

        setIsAuthenticated(true);
        apiService.setAdminTokens(access, refresh);
        scheduleAutoLogoutFromToken(access);
        // Start inactivity tracking once authenticated
        startIdleTracking();
      } else {
        sessionStorage.removeItem('admin_access_token');
        sessionStorage.removeItem('admin_refresh_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is already logged in on app start
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (rawToken: string): Promise<boolean> => {
    try {
      const { access_token, refresh_token, expires_in } = await apiService.adminLogin(rawToken);
      setAdminToken(access_token);

      setIsAuthenticated(true);
      apiService.setAdminTokens(access_token, refresh_token);
      scheduleAutoLogoutFromToken(access_token, expires_in);
      // Start inactivity tracking on login
      startIdleTracking();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    doLogout();
  };

  // Start inactivity tracking and listeners
  const startIdleTracking = useCallback(() => {
    // Clear existing timers
    clearActivityTimers();

    // Broadcast activity helper
    const broadcastActivity = () => {
      try {
        if (!bcRef.current) bcRef.current = new BroadcastChannel('admin-activity');
        bcRef.current.postMessage({ type: 'activity', ts: Date.now() });
      } catch {
        // BroadcastChannel may not be supported in all environments
      }
    };

    const reset = () => {
      broadcastActivity();
      lastActivityRef.current = Date.now();
      clearActivityTimers();
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

    // Initial schedule
    idleWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, 14 * 60 * 1000);
    activityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 15 * 60 * 1000) {
        logoutRef.current();
      }
    }, 15 * 60 * 1000);

    // Attach activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];
    events.forEach(evt => window.addEventListener(evt, reset, { passive: true } as EventListenerOptions));

    // Cross-tab activity
    try {
      if (!bcRef.current) bcRef.current = new BroadcastChannel('admin-activity');
      bcRef.current.onmessage = (evt) => {
        if (evt?.data?.type === 'activity') {
          lastActivityRef.current = Date.now();
          clearActivityTimers();
          activityTimerRef.current = setTimeout(() => {
            const now = Date.now();
            if (now - lastActivityRef.current >= 15 * 60 * 1000) {
              logoutRef.current();
            }
          }, 15 * 60 * 1000);
        }
      };
    } catch {
      // BroadcastChannel may not be supported in all environments
    }

    return () => {
      clearActivityTimers();
      events.forEach(evt => window.removeEventListener(evt, reset));
      try { bcRef.current?.close?.(); } catch {
        // BroadcastChannel close may fail in some environments
      }
    };
  }, [clearActivityTimers]);

  // Countdown tick while warning is shown
  useEffect(() => {
    if (!showIdleWarning) return;
    setWarningSecondsLeft((s) => (s && s > 0 ? s : 60));
    const id = setInterval(() => {
      setWarningSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [showIdleWarning]);

  const staySignedIn = useCallback(() => {
    // If token is near expiry (<= 2 min) and we have refresh, proactively refresh
    const msUntilLogoutFromToken = (() => {
      const expSec = getJwtExpSeconds(adminToken);
      if (!expSec) return 0;
      return expSec * 1000 - Date.now();
    })();
    if (refreshTokenRef.current && msUntilLogoutFromToken > 0 && msUntilLogoutFromToken <= 2 * 60 * 1000) {
      apiService.refreshAdminTokens().catch(() => {});
    }

    // Treat as immediate activity
    try {
      if (!bcRef.current) bcRef.current = new BroadcastChannel('admin-activity');
      bcRef.current.postMessage({ type: 'activity', ts: Date.now() });
    } catch {
      // BroadcastChannel may not be supported in all environments
    }

    lastActivityRef.current = Date.now();

    // Reset idle timers and warning
    clearActivityTimers();
    setShowIdleWarning(false);

    // Re-schedule idle warning and auto logout windows
    idleWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setWarningSecondsLeft(60);
    }, 14 * 60 * 1000);

    activityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 15 * 60 * 1000) {
        logoutRef.current();
      }
    }, 15 * 60 * 1000);
  }, [adminToken, clearActivityTimers]);

  const forceLogoutForIdle = useCallback(() => {
    logoutRef.current();
  }, []);


  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      adminToken,
      login,
      logout,
      loading,
      isIdleWarningOpen: showIdleWarning,
      warningSecondsLeft,
      staySignedIn,
      forceLogoutForIdle,
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
