'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiUser, FiSettings, FiActivity, FiClock, FiCheckCircle, FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import UserLayout from '@/components/UserLayout';

export default function UserOverview() {
  const { user, subscription, refreshUserData } = useUserAuth();
  const [features, setFeatures] = useState<{ enabled_count?: number; total_count?: number } | null>(null);

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'User Dashboard - Overview';
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!user?.access_token) return;

    try {
      // Start heavy data fetch in background; do NOT block initial render

      // Kick off both in parallel, but we don't need to await them before initial render
      const featuresPromise = userApiService.getFeatures(user.access_token).then((resp) => {
        if (resp?.success) setFeatures(resp);
      }).catch(() => {});

      const refreshPromise = refreshUserData().catch(() => {});

      // Wait for both to finish to flip heavyLoading
      await Promise.all([featuresPromise, refreshPromise]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      // Heavy loading complete
    }
  }, [user, refreshUserData]);
 
  useEffect(() => {
    // Load in background after first paint
    loadDashboardData();
  }, [loadDashboardData]);

  const getUsagePercentage = () => {
    if (!subscription?.limits) return 0;
    const { current_usage, request_limit } = subscription.limits;
    if (request_limit <= 0) return 0;
    return Math.min((current_usage / request_limit) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return '#ef4444'; // red
    if (percentage >= 70) return '#f59e0b'; // amber
    return 'var(--accent)'; // green
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <UserLayout activeSection="overview">
      <div className="space-y-6">
      {/* Welcome Header */}
      <div className="user-card p-6">
        <div className="flex items-center space-x-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <FiUser className="text-2xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Welcome back!
            </h1>
            <p className="text-lg" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              {user?.email}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Subscription: {subscription?.tier || 'Standard'}
            </p>
          </div>
        </div>
      </div>


      {/* Subscription Details */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Subscription Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Email:</span>
                <span style={{ color: 'var(--foreground)' }}>{subscription?.email}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Subdomain:</span>
                <span style={{ color: 'var(--foreground)' }}>{subscription?.subdomain}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Subscription Key:</span>
                <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                  {user?.subscription_key?.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Subscription Dates</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Created:</span>
                <span style={{ color: 'var(--foreground)' }}>{formatDate(subscription?.dates?.created_at || '')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Start Date:</span>
                <span style={{ color: 'var(--foreground)' }}>{formatDate(subscription?.dates?.start_date || '')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>End Date:</span>
                <span style={{ color: 'var(--foreground)' }}>{formatDate(subscription?.dates?.end_date || '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* More details one-way trigger */}
      {!detailsExpanded && (
        <button
          type="button"
          onClick={() => setDetailsExpanded(true)}
          className="user-card p-4 w-full flex items-center justify-between hover:opacity-90 transition"
        >
          <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            More details
          </span>
          <FiChevronRight className="text-lg" style={{ color: 'var(--foreground)', opacity: 0.8 }} />
        </button>
      )}

      {/* Stats Grid (shown once expanded, cannot hide) */}
      {detailsExpanded && (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-300"
      >
        {/* Usage Stats */}
        <div className="user-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                API Usage
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {subscription?.limits?.current_usage || 0}
              </p>
            </div>
            <FiActivity className="text-2xl" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${getUsagePercentage()}%`,
                backgroundColor: getUsageColor()
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {(subscription?.limits?.request_limit || 0) > 0 
              ? `${subscription?.limits?.current_usage || 0} / ${subscription?.limits?.request_limit} requests`
              : 'Unlimited usage'
            }
          </p>
        </div>

        {/* Active Features */}
        <div className="user-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                Active Features
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {features?.enabled_count || 0}
              </p>
            </div>
            <FiSettings className="text-2xl" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {features?.total_count || 0} total features available
          </p>
        </div>

        {/* Subscription Status */}
        <div className="user-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                Status
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {subscription?.status === 'active' ? 'Active' : 'Inactive'}
              </p>
            </div>
            {subscription?.status === 'active' ? (
              <FiCheckCircle className="text-2xl text-green-500" />
            ) : (
              <FiAlertCircle className="text-2xl text-red-500" />
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Tier: {subscription?.tier || 'Standard'}
          </p>
        </div>

        {/* Expiry Date */}
        <div className="user-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                Expires
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {formatDate(subscription?.dates?.expires_at || '')}
              </p>
            </div>
            <FiClock className="text-2xl" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Subscription expiry date
          </p>
        </div>
      </div>

      )}

      </div>
    </UserLayout>
  );
}