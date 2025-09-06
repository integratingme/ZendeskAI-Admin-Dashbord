'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { apiService, ApiError } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { FiSearch } from 'react-icons/fi';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

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

// Defaults for optional API fields
const DEFAULT_USAGE_STATS: SubscriptionUsage['usage_stats'] = {
  main_llm_usage: {
    total_requests: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    estimated_cost_usd: 0,
    last_used: null,
  },
  fallback_llm_usage: {
    total_requests: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    estimated_cost_usd: 0,
    used_count: 0,
  },
};

const DEFAULT_COST_BREAKDOWN: SubscriptionCosts['cost_breakdown'] = {
  subscription_default_llms: {
    main_llm: { provider: '', model: '', total_cost_usd: 0, total_requests: 0, total_tokens: 0 },
    fallback_llm: { provider: '', model: '', total_cost_usd: 0, total_requests: 0, total_tokens: 0, fallback_usage_count: 0 },
    subtotal_cost_usd: 0,
    subtotal_requests: 0,
  },
  feature_custom_llms: {},
  feature_custom_summary: {
    total_features_with_custom_llm: 0,
    total_cost_usd: 0,
    total_requests: 0,
  },
  total_cost_usd: 0,
  total_requests: 0,
};

// Removed duplicate import of AdminLayout

