'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { CiWarning } from 'react-icons/ci';
import { MdOutlineContentCopy } from 'react-icons/md';
import { apiService, ApiError } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AdminToken {
  token_id: string;
  token_preview: string;
  created_at: string;
  created_by: string;
  last_used: string | null;
  description: string;
  is_active: boolean;
  is_current_token?: boolean;
}

interface TokensData {
  count: number;
  max_allowed: number;
  tokens: {[key: string]: AdminToken};
}

import AdminLayout from '@/components/AdminLayout';

export default function AdminTokensPage() {
  const { theme } = useTheme();
  const [tokensData, setTokensData] = useState<TokensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenDescription, setNewTokenDescription] = useState('');
  const [createdBy, setCreatedBy] = useState('admin');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    tokenId: string;
    tokenDescription: string;
    isCurrentToken?: boolean;
  }>({ isOpen: false, tokenId: '', tokenDescription: '' });
  
  const toast = useToastContext();
  const { logout } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Tokens';
  }, []);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.listAdminTokens();
      if (response.success) {
        setTokensData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch tokens');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch admin tokens');
      }
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!newTokenDescription.trim()) {
      toast.warning('Description Required', 'Please enter a description for the token');
      return;
    }

    setCreating(true);
    try {
      const response = await apiService.generateAdminToken(newTokenDescription, createdBy);
      if (response.success) {
        setNewToken(response.token);
        
        // Reset form
        setNewTokenDescription('');
        setCreatedBy('admin');
        
        // Refresh tokens list
        await fetchTokens();
        
        toast.success('Token Created', 'New admin token has been generated successfully');
      } else {
        throw new Error(response.message || 'Failed to create token');
      }
    } catch (err) {
      console.error('Error creating token:', err);
      if (err instanceof ApiError) {
        toast.error('Failed to Create Token', err.message);
      } else {
        toast.error('Failed to Create Token', 'An unexpected error occurred');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeClick = (tokenId: string, description: string) => {
    // Check if this is the current user's token using the backend-provided flag
    const isCurrentToken = tokensData?.tokens[tokenId]?.is_current_token || false;

    setConfirmDialog({
      isOpen: true,
      tokenId,
      tokenDescription: description,
      isCurrentToken
    });
  };

  const confirmRevoke = async () => {
    const { tokenId, isCurrentToken } = confirmDialog;
    setConfirmDialog({ isOpen: false, tokenId: '', tokenDescription: '' });

    try {
      const response = await apiService.revokeAdminToken(tokenId);
      if (response.success) {
        if (isCurrentToken) {
          // If user deleted their own token, log them out
          toast.success('Token Revoked', 'You have been logged out because you deleted your authentication token');
          logout(); // This will redirect to login page
        } else {
          // Normal token deletion
          await fetchTokens();
          toast.success('Token Revoked', 'Admin token has been successfully revoked');
        }
      } else {
        throw new Error(response.message || 'Failed to revoke token');
      }
    } catch (err) {
      console.error('Error revoking token:', err);
      if (err instanceof ApiError) {
        toast.error('Failed to Revoke Token', err.message);
      } else {
        toast.error('Failed to Revoke Token', 'An unexpected error occurred');
      }
    }
  };

  const cancelRevoke = () => {
    setConfirmDialog({ isOpen: false, tokenId: '', tokenDescription: '', isCurrentToken: false });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <AdminLayout activeSection="tokens">
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded skeleton-block" />
          <div className="flex gap-3">
            <div className="h-10 w-20 rounded-lg skeleton-block" />
            <div className="h-10 w-28 rounded-lg skeleton-block" />
          </div>
        </div>

        {/* Token limit info skeleton */}
        <div className="admin-card p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded skeleton-block" />
            <div className="w-32 h-2 rounded-full skeleton-block" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" style={{ background: 'var(--card-bg)' }}>
                {[...Array(3)].map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="h-4 w-20 rounded skeleton-block" />
                        <div className="h-3 w-32 rounded skeleton-block" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded skeleton-block" />
                        <div className="h-3 w-16 rounded skeleton-block" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-32 rounded skeleton-block" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-24 rounded skeleton-block" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 rounded skeleton-block" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-12 rounded skeleton-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeSection="tokens">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Tokens</h1>
          <button 
            onClick={fetchTokens}
            className="admin-button-outline px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchTokens}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="tokens">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Tokens</h1>
        <div className="flex gap-3">
          <button 
            onClick={fetchTokens}
            className="admin-button-outline px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            disabled={Boolean(tokensData && tokensData.count >= tokensData.max_allowed)}
            className="admin-button px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Create Token
          </button>
        </div>
      </div>

      {/* Token Limit Info */}
      {tokensData && (
        <div className="admin-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              Tokens: {tokensData.count} / {tokensData.max_allowed}
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full" 
                style={{ width: `${(tokensData.count / tokensData.max_allowed) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      {tokensData && Object.keys(tokensData.tokens).length > 0 ? (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" style={{ background: 'var(--card-bg)' }}>
                {Object.entries(tokensData.tokens).map(([tokenId, token]) => (
                  <tr key={tokenId} className="hover:bg-gray-50" 
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        const cells = e.currentTarget.querySelectorAll('td, th');
                        cells.forEach(cell => {
                          (cell as HTMLElement).style.color = 'var(--foreground)';
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const cells = e.currentTarget.querySelectorAll('td, th');
                        cells.forEach(cell => {
                          (cell as HTMLElement).style.color = 'var(--foreground)';
                        });
                      }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tokenId}</div>
                        <div className="text-sm text-gray-500 font-mono">{token.token_preview}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{token.description}</div>
                      <div className="text-sm text-gray-500">by {token.created_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(token.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(token.last_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium" style={{ color: theme === 'dark' ? 'var(--accent)' : '#000000' }}>
                        {token.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleRevokeClick(tokenId, token.description)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <p className="text-gray-500 mb-4">No admin tokens found</p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="admin-button px-6 py-2 rounded-lg"
          >
            Create First Token
          </button>
        </div>
      )}

      {/* Create Token Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-md" style={{ background: 'var(--card-bg)' }}>
            <h2 className="text-lg font-semibold mb-4">Create Admin Token</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description:
                </label>
                <input
                  type="text"
                  value={newTokenDescription}
                  onChange={(e) => setNewTokenDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Frontend development token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created By:
                </label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="admin"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setNewToken(null);
                }}
                className="admin-button-outline px-4 py-2 rounded-lg flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={createToken}
                disabled={creating}
                className="admin-button px-4 py-2 rounded-lg flex-1 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Token Display */}
      {newToken && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-md" style={{ background: 'var(--card-bg)' }}>
            <h2 className="text-lg font-semibold mb-4">Token Created Successfully</h2>
            <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Your new admin token:</p>
                <button
                  onClick={() => {
                    if (!newToken) return;
                    navigator.clipboard.writeText(newToken);
                    toast.success('Copied!', 'Token has been copied to clipboard');
                  }}
                  className="inline-flex items-center p-1"
                  style={{ color: 'var(--foreground)', background: 'transparent' }}
                  aria-label="Copy token"
                  title="Copy token"
                >
                  <MdOutlineContentCopy />
                </button>
              </div>
              <code className="block w-full p-3 rounded-lg border text-sm font-mono break-all select-all" style={{ background: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
                {newToken}
              </code>
            </div>
            <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
              <CiWarning className="text-xl" />
              <span>Save this token now. You won&apos;t be able to see it again!</span>
            </div>
            <button 
              onClick={() => { setNewToken(null); setShowCreateForm(false); }}
              className="admin-button px-4 py-2 rounded-lg w-full"
            >
              I&apos;ve Saved It
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Revoke Admin Token"
        message={
          confirmDialog.isCurrentToken
            ? `⚠️ WARNING: You are about to revoke the token "${confirmDialog.tokenDescription}" which appears to be your current authentication token. This will immediately log you out of the admin dashboard. Are you sure you want to continue?`
            : `Are you sure you want to revoke the token "${confirmDialog.tokenDescription}"? This action cannot be undone and will immediately disable access for this token.`
        }
        confirmText={confirmDialog.isCurrentToken ? "Revoke & Logout" : "Revoke Token"}
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmRevoke}
        onCancel={cancelRevoke}
      />
    </div>
    </AdminLayout>
  );
}