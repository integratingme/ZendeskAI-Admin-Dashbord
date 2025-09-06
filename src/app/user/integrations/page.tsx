'use client';

import UserLayout from '@/components/UserLayout';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import { useToastContext } from '@/contexts/ToastContext';
import { useCallback, useEffect, useState } from 'react';

interface IntegrationStatus {
  success: boolean;
  zendesk_configured: boolean;
  confluence_configured: boolean;
  message: string;
}

const isValidEmail = (email: string) => {
  const e = email.trim();
  if (!e) return false;
  // Basic email pattern: some@domain.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};

export default function UserIntegrationsPage() {
  const { accessToken } = useUserAuth();
  const toast = useToastContext();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showZendeskModal, setShowZendeskModal] = useState(false);
  const [showConfluenceModal, setShowConfluenceModal] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'User Dashboard - Integrations';
  }, []);

  // Zendesk modal state
  const [zdEmail, setZdEmail] = useState('');
  const [zdSubdomain, setZdSubdomain] = useState('');
  const [zdToken, setZdToken] = useState('');
  const [savingZd, setSavingZd] = useState(false);
  const zdEmailValid = isValidEmail(zdEmail);
  const canSaveZd = zdEmailValid && zdSubdomain.trim().length > 0 && zdToken.trim().length > 0;

  // Confluence modal state
  const [cfBaseUrl, setCfBaseUrl] = useState('');
  const [cfUsername, setCfUsername] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [savingCf, setSavingCf] = useState(false);
  const cfUsernameValid = isValidEmail(cfUsername);
  const canSaveCf = cfBaseUrl.trim().length > 0 && cfUsernameValid && cfToken.trim().length > 0;

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await userApiService.getIntegrationStatus(accessToken);
      setStatus(data as IntegrationStatus);
      setError(null);
    } catch (e: unknown) {
      console.error('Integration status error', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { if (accessToken) { fetchStatus(); } }, [accessToken, fetchStatus]);

  const saveZendesk = async () => {
    console.log('saveZendesk clicked', { hasToken: !!accessToken, canSaveZd, zdEmail, zdSubdomain });
    if (!accessToken || !canSaveZd) return;
    try {
      setSavingZd(true);
      await userApiService.saveUserZendeskCreds(accessToken, { zendesk_email: zdEmail.trim(), zendesk_api_token: zdToken.trim(), zendesk_subdomain: zdSubdomain.trim() || undefined });
      setShowZendeskModal(false);
      setZdEmail(''); setZdSubdomain(''); setZdToken('');
      await fetchStatus();
      toast.success('Zendesk connected', 'Your Zendesk credentials were saved successfully.');
    } catch (e: unknown) {
      toast.error('Failed to save Zendesk credentials', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingZd(false);
    }
  };

  const saveConfluence = async () => {
    console.log('saveConfluence clicked', { hasToken: !!accessToken, canSaveCf, cfBaseUrl, cfUsername });
    if (!accessToken || !canSaveCf) return;
    try {
      setSavingCf(true);
      await userApiService.saveUserConfluenceCreds(accessToken, { confluence_base_url: cfBaseUrl.trim(), confluence_username: cfUsername.trim(), confluence_api_token: cfToken.trim() });
      setShowConfluenceModal(false);
      setCfBaseUrl(''); setCfUsername(''); setCfToken('');
      await fetchStatus();
      toast.success('Confluence connected', 'Your Confluence credentials were saved successfully.');
    } catch (e: unknown) {
      toast.error('Failed to save Confluence credentials', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingCf(false);
    }
  };

  return (
    <UserLayout activeSection="integrations">
      <div className="w-full mx-auto">
        {error ? (
          <div style={{ color: '#ef4444' }}>{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zendesk Card */}
            <div className="p-6 rounded-xl border flex flex-col justify-between min-h-[200px]" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Zendesk</h2>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Connect your Zendesk account (Required)</p>
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-5 w-16 rounded" style={{ background: 'var(--hover-bg)' }} />
                    </div>
                  ) : (
                    status?.zendesk_configured && (
                      <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent)', color: 'white' }}>Connected</span>
                    )
                  )}
                </div>
              </div>
              <div className="flex">
                <button
                  onClick={() => setShowZendeskModal(true)}
                  className="px-4 py-2 rounded-lg"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : (status?.zendesk_configured ? 'Update' : 'Connect')}
                </button>
              </div>
            </div>

            {/* Confluence Card */}
            <div className="p-6 rounded-xl border flex flex-col justify-between min-h-[200px]" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Confluence</h2>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Connect your Confluence (optional)</p>
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-5 w-16 rounded" style={{ background: 'var(--hover-bg)' }} />
                    </div>
                  ) : (
                    status?.confluence_configured && (
                      <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent)', color: 'white' }}>Connected</span>
                    )
                  )}
                </div>
              </div>
              <div className="flex">
                <button
                  onClick={() => setShowConfluenceModal(true)}
                  className="px-4 py-2 rounded-lg"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : (status?.confluence_configured ? 'Update' : 'Connect')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zendesk Modal */}
      {showZendeskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Connect Zendesk</h3>

            {/* Zendesk Single-Step Form */}
            <div className="space-y-4 w-full">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Zendesk Email</label>
              <input
               type="email"
               value={zdEmail}
               onChange={(e) => setZdEmail(e.target.value)}
               className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base"
               style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
               placeholder="agent@example.com"
               aria-invalid={!zdEmailValid}
             />
             {!zdEmailValid && zdEmail.trim().length > 0 && (
               <p className="text-xs" style={{ color: '#ef4444' }}>Please enter a valid email address.</p>
             )}
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Zendesk Subdomain</label>
              <input
                type="text"
                value={zdSubdomain}
                onChange={(e) => setZdSubdomain(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                placeholder="your-company"
              />
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Zendesk API Token</label>
              <input
                type="password"
                value={zdToken}
                onChange={(e) => setZdToken(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                placeholder="Enter API Token"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-6">
                <button onClick={() => setShowZendeskModal(false)} className="px-4 py-2 rounded-lg border text-sm sm:text-base" style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}>Cancel</button>
                {canSaveZd && (
                  <button disabled={savingZd} onClick={saveZendesk} className="px-4 py-2 rounded-lg text-sm sm:text-base" style={{ background: 'var(--accent)', color: 'white' }}>{savingZd ? 'Saving...' : 'Save'}</button>
                )}
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Confluence Modal */}
      {showConfluenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Connect Confluence (Optional)</h3>
            <div className="space-y-4">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Confluence Base URL</label>
              <input type="text" value={cfBaseUrl} onChange={(e)=>setCfBaseUrl(e.target.value)} className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }} placeholder="https://your-site.atlassian.net/wiki" />
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Confluence Email</label>
              <input type="email" value={cfUsername} onChange={(e)=>setCfUsername(e.target.value)} className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }} placeholder="you@example.com" aria-invalid={!cfUsernameValid} />
              {!cfUsernameValid && cfUsername.trim().length > 0 && (
                <p className="text-xs" style={{ color: '#ef4444' }}>Please enter a valid email address.</p>
              )}
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Confluence API Token</label>
              <input type="password" value={cfToken} onChange={(e)=>setCfToken(e.target.value)} className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border text-sm sm:text-base" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }} placeholder="Enter API Token" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-6">
                <button onClick={() => setShowConfluenceModal(false)} className="px-4 py-2 rounded-lg border text-sm sm:text-base" style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}>Cancel</button>
                {canSaveCf && (
                  <button disabled={savingCf} onClick={saveConfluence} className="px-4 py-2 rounded-lg text-sm sm:text-base" style={{ background: 'var(--accent)', color: 'white' }}>{savingCf ? 'Saving...' : 'Save'}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .active-step { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .inactive-step { opacity: 0.8; }
      `}</style>
    </UserLayout>
  );
}
