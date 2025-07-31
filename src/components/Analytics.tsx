'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiError } from '@/lib/api';

interface SubscriptionUsage {
  success: boolean;
  subscription_key: string;
  usage_stats: {
    main_llm_usage: {
      total_requests: number;
      total_input_tokens: number;
      total_output_tokens: number;
      estimated_cost_usd: number;
      last_used: string | null;
    };
    fallback_llm_usage: {
      total_requests: number;
      total_input_tokens: number;
      total_output_tokens: number;
      estimated_cost_usd: number;
      used_count: number;
    };
  };
}

interface SubscriptionData {
  customer_email: string;
  zendesk_subdomain: string;
  [key: string]: unknown;
}

interface FeatureCustomLLM {
  feature_name: string;
  main_llm?: {
    provider: string;
    model: string;
    total_cost_usd: number;
    total_requests: number;
    total_tokens: number;
    last_used?: string;
  };
  fallback_llm?: {
    provider: string;
    model: string;
    total_cost_usd: number;
    total_requests: number;
    total_tokens: number;
    last_used?: string;
    fallback_usage_count?: number;
  };
  total_cost_usd: number;
  total_requests: number;
  total_tokens: number;
}

interface SubscriptionCosts {
  success: boolean;
  subscription_key: string;
  cost_breakdown: {
    subscription_default_llms: {
      main_llm: {
        provider: string;
        model: string;
        total_cost_usd: number;
        total_requests: number;
        total_tokens: number;
      };
      fallback_llm: {
        provider: string;
        model: string;
        total_cost_usd: number;
        total_requests: number;
        total_tokens: number;
        fallback_usage_count: number;
      };
      subtotal_cost_usd: number;
      subtotal_requests: number;
    };
    feature_custom_llms: Record<string, FeatureCustomLLM>;
    feature_custom_summary: {
      total_features_with_custom_llm: number;
      total_cost_usd: number;
      total_requests: number;
    };
    total_cost_usd: number;
    total_requests: number;
  };
}

interface Subscription {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
}

