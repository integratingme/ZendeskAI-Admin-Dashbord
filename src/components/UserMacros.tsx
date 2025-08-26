'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function UserMacros() {
  const { user, isAuthenticated } = useUserAuth();
  const token = user?.access_token;
  
  // Debug logging
  console.log('UserMacros - User:', user);
  console.log('UserMacros - Token:', token);
  console.log('UserMacros - IsAuthenticated:', isAuthenticated);
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [status, setStatus] = useState<{count: number; last_synced_at: string | null} | null>(null);
  const [loading, setLoading] = useState(false);
  // removed local message display - using toasts instead

  const headers = useMemo(() => 
    token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined,
    [token]
  );
  // Toasts
  const { success, error: errorToast } = useToastContext();

  // Disable Sync until all credentials are provided
  const isSyncDisabled = loading || !subdomain.trim() || !email.trim() || !apiToken.trim();

  // Show/Hide Zendesk API Token
  const [showApiToken, setShowApiToken] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token || !headers) return;
    try {
      const res = await fetch('/api/user/macros/status', { headers });
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, [token, headers]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const syncMacros = async () => {
    if (!token || !headers) return;
    setLoading(true);
    // removed local message reset; using toasts
    try {
      const res = await fetch('/api/user/macros/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ zendesk_subdomain: subdomain, zendesk_email: email, zendesk_api_token: apiToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Sync failed');
      const friendly = new Date(data.last_synced_at).toLocaleString();
      // using toast instead of inline message
      success('Macros synced', `Inserted ${data.inserted}. Last synced ${friendly}`);
      fetchStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      errorToast('Sync failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteMacros = async () => {
    if (!token || !headers) return;
    setLoading(true);
    // removed local message reset; using toasts
    try {
      const res = await fetch('/api/user/macros', { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');
      // using toast instead of inline message
      success('Macros removed', 'Cached macros deleted for this subscription');
      fetchStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      errorToast('Delete failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

    // Show loading or authentication error
    if (!isAuthenticated || !token) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Sync and manage your Zendesk macros</h1>
          </div>
          <p className="text-sm text-red-600">Authentication required. Please log in to access macros.</p>
        </div>
      );
    }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Sync and manage your Zendesk macros</h1>
      </div>

      <div className="p-6 rounded-lg space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)' }}>Zendesk Subdomain</label>
            <input className="w-full p-2 rounded border" style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }} value={subdomain} onChange={e => setSubdomain(e.target.value)} placeholder="your-subdomain" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)' }}>Zendesk Email</label>
            <input className="w-full p-2 rounded border" style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@company.com" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)' }}>Zendesk API Token</label>
            <div className="relative">
              <input
                type={showApiToken ? 'text' : 'password'}
                className="w-full p-2 pr-12 rounded border"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="****"
              />
              <button
                type="button"
                onClick={() => setShowApiToken(v => !v)}
                className="absolute inset-y-0 right-2 flex items-center p-2 rounded"
                style={{ background: 'transparent', color: 'var(--foreground)' }}
                aria-label={showApiToken ? 'Hide API token' : 'Show API token'}
                title={showApiToken ? 'Hide API token' : 'Show API token'}
              >
                {showApiToken ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncMacros}
            disabled={isSyncDisabled}
            className="px-4 py-2 rounded"
            style={{
              background: 'var(--accent)',
              color: 'white',
              opacity: isSyncDisabled ? 0.6 : 1,
              cursor: isSyncDisabled ? 'not-allowed' : 'pointer'
            }}
            title={isSyncDisabled ? 'Enter Zendesk Subdomain, Email, and API Token to enable' : undefined}
          >
            {loading ? 'Syncing...' : 'Download / Sync Macros'}
          </button>
          <button onClick={deleteMacros} disabled={loading} className="px-4 py-2 rounded" style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            Remove Macros
          </button>
          {/* inline status removed in favor of toasts */}
        </div>
      </div>

      <div className="p-6 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Status</h3>
        <div className="mt-2 text-sm" style={{ color: 'var(--foreground)' }}>
          <div>Total cached macros: {status?.count ?? 0}</div>
          <div>Last synced: {status?.last_synced_at ? new Date(status.last_synced_at).toLocaleString() : 'Never'}</div>
        </div>
        <div className="mt-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
          Note: We do not store your Zendesk credentials. They are used only at the time of syncing macros.
        </div>
      </div>
    </div>
  );
}
