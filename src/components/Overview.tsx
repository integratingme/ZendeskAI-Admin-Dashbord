'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { FiUsers, FiDollarSign, FiActivity, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';

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

export default function Overview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getAnalyticsOverview();
      if (response.success) {
        setStats(response.overview);
      } else {
        throw new Error(response.message || 'Failed to fetch overview');
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading overview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchOverviewStats}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Overview</h1>
        <button 
          onClick={fetchOverviewStats}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <FiRefreshCw className="text-sm" />
          Refresh
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Subscriptions</h3>
              <p className="text-3xl font-bold text-black mt-2">{stats.total_subscriptions}</p>
            </div>
            <FiUsers className="text-2xl text-gray-400" />
          </div>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
              <p className="text-3xl font-bold text-black mt-2">${stats.total_cost_usd.toFixed(2)}</p>
            </div>
            <FiDollarSign className="text-2xl text-gray-400" />
          </div>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Requests</h3>
              <p className="text-3xl font-bold text-black mt-2">{stats.total_requests.toLocaleString()}</p>
            </div>
            <FiActivity className="text-2xl text-gray-400" />
          </div>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Avg Cost/Sub</h3>
              <p className="text-3xl font-bold text-black mt-2">${stats.average_cost_per_subscription.toFixed(2)}</p>
            </div>
            <FiTrendingUp className="text-2xl text-gray-400" />
          </div>
        </div>
      </div>

      {/* Subscription Duration Breakdown */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Subscription Duration Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-black">{stats.subscription_days_breakdown["30"]}</p>
            <p className="text-sm text-gray-600">30 Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-black">{stats.subscription_days_breakdown["90"]}</p>
            <p className="text-sm text-gray-600">90 Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-black">{stats.subscription_days_breakdown["365"]}</p>
            <p className="text-sm text-gray-600">365 Days</p>
          </div>
        </div>
      </div>

      {/* Provider Usage */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Provider Usage</h3>
        <div className="space-y-4">
          {Object.entries(stats.provider_usage).map(([provider, usage]) => (
            <div key={provider} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-black rounded-full"></div>
                <span className="font-medium capitalize">{provider}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Main: {usage.main_usage} | Fallback: {usage.fallback_usage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold text-black mb-4">System Health</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">API Status</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Operational</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Database</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Healthy</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">LLM Providers</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">All Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}