'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import UserLayout from '@/components/UserLayout';

export default function UserMacros() {
  const { user, isAuthenticated } = useUserAuth();
  const token = user?.access_token;

  const [status, setStatus] = useState<{ count: number; last_synced_at: string | null } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'User Dashboard - Macros';
  }, []);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined),
    [token]
  );

  const { success, error: errorToast } = useToastContext();

  const fetchStatus = useCallback(async () => {
    if (!token || !headers) return;
    try {
      setStatusLoading(true);
      const res = await fetch('/api/user/macros/status', { headers });
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setStatusLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const syncMacros = async () => {
    if (!token || !headers) return;
    setSyncLoading(true);
    try {
      const res = await fetch('/api/user/macros/sync', {
        method: 'POST',
        headers,
      });
      if (res.status === 202 || res.ok) {
        const ctype = res.headers.get('content-type') || '';
        let jobId: string | undefined;
        if (ctype.includes('application/json')) {
          const data = await res.json();
          jobId = data.job_id;
        }
        success('Sync Initiated', 'We will notify you when it finishes.');
        // Poll for completion
        const start = Date.now();
        const deadlineMs = 2 * 60 * 1000; // 2 minutes
        const intervalMs = 5000;
        let done = false;
        if (jobId) {
          while (Date.now() - start < deadlineMs) {
            await new Promise((r) => setTimeout(r, intervalMs));
            try {
              const jr = await fetch(`/api/user/macros/jobs/${jobId}`, { headers });
              if (jr.ok) {
                const jd = await jr.json();
                if (jd.status === 'succeeded') {
                  done = true;
                  break;
                }
                if (jd.status === 'failed') {
                  errorToast('Sync failed', jd.last_error || 'Macro sync failed');
                  break;
                }
              }
            } catch {
              /* ignore job polling errors */
            }
          }
        } else {
          const initial = status;
          while (Date.now() - start < deadlineMs) {
            await new Promise((r) => setTimeout(r, intervalMs));
            try {
              await fetchStatus();
            } catch {
              /* ignore status polling errors */
            }
            const hasChanged = initial?.count !== status?.count || initial?.last_synced_at !== status?.last_synced_at;
            if (hasChanged) {
              done = true;
              break;
            }
          }
        }
        if (done) {
          await fetchStatus();
          success('Macros synced', 'Your macro cache has been updated.');
        } else {
          success('Sync in progress', 'You can continue using the app; check status later.');
        }
        return;
      }
      // Non-OK and not 202
      let message = 'Sync failed';
      const ctype = res.headers.get('content-type') || '';
      if (ctype.includes('application/json')) {
        try {
          const data = await res.json();
          message = data.detail || data.message || message;
        } catch {
          message = 'Failed to parse error response';
        }
      } else {
        try {
          const text = await res.text();
          message = text || message;
        } catch {
          message = 'Failed to read error response';
        }
      }
      errorToast('Sync failed', message);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      errorToast('Sync failed', errorMessage);
    } finally {
      setSyncLoading(false);
    }
  };

  const deleteMacros = async () => {
    if (!token || !headers) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/user/macros', { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');
      success('Macros removed', 'Cached macros deleted for this subscription');
      fetchStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      errorToast('Delete failed', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Show loading or authentication error
  if (!isAuthenticated || !token) {
    return (
      <UserLayout activeSection="macros">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Sync and manage your Zendesk macros
            </h1>
          </div>
          <p className="text-sm text-red-600">Authentication required. Please log in to access macros.</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeSection="macros">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Sync and manage your Zendesk macros
          </h1>
        </div>

        <div className="p-6 rounded-lg space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={syncMacros}
              disabled={syncLoading || deleteLoading}
              className="px-4 py-2 rounded"
              style={{
                background: 'var(--accent)',
                color: 'white',
                opacity: (syncLoading || deleteLoading) ? 0.6 : 1,
                cursor: (syncLoading || deleteLoading) ? 'not-allowed' : 'pointer',
              }}
            >
              {syncLoading ? 'Syncing...' : 'Sync Macros'}
            </button>
            <button
              onClick={deleteMacros}
              disabled={syncLoading || deleteLoading || !status?.count || status?.count === 0}
              className="px-4 py-2 rounded"
              style={{
                background: 'transparent',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                opacity: (syncLoading || deleteLoading || !status?.count || status?.count === 0) ? 0.6 : 1,
                cursor: (syncLoading || deleteLoading || !status?.count || status?.count === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {deleteLoading ? 'Removing...' : 'Remove Macros'}
            </button>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Status
          </h3>
          <div className="mt-2 text-sm" style={{ color: 'var(--foreground)' }}>
            {statusLoading ? (
              <div className="flex items-center gap-2" style={{ opacity: 0.8 }}>
                <div
                  className="animate-spin rounded-full h-4 w-4 border-2"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                ></div>
                <span>Refreshing status...</span>
              </div>
            ) : (
              <>
                <div>Total cached macros: {status?.count ?? 0}</div>
                <div>Last synced: {status?.last_synced_at ? new Date(status.last_synced_at).toLocaleString() : 'Never'}</div>
              </>
            )}
          </div>
          <div className="mt-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            Your Zendesk credentials are stored encrypted. Do not Sync/ Remove Macros more than once in 24 hours.
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
