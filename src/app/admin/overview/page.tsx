'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { FiUsers, FiDollarSign, FiActivity, FiTrendingUp } from 'react-icons/fi';

interface OverviewStats {
  total_subscriptions: number;
  total_cost_usd: number;
  total_requests: number;
  total_tokens: number;
  average_cost_per_subscription: number;
  subscription_days_breakdown: {
    "30": number;
    "90": number;
    "365": number;
  };
  provider_usage: {
    [key: string]: {
      main_usage: number;
      fallback_usage: number;
    };
  };
}

import AdminLayout from '@/components/AdminLayout';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Overview';
  }, []);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getAnalyticsOverview();
      console.log('Overview API response:', response);
      console.log('Response keys:', Object.keys(response));
      console.log('Response.success:', response.success);
      console.log('Response.overview:', response.overview);
      
      // Check if response has overview data
      if (response.success && response.overview) {
        console.log('Using success + overview path');
        setStats(response.overview as unknown as OverviewStats);
      } else if (response.overview) {
        console.log('Using overview only path');
        setStats(response.overview as unknown as OverviewStats);
      } else if ((response as unknown as Record<string, unknown>).total_subscriptions !== undefined) {
        console.log('Using direct stats path');
        setStats(response as unknown as OverviewStats);
      } else {
        console.log('No valid overview data found, using defaults');
        console.log('Available response properties:', Object.keys(response));
        // Create a default stats object when no data is available
        const defaultStats: OverviewStats = {
          total_subscriptions: 0,
          total_cost_usd: 0,
          total_requests: 0,
          total_tokens: 0,
          average_cost_per_subscription: 0,
          subscription_days_breakdown: { "30": 0, "90": 0, "365": 0 },
          provider_usage: {}
        };
        setStats(defaultStats);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch overview statistics');
      }
      console.error('Error fetching overview:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout activeSection="overview">
        <div className="space-y-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-40 rounded skeleton-block" />
            <div className="h-8 w-24 rounded skeleton-block" />
          </div>

          {/* Key Metrics Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="admin-card p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="h-4 w-28 rounded skeleton-block" />
                    <div className="h-8 w-20 rounded skeleton-block" />
                  </div>
                  <div className="h-8 w-8 rounded-full skeleton-block" />
                </div>
              </div>
            ))}
          </div>

          {/* Subscription Duration Breakdown Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-64 rounded skeleton-block mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-8 w-12 mx-auto rounded skeleton-block" />
                  <div className="h-4 w-20 mx-auto rounded skeleton-block" />
                </div>
              ))}
            </div>
          </div>

          {/* Provider Usage Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-40 rounded skeleton-block mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full skeleton-block" />
                    <div className="h-4 w-28 rounded skeleton-block" />
                  </div>
                  <div className="h-4 w-40 rounded skeleton-block" />
                </div>
              ))}
            </div>
          </div>

          {/* System Health Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-36 rounded skeleton-block mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded skeleton-block" />
                  <div className="h-6 w-24 rounded skeleton-block" />
                </div>
              ))}
            </div>
          </div>
        </div>
  
        <style jsx>{`
          @media (max-width: 640px) {
            /* Sleek overview cards for mobile */
            .overview-card-mobile {
              padding: 1rem !important; /* p-4 instead of p-6 */
            }
  
            .overview-card-mobile h3 {
              font-size: 0.85rem !important; /* Smaller card titles */
              font-weight: 500 !important;
            }
  
            .overview-card-mobile .metric-value {
              font-size: 1.5rem !important; /* Smaller metric numbers */
              font-weight: 600 !important;
            }
  
            .overview-card-mobile .metric-label {
              font-size: 0.75rem !important; /* Smaller metric labels */
            }
  
            /* Compact grid spacing */
            .overview-grid-mobile {
              gap: 1rem !important; /* Smaller gaps between cards */
            }
  
            /* Smaller section headings */
            .overview-section-mobile h3 {
              font-size: 1rem !important; /* Smaller section titles */
              font-weight: 600 !important;
              margin-bottom: 0.75rem !important;
            }
  
            /* Compact subscription breakdown */
            .subscription-breakdown-mobile .text-2xl {
              font-size: 1.25rem !important; /* Smaller numbers */
              font-weight: 600 !important;
            }
  
            .subscription-breakdown-mobile .text-sm {
              font-size: 0.7rem !important; /* Smaller labels */
            }
  
            /* Compact provider usage */
            .provider-usage-mobile .font-medium {
              font-size: 0.85rem !important; /* Smaller provider names */
            }
  
            .provider-usage-mobile .text-sm {
              font-size: 0.75rem !important; /* Smaller usage text */
            }
  
            /* Compact system health */
            .system-health-mobile .text-gray-600 {
              font-size: 0.8rem !important; /* Smaller labels */
            }
  
            .system-health-mobile .px-2 {
              padding: 0.25rem 0.5rem !important; /* Smaller status badges */
              font-size: 0.7rem !important;
            }
          }
        `}</style>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeSection="overview">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchOverviewStats}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return (
    <AdminLayout activeSection="overview">
      <div>No data available</div>
    </AdminLayout>
  );

  return (
    <AdminLayout activeSection="overview">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Overview</h1>
        <button 
          onClick={fetchOverviewStats}
          className="admin-button-outline px-4 py-2 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overview-grid-mobile">
        <div className="admin-card p-6 overview-card-mobile">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium metric-label" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Total Subscriptions</h3>
              <p className="text-3xl font-bold mt-2 metric-value" style={{ color: 'var(--foreground)' }}>{stats.total_subscriptions || 0}</p>
            </div>
            <FiUsers className="text-2xl text-gray-400" />
          </div>
        </div>

        <div className="admin-card p-6 overview-card-mobile">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium metric-label" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Total Cost</h3>
              <p className="text-3xl font-bold mt-2 metric-value" style={{ color: 'var(--foreground)' }}>${stats.total_cost_usd?.toFixed(2) || '0.00'}</p>
            </div>
            <FiDollarSign className="text-2xl text-gray-400" />
          </div>
        </div>

        <div className="admin-card p-6 overview-card-mobile">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium metric-label" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Total Requests</h3>
              <p className="text-3xl font-bold mt-2 metric-value" style={{ color: 'var(--foreground)' }}>{stats.total_requests?.toLocaleString() || '0'}</p>
            </div>
            <FiActivity className="text-2xl text-gray-400" />
          </div>
        </div>

        <div className="admin-card p-6 overview-card-mobile">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 metric-label">Avg Cost/Sub</h3>
              <p className="text-3xl font-bold mt-2 metric-value" style={{ color: 'var(--foreground)' }}>${stats.average_cost_per_subscription?.toFixed(2) || '0.00'}</p>
            </div>
            <FiTrendingUp className="text-2xl text-gray-400" />
          </div>
        </div>
      </div>


      {/* Provider Usage */}
      <div className="admin-card p-6 overview-card-mobile">
        <h3 className="text-lg font-semibold mb-4 overview-section-mobile" style={{ color: 'var(--foreground)' }}>Provider Usage</h3>
        <div className="space-y-3 provider-usage-mobile">
          {Object.entries(stats.provider_usage || {}).map(([provider, usage]) => (
            <div key={provider} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }}></div>
                <span className="font-medium capitalize">{provider}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Main: {usage.main_usage || 0} | Fallback: {usage.fallback_usage || 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>
    </AdminLayout>
  );
}