export default function AdminAnalyticsPage() {
  // View mode state with transition
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedSubscription, setSelectedSubscription] = useState('');

  // List view state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Details view state
  const [usageData, setUsageData] = useState<SubscriptionUsage | null>(null);
  const [costsData, setCostsData] = useState<SubscriptionCosts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trends state
  const [trendStart, setTrendStart] = useState<string>(() => new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]);
  const [trendEnd, setTrendEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [trendScope, setTrendScope] = useState<string>('main');
  const [trendRows, setTrendRows] = useState<Array<{date: string; scope: string; total_requests: number; total_input_tokens: number; total_output_tokens: number; estimated_cost_usd: number; used_count?: number}>>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendPage, setTrendPage] = useState<number>(0);
  const PAGE_SIZE = 5;
  const SUBSCRIPTIONS_PER_PAGE = 5;

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Analytics';
  }, []);

  const fetchSubscriptions = useCallback(async (page: number = 1) => {
    try {
      setLoadingSubscriptions(true);
      const response = await apiService.listSubscriptions(false, page, SUBSCRIPTIONS_PER_PAGE, true);

      const subscriptionsArray: Subscription[] = Object.entries(response.subscriptions).map(([key, sub]) => ({
        subscription_key: key,
        customer_email: (sub as SubscriptionData).customer_email as string,
        zendesk_subdomain: (sub as SubscriptionData).zendesk_subdomain as string
      }));

      setSubscriptions(subscriptionsArray);
      setCurrentPage(page);
      setTotalCount(response.totalCount || 0);
      setTotalPages(Math.ceil((response.totalCount || 0) / SUBSCRIPTIONS_PER_PAGE));
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    if (!selectedSubscription) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [usageResponse, costsResponse] = await Promise.all([
        apiService.getSubscriptionUsage(selectedSubscription),
        apiService.getSubscriptionCosts(selectedSubscription),
      ]);
      
      console.log('Usage response:', usageResponse);
      console.log('Costs response:', costsResponse);
      
      // Normalize optional fields with safe defaults
      const mappedUsage: SubscriptionUsage = {
        success: usageResponse.success,
        subscription_key: usageResponse.subscription_key,
        usage_stats: (usageResponse.usage_stats
          ? (usageResponse.usage_stats as unknown as SubscriptionUsage['usage_stats'])
          : DEFAULT_USAGE_STATS),
      };
      setUsageData(mappedUsage);
      
      const mappedCosts: SubscriptionCosts = {
        success: costsResponse.success,
        subscription_key: costsResponse.subscription_key,
        cost_breakdown: (costsResponse.cost_breakdown
          ? (costsResponse.cost_breakdown as unknown as SubscriptionCosts['cost_breakdown'])
          : DEFAULT_COST_BREAKDOWN),
      };
      setCostsData(mappedCosts);
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

  // Handle view analytics
  const handleViewAnalytics = async (subscriptionKey: string) => {
    setSelectedSubscription(subscriptionKey);
    // Small delay before switching to allow transition
    setTimeout(() => {
      setViewMode('details');
    }, 100);
    await fetchAnalyticsData();
  };

  // Handle back to list
  const handleBackToList = () => {
    // Clear analytics data
    setSelectedSubscription('');
    setUsageData(null);
    setCostsData(null);
    setError(null);
    // Switch view mode after transition delay
    setTimeout(() => {
      setViewMode('list');
    }, 150);
  };

  // State for all subscriptions when searching
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all subscriptions for search
  const fetchAllSubscriptions = useCallback(async () => {
    try {
      setIsSearching(true);
      const response = await apiService.listSubscriptions(false, 1, 1000, true); // Get up to 1000 subscriptions

      const subscriptionsArray: Subscription[] = Object.entries(response.subscriptions).map(([key, sub]) => ({
        subscription_key: key,
        customer_email: (sub as SubscriptionData).customer_email as string,
        zendesk_subdomain: (sub as SubscriptionData).zendesk_subdomain as string
      }));

      setAllSubscriptions(subscriptionsArray);
    } catch (err) {
      console.error('Error fetching all subscriptions for search:', err);
      setAllSubscriptions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchSubscriptions(page);
  };

  const handleSearch = async () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setCurrentPage(1);
    // Clear selected subscription when searching
    setSelectedSubscription('');
    setUsageData(null);
    setCostsData(null);
    setError(null);
    
    if (term) {
      // Fetch all subscriptions for search
      await fetchAllSubscriptions();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedSubscription('');
    setUsageData(null);
    setCostsData(null);
    setError(null);
    setAllSubscriptions([]);
    setIsSearching(false);
    // Return to normal paginated view
    fetchSubscriptions(1);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]); // Only fetch on mount, not on every fetchSubscriptions change

  useEffect(() => {
    if (selectedSubscription) {
      fetchAnalyticsData();
    }
  }, [selectedSubscription, fetchAnalyticsData]);

  // Fetch trends
  const fetchTrends = useCallback(async () => {
    if (!selectedSubscription) return;
    try {
      setTrendLoading(true);
      setTrendError(null);
      const resp = await apiService.getUsageDaily(selectedSubscription, { startDate: trendStart, endDate: trendEnd, scope: trendScope });
      if (resp && resp.success) {
        setTrendRows(resp.rows || []);
      } else {
        setTrendRows([]);
      }
    } catch (err) {
      setTrendError('Failed to load trend data');
      console.error('Trend fetch error:', err);
    } finally {
      setTrendLoading(false);
    }
  }, [selectedSubscription, trendStart, trendEnd, trendScope]);

  useEffect(() => {
    if (selectedSubscription) fetchTrends();
  }, [selectedSubscription, trendStart, trendEnd, trendScope, fetchTrends]);

  // Filtered subscriptions based on search term
  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return subscriptions;
    
    const term = searchTerm.toLowerCase();
    return allSubscriptions.filter(subscription => 
      subscription.customer_email.toLowerCase().includes(term) ||
      subscription.subscription_key.toLowerCase().includes(term) ||
      subscription.zendesk_subdomain.toLowerCase().includes(term)
    );
  }, [allSubscriptions, subscriptions, searchTerm]);

  return (
    <AdminLayout activeSection="analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            {viewMode === 'list' ? 'Analytics' : 'Analytics'}
          </h1>
          {viewMode === 'details' && (
            <button
              onClick={handleBackToList}
              className="admin-button-outline px-4 py-2 rounded-lg"
            >
              Back
            </button>
          )}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="admin-card p-6 transition-all duration-300 ease-in-out">
            <div className="space-y-4 mb-4">
              {/* Mobile Layout - Search Full Width */}
              <div className="block sm:hidden">
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg flex-1" style={{ borderColor: 'var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search subscriptions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none flex-1"
                      style={{ color: 'var(--foreground)', background: 'transparent' }}
                    />
                    <button
                      onClick={handleSearch}
                      className="px-3 py-2 border-l text-sm hover:bg-gray-50 flex-shrink-0"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      title="Search"
                    >
                      <FiSearch className="w-4 h-4" />
                    </button>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex-shrink-0"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      title="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop Layout - Title and Search */}
              <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                    Select Subscription for Analytics
                  </h3>
                  {searchTerm && (
                    <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      Filtered by: {`"${searchTerm}"`}
                    </p>
                  )}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search subscriptions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none"
                      style={{ color: 'var(--foreground)', background: 'transparent' }}
                    />
                    <button
                      onClick={handleSearch}
                      className="px-3 py-2 border-l text-sm hover:bg-gray-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      title="Search"
                    >
                      <FiSearch className="w-4 h-4" />
                    </button>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      title="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Title and Filter Info */}
              <div className="block sm:hidden">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Select Subscription for Analytics
                </h3>
                {searchTerm && (
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    Filtered by: {`"${searchTerm}"`}
                  </p>
                )}
              </div>
            </div>

            {loadingSubscriptions || isSearching ? (
              <div className="space-y-4">
                {Array.from({ length: SUBSCRIPTIONS_PER_PAGE }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded skeleton-block" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubscriptions.length === 0 && searchTerm ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <FiSearch className="w-12 h-12 mx-auto" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
                    </div>
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      No subscriptions found
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      No subscriptions match your search &quot;{searchTerm}&quot;. Try a different search term.
                    </p>
                  </div>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <div
                      key={subscription.subscription_key}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors analytics-item-mobile"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div>
                        <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {subscription.customer_email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {subscription.zendesk_subdomain}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAnalytics(subscription.subscription_key)}
                        className="admin-button px-1 py-0.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm flex items-center gap-0.5 sm:gap-2 w-fit"
                      >
                        View Analytics
                      </button>
                    </div>
                  ))
                )}

              {/* Pagination */}
              {totalPages > 1 && !searchTerm && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <LuChevronLeft />
                  </button>

                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({totalCount} total subscriptions)
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <LuChevronRight />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Details View */}
        <div className={`transition-all duration-300 ease-in-out ${viewMode === 'details' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Subscription Info Header */}
            <div className="admin-card p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Analytics for: {subscriptions.find(s => s.subscription_key === selectedSubscription)?.customer_email || selectedSubscription}
              </h3>
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
        <div className="space-y-6 animate-pulse">
          {/* Usage Statistics Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-40 rounded skeleton-block mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 analytics-metrics-mobile">
              <div>
                <div className="h-4 w-24 rounded skeleton-block mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-28 rounded skeleton-block" />
                    <div className="h-4 w-16 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-24 rounded skeleton-block" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-26 rounded skeleton-block" />
                    <div className="h-4 w-18 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-12 rounded skeleton-block" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                </div>
              </div>
              <div>
                <div className="h-4 w-28 rounded skeleton-block mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-28 rounded skeleton-block" />
                    <div className="h-4 w-16 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-24 rounded skeleton-block" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-26 rounded skeleton-block" />
                    <div className="h-4 w-18 rounded skeleton-block" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-12 rounded skeleton-block" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trends Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-20 rounded skeleton-block mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="h-10 w-full rounded skeleton-block" />
              <div className="h-10 w-full rounded skeleton-block" />
              <div className="h-10 w-full rounded skeleton-block" />
            </div>
            <div className="overflow-auto">
              <div className="min-w-full">
                {/* Table header skeleton */}
                <div className="flex text-left mb-2">
                  <div className="h-4 w-16 rounded skeleton-block mr-4" />
                  <div className="h-4 w-16 rounded skeleton-block mr-4" />
                  <div className="h-4 w-20 rounded skeleton-block mr-4" />
                  <div className="h-4 w-24 rounded skeleton-block mr-4" />
                  <div className="h-4 w-26 rounded skeleton-block mr-4" />
                  <div className="h-4 w-16 rounded skeleton-block" />
                </div>
                {/* Table rows skeleton */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex mb-2">
                    <div className="h-4 w-20 rounded skeleton-block mr-4" />
                    <div className="h-4 w-16 rounded skeleton-block mr-4" />
                    <div className="h-4 w-16 rounded skeleton-block mr-4" />
                    <div className="h-4 w-20 rounded skeleton-block mr-4" />
                    <div className="h-4 w-20 rounded skeleton-block mr-4" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cost Breakdown Skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-32 rounded skeleton-block mb-4" />
            <div className="space-y-6">
              <div>
                <div className="h-4 w-48 rounded skeleton-block mb-3" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                    <div>
                      <div className="h-4 w-40 rounded skeleton-block mb-1" />
                      <div className="h-3 w-32 rounded skeleton-block" />
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-20 rounded skeleton-block mb-1" />
                      <div className="h-3 w-24 rounded skeleton-block" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                    <div>
                      <div className="h-4 w-44 rounded skeleton-block mb-1" />
                      <div className="h-3 w-36 rounded skeleton-block" />
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-20 rounded skeleton-block mb-1" />
                      <div className="h-3 w-24 rounded skeleton-block" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                    <div className="h-4 w-52 rounded skeleton-block" />
                    <div className="h-4 w-20 rounded skeleton-block" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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

          {/* Trends */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
                <ThemedSelect
                  value={trendScope}
                  onChange={(val) => setTrendScope(val)}
                  options={[
                    { value: 'main', label: 'Main' },
                    { value: 'fallback', label: 'Fallback' },
                    { value: 'feature:%', label: 'All Features' },
                  ]}
                  placeholder="Select scope"
                  className="w-full"
                  buttonClassName="h-10 px-3 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={trendStart}
                  onChange={(e) => setTrendStart(e.target.value)}
                  className="w-full h-10 border rounded-md px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={trendEnd}
                  onChange={(e) => setTrendEnd(e.target.value)}
                  className="w-full h-10 border rounded-md px-3"
                />
              </div>
            </div>
            {trendError && <div className="text-red-600 text-sm mb-2">{trendError}</div>}
            {trendLoading ? (
              <div className="text-gray-600">Loading trends...</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-2 py-1">Date</th>
                      <th className="px-2 py-1">Scope</th>
                      <th className="px-2 py-1">Requests</th>
                      <th className="px-2 py-1">Input Tokens</th>
                      <th className="px-2 py-1">Output Tokens</th>
                      <th className="px-2 py-1">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendRows.length === 0 ? (
                      <tr><td className="px-2 py-2 text-gray-500" colSpan={6}>No data for selected filters.</td></tr>
                    ) : (
                      trendRows
                        .slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(trendPage * PAGE_SIZE, trendPage * PAGE_SIZE + PAGE_SIZE)
                        .map((r, idx) => (
                          <tr key={`${r.date}-${idx}`} className="border-t">
                            <td className="px-2 py-1">{r.date}</td>
                            <td className="px-2 py-1">{r.scope}</td>
                            <td className="px-2 py-1">{r.total_requests.toLocaleString()}</td>
                            <td className="px-2 py-1">{r.total_input_tokens.toLocaleString()}</td>
                            <td className="px-2 py-1">{r.total_output_tokens.toLocaleString()}</td>
                            <td className="px-2 py-1">${r.estimated_cost_usd.toFixed(6)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {trendRows.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setTrendPage((p) => Math.max(0, p - 1))}
                  disabled={trendPage === 0}
                >
                  Previous
                </button>
                <div className="text-sm text-gray-600">
                  Page {trendPage + 1} of {Math.max(1, Math.ceil(trendRows.length / PAGE_SIZE))}
                </div>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setTrendPage((p) => (p + 1 < Math.ceil(trendRows.length / PAGE_SIZE) ? p + 1 : p))}
                  disabled={trendPage + 1 >= Math.ceil(trendRows.length / PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            )}
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

        <style jsx>{`
          @media (max-width: 640px) {
            /* Sleek analytics boxes for mobile to match features page */
            .analytics-item-mobile {
              padding: 0.75rem !important; /* compact */
            }
            .analytics-item-mobile h4 {
              font-size: 0.9rem !important;
              font-weight: 500 !important;
            }
            .analytics-item-mobile p {
              font-size: 0.8rem !important;
              line-height: 1.3 !important;
            }
            .analytics-metrics-mobile {
              gap: 1rem !important; /* Reduce gap from 1.5rem (gap-6) to 1rem */
            }

            .analytics-metrics-mobile > div {
              padding: 1rem !important; /* Reduce padding from p-6 to p-4 */
            }
          }
        `}</style>
    </div>
  </AdminLayout>
);
}