export default function Analytics() {
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usageData, setUsageData] = useState<SubscriptionUsage | null>(null);
  const [costsData, setCostsData] = useState<SubscriptionCosts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await apiService.listSubscriptions();
      console.log('Analytics subscriptions response:', response);
      
      if (response.success && response.data?.subscriptions) {
        const subscriptionsArray = Object.entries(response.data.subscriptions).map(([key, sub]: [string, SubscriptionData]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string
        }));
        setSubscriptions(subscriptionsArray);
      } else if (response.data) {
        // Handle case where subscriptions are directly in data
        const subscriptionsArray = Object.entries(response.data as Record<string, Record<string, unknown>>).map(([key, sub]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string
        }));
        setSubscriptions(subscriptionsArray);
      } else if ((response as unknown as Record<string, unknown>).subscriptions) {
        // Handle case where subscriptions are directly in response
        const subscriptionsArray = Object.entries((response as unknown as Record<string, unknown>).subscriptions as Record<string, Record<string, unknown>>).map(([key, sub]: [string, Record<string, unknown>]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string
        }));
        setSubscriptions(subscriptionsArray);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    if (!selectedSubscription) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [usageResponse, costsResponse] = await Promise.all([
        apiService.getSubscriptionUsage(selectedSubscription),
        apiService.getSubscriptionCosts(selectedSubscription)
      ]);
      
      console.log('Usage response:', usageResponse);
      console.log('Costs response:', costsResponse);
      
      // Handle usage response
      if (usageResponse.success && usageResponse.data) {
        setUsageData(usageResponse.data as unknown as SubscriptionUsage);
      } else if (usageResponse.data) {
        setUsageData(usageResponse.data as unknown as SubscriptionUsage);
      } else {
        // Try using response directly
        setUsageData(usageResponse as unknown as SubscriptionUsage);
      }
      
      // Handle costs response
      if (costsResponse.success && costsResponse.data) {
        setCostsData(costsResponse.data as unknown as SubscriptionCosts);
      } else if (costsResponse.data) {
        setCostsData(costsResponse.data as unknown as SubscriptionCosts);
      } else {
        // Try using response directly
        setCostsData(costsResponse as unknown as SubscriptionCosts);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch analytics data');
      }
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSubscription]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (selectedSubscription) {
      fetchAnalyticsData();
    }
  }, [selectedSubscription, fetchAnalyticsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Analytics</h1>
      </div>

      {/* Subscription Selector */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Subscription Analytics</h3>
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Select Subscription:</label>
          <select 
            value={selectedSubscription}
            onChange={(e) => setSelectedSubscription(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-64"
          >
            <option value="">Choose a subscription...</option>
            {subscriptions.map((sub) => (
              <option key={sub.subscription_key} value={sub.subscription_key}>
                {sub.customer_email} ({sub.zendesk_subdomain})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="admin-card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      )}

      {selectedSubscription && !loading && !error && usageData && costsData ? (
        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Usage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Main LLM</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Requests:</span>
                    <span className="font-medium">{usageData.usage_stats?.main_llm_usage?.total_requests?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Input Tokens:</span>
                    <span className="font-medium">{usageData.usage_stats?.main_llm_usage?.total_input_tokens?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Output Tokens:</span>
                    <span className="font-medium">{usageData.usage_stats?.main_llm_usage?.total_output_tokens?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">${(usageData.usage_stats?.main_llm_usage?.estimated_cost_usd || 0).toFixed(6)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Fallback LLM</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Requests:</span>
                    <span className="font-medium">{usageData.usage_stats?.fallback_llm_usage?.total_requests?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Input Tokens:</span>
                    <span className="font-medium">{usageData.usage_stats?.fallback_llm_usage?.total_input_tokens?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Output Tokens:</span>
                    <span className="font-medium">{usageData.usage_stats?.fallback_llm_usage?.total_output_tokens?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">${(usageData.usage_stats?.fallback_llm_usage?.estimated_cost_usd || 0).toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Cost Breakdown</h3>
            <div className="space-y-6">
              
              {/* Subscription Default LLMs */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Subscription Default LLMs</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Main LLM ({costsData.cost_breakdown.subscription_default_llms.main_llm.provider})</p>
                      <p className="text-sm text-gray-600">{costsData.cost_breakdown.subscription_default_llms.main_llm.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${costsData.cost_breakdown.subscription_default_llms.main_llm.total_cost_usd.toFixed(6)}</p>
                      <p className="text-sm text-gray-600">{costsData.cost_breakdown.subscription_default_llms.main_llm.total_requests} requests</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Fallback LLM ({costsData.cost_breakdown.subscription_default_llms.fallback_llm.provider})</p>
                      <p className="text-sm text-gray-600">{costsData.cost_breakdown.subscription_default_llms.fallback_llm.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${costsData.cost_breakdown.subscription_default_llms.fallback_llm.total_cost_usd.toFixed(6)}</p>
                      <p className="text-sm text-gray-600">{costsData.cost_breakdown.subscription_default_llms.fallback_llm.total_requests} requests</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                    <span className="font-medium">Subscription Default Subtotal:</span>
                    <span className="font-medium">${costsData.cost_breakdown.subscription_default_llms.subtotal_cost_usd.toFixed(6)}</span>
                  </div>
                </div>
              </div>

              {/* Feature Custom LLMs */}
              {costsData.cost_breakdown.feature_custom_summary.total_features_with_custom_llm > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Feature-Specific Custom LLMs</h4>
                  <div className="space-y-3">
                    {Object.entries(costsData.cost_breakdown.feature_custom_llms).map(([featureName, featureData]) => (
                      <div key={featureName}>
                        {featureData.main_llm && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{featureName.replace(/_/g, ' ')} - Main LLM ({featureData.main_llm.provider})</p>
                              <p className="text-sm text-gray-600">{featureData.main_llm.model}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${featureData.main_llm.total_cost_usd.toFixed(6)}</p>
                              <p className="text-sm text-gray-600">{featureData.main_llm.total_requests} requests</p>
                            </div>
                          </div>
                        )}
                        
                        {featureData.fallback_llm && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{featureName.replace(/_/g, ' ')} - Fallback LLM ({featureData.fallback_llm.provider})</p>
                              <p className="text-sm text-gray-600">
                                {featureData.fallback_llm.model}
                                {featureData.fallback_llm.fallback_usage_count && 
                                  ` • Used ${featureData.fallback_llm.fallback_usage_count} times`
                                }
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${featureData.fallback_llm.total_cost_usd.toFixed(6)}</p>
                              <p className="text-sm text-gray-600">{featureData.fallback_llm.total_requests} requests</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                      <span className="font-medium">Feature Custom LLMs Subtotal:</span>
                      <span className="font-medium">${costsData.cost_breakdown.feature_custom_summary.total_cost_usd.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between font-semibold text-lg">
                  <span>Total Cost:</span>
                  <span>${costsData.cost_breakdown.total_cost_usd.toFixed(6)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                  <span>Total Requests:</span>
                  <span>{costsData.cost_breakdown.total_requests.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedSubscription && !loading && !error ? (
        <div className="admin-card p-12 text-center">
          <p className="text-gray-500">No analytics data available for this subscription</p>
        </div>
      ) : !selectedSubscription && !loading ? (
        <div className="admin-card p-12 text-center">
          <p className="text-gray-500">Select a subscription to view detailed analytics</p>
        </div>
      ) : null}
    </div>
  );
}