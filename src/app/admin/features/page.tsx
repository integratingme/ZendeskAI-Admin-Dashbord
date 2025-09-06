'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import {
  FiSettings,
  FiX,
  FiSearch
} from 'react-icons/fi';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import ThemedSelect from '@/components/ThemedSelect';

interface LLMConfig {
  provider: string;
  model: string;
  endpoint: string;
  api_key: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

// Helper function to create a complete LLMConfig with defaults
const createLLMConfig = (partial: Partial<LLMConfig> = {}): LLMConfig => ({
  provider: '',
  model: '',
  endpoint: '',
  api_key: '',
  input_price_per_million: 0,
  output_price_per_million: 0,
  ...partial
});

interface FeatureConfig {
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  use_custom_llm: boolean;
  custom_main_llm_config?: LLMConfig;
  custom_fallback_llm_config?: LLMConfig;
  feature_request_limit?: number;
  feature_usage_count?: number;
}

interface AvailableFeature {
  name: string;
  display_name: string;
  description: string;
  category: string;
}

import AdminLayout from '@/components/AdminLayout';

export default function AdminFeaturesPage() {
   // View mode state with transition
   const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
   const [subscriptions, setSubscriptions] = useState<Array<{
     subscription_key: string;
     customer_email: string;
     status: string;
     start_date: string;
     end_date: string;
   }>>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
   const [selectedSubscription, setSelectedSubscription] = useState<string>('');
   const [availableFeatures, setAvailableFeatures] = useState<Record<string, AvailableFeature>>({});
   const [subscriptionFeatures, setSubscriptionFeatures] = useState<Record<string, FeatureConfig>>({});
   const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
   const [loadingFeatures, setLoadingFeatures] = useState(false);
   const [providers, setProviders] = useState<Record<string, {
     name: string;
     endpoint: string;
     example_models: string[];
     default_pricing: Record<string, { input: number; output: number }>;
   }>>({});
   const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
   const [showFeatureConfigModal, setShowFeatureConfigModal] = useState(false);
   const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
   const [originalFeatureConfig, setOriginalFeatureConfig] = useState<FeatureConfig | null>(null);
   const [updating, setUpdating] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [searchInput, setSearchInput] = useState('');
   const SUBSCRIPTIONS_PER_PAGE = 5;

  const toast = useToastContext();

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Features';
  }, []);

  const getStringProp = (obj: unknown, key: string): string => {
    if (obj && typeof obj === 'object') {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'string') return val;
    }
    return '';
  };

  const fetchSubscriptions = useCallback(async (page: number = 1) => {
    try {
      setLoadingSubscriptions(true);
      const response = await apiService.listSubscriptions(false, page, SUBSCRIPTIONS_PER_PAGE, true);

      const subscriptionsArray: Array<{
        subscription_key: string;
        customer_email: string;
        status: string;
        start_date: string;
        end_date: string;
      }> = Object.entries(response.subscriptions || {}).map(([key, sub]) => ({
        subscription_key: key,
        customer_email: getStringProp(sub, 'customer_email'),
        status: getStringProp(sub, 'status'),
        start_date: getStringProp(sub, 'start_date'),
        end_date: getStringProp(sub, 'end_date'),
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

  const loadSubscriptionsAndProviders = useCallback(async () => {
    try {
      // Load available features and providers (subscriptions are loaded separately)
      const [featuresResponse, providersResponse] = await Promise.all([
        apiService.getAvailableFeatures(),
        apiService.listProviders()
      ]);

      console.log('Feature Management - Features response:', featuresResponse);

      if (featuresResponse.success && featuresResponse.features) {
        console.log('Feature Management - Using response.features');
        setAvailableFeatures(featuresResponse.features as Record<string, AvailableFeature>);
      } else if ((featuresResponse as unknown as Record<string, unknown>).features) {
        console.log('Feature Management - Using direct features');
        setAvailableFeatures((featuresResponse as unknown as Record<string, unknown>).features as Record<string, AvailableFeature>);
      } else {
        console.log('Feature Management - No features found in response');
        console.log('Features response structure:', {
          success: featuresResponse.success,
          hasFeatures: !!(featuresResponse as unknown as Record<string, unknown>).features,
          responseKeys: Object.keys(featuresResponse as unknown as Record<string, unknown>)
        });
      }

      // Load providers for FeatureConfigurationForm
      if (providersResponse.success && (providersResponse as unknown as Record<string, unknown>).providers) {
        setProviders(providersResponse.providers as unknown as Record<string, {
          name: string;
          endpoint: string;
          example_models: string[];
          default_pricing: Record<string, { input: number; output: number }>;
        }>);
      } else if ((providersResponse as unknown as Record<string, unknown>).providers) {
        setProviders((providersResponse as unknown as Record<string, unknown>).providers as Record<string, {
          name: string;
          endpoint: string;
          example_models: string[];
          default_pricing: Record<string, { input: number; output: number }>;
        }>);
      }
    } catch (error) {
      console.error('Error loading subscriptions and providers:', error);
      toast.error('Failed to load subscriptions', 'Unable to load subscription data');
    }
  }, [toast]);

  const loadSubscriptionFeatures = useCallback(async () => {
    if (!selectedSubscription) return;

    try {
      setLoadingFeatures(true);
      const response = await apiService.getSubscriptionFeatures(selectedSubscription);
      console.log('Subscription features response:', response);
      
      let features = {};
      if (response.success && (response as unknown as Record<string, unknown>).features) {
        console.log('Using response.features for subscription features');
        features = (response as unknown as { features?: Record<string, unknown> }).features || {};
        console.log('Loaded features from API:', features);
      } else if ((response as unknown as Record<string, unknown>).features) {
        console.log('Using direct features field for subscription features');
        features = (response as unknown as { features?: Record<string, unknown> }).features || {};
        console.log('Loaded features from API (direct):', features);
      } else {
        console.log('No subscription features found in response');
        console.log('Subscription features response structure:', {
          success: (response as unknown as { success?: boolean }).success,
          hasFeatures: !!(response as unknown as Record<string, unknown>).features,
          responseKeys: Object.keys(response as unknown as Record<string, unknown>)
        });
      }
      
      // Ensure all features are enabled by default if not configured
      const allFeatures = { ...features } as Record<string, FeatureConfig>;
      console.log('Features after copying from API:', allFeatures);
        
      // For any missing features, set them as enabled by default
      // Exclude core features from admin management
      const coreFeatures = ['ticket', 'format_ticket'];
      Object.keys(availableFeatures).forEach(featureName => {
        if (!allFeatures[featureName] && !coreFeatures.includes(featureName)) {
          console.log(`Adding default config for missing feature: ${featureName}`);
          allFeatures[featureName] = {
            ...availableFeatures[featureName],
            name: featureName,
            is_enabled: true, // Default to enabled
            use_custom_llm: false,
            custom_main_llm_config: undefined,
            custom_fallback_llm_config: undefined,
            feature_request_limit: undefined,
            feature_usage_count: 0
          };
        }
      });
        
      // Remove core features from the features list (they can't be managed)
      coreFeatures.forEach(coreFeature => {
        delete allFeatures[coreFeature];
      });
      
      console.log('Final features before setting state:', allFeatures);
      console.log('Summarize feature use_custom_llm:', allFeatures.summarize?.use_custom_llm);
        
      setSubscriptionFeatures(allFeatures);
    } catch (error) {
      console.error('Error loading subscription features:', error);
      toast.error('Failed to load subscription features', 'Unable to load subscription features');
    } finally {
      setLoadingFeatures(false);
    }
  }, [selectedSubscription, availableFeatures, toast]);

  useEffect(() => {
    loadSubscriptionsAndProviders();
  }, [loadSubscriptionsAndProviders]);

  useEffect(() => {
    fetchSubscriptions(1);
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (selectedSubscription) {
      loadSubscriptionFeatures();
    }
  }, [selectedSubscription, loadSubscriptionFeatures]);

  // State for all subscriptions when searching
  const [allSubscriptions, setAllSubscriptions] = useState<Array<{
    subscription_key: string;
    customer_email: string;
    status: string;
    start_date: string;
    end_date: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all subscriptions for search
  const fetchAllSubscriptions = useCallback(async () => {
    try {
      setIsSearching(true);
      const response = await apiService.listSubscriptions(false, 1, 1000, true);

      const subscriptionsArray: Array<{
        subscription_key: string;
        customer_email: string;
        status: string;
        start_date: string;
        end_date: string;
      }> = Object.entries(response.subscriptions || {}).map(([key, sub]) => ({
        subscription_key: key,
        customer_email: getStringProp(sub, 'customer_email'),
        status: getStringProp(sub, 'status'),
        start_date: getStringProp(sub, 'start_date'),
        end_date: getStringProp(sub, 'end_date'),
      }));

      setAllSubscriptions(subscriptionsArray);
    } catch (err) {
      console.error('Error fetching all subscriptions for search:', err);
      setAllSubscriptions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Filtered subscriptions based on search term
  const filteredSubscriptions = searchTerm ? 
    allSubscriptions.filter(subscription => {
      const term = searchTerm.toLowerCase();
      return (
        subscription.customer_email.toLowerCase().includes(term) ||
        subscription.subscription_key.toLowerCase().includes(term)
      );
    }) : subscriptions;

  // Use server-side pagination - currentSubscriptions is just the current page data
  const currentSubscriptions = filteredSubscriptions;

  const handlePageChange = (page: number) => {
    fetchSubscriptions(page);
    setSelectedSubscription(''); // Clear selection when changing pages
    setSubscriptionFeatures({});
  };

  const handleToggleFeature = async (featureName: string, enabled: boolean) => {
    if (!selectedSubscription) return;

    try {
      setUpdating(featureName);
      
      const currentConfig = subscriptionFeatures[featureName] || {};
      const updatedConfig = {
        ...currentConfig,
        is_enabled: enabled
      };

      const response = await apiService.saveAndTestFeature(selectedSubscription, featureName, updatedConfig);
      
      if (response.success) {
        await loadSubscriptionFeatures();
        toast.success(`Feature ${enabled ? 'enabled' : 'disabled'} successfully`, `Feature has been ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error(response.message || 'Failed to update feature', 'Unable to update feature status');
      }
    } catch (error) {
      console.error('Error updating feature:', error);
      toast.error('Failed to update feature', 'Unable to update feature status');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfigureFeature = (featureName: string) => {
    // Take a deep copy snapshot so we can revert unsaved changes on close
    const snapshot = subscriptionFeatures[featureName]
      ? (JSON.parse(JSON.stringify(subscriptionFeatures[featureName])) as FeatureConfig)
      : null;
    setOriginalFeatureConfig(snapshot);
    setSelectedFeature(featureName);
    setShowFeatureConfigModal(true);
    setHasUnsavedChanges(false);
  };

  const handleSearch = async () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setCurrentPage(1);
    setSelectedSubscription('');
    setSubscriptionFeatures({});
    
    if (term) {
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
    setSubscriptionFeatures({});
    setAllSubscriptions([]);
    setIsSearching(false);
    fetchSubscriptions(1);
  };

  // Handle view features
  const handleViewFeatures = async (subscriptionKey: string) => {
    setSelectedSubscription(subscriptionKey);
    // Small delay before switching to allow transition
    setTimeout(() => {
      setViewMode('details');
    }, 100);
    await loadSubscriptionFeatures();
  };

  // Handle back to list
  const handleBackToList = () => {
    // Clear features data
    setSelectedSubscription('');
    setSubscriptionFeatures({});
    setSelectedFeature(null);
    setShowFeatureConfigModal(false);
    setHasUnsavedChanges(false);
    // Switch view mode after transition delay
    setTimeout(() => {
      setViewMode('list');
    }, 150);
  };

  // Validation function to check if all required fields are filled
  const isFeatureConfigValid = (config: FeatureConfig): boolean => {
    if (!config.use_custom_llm) return true; // No validation needed if not using custom LLM

    // Check main LLM required fields
    const mainValid = !!(config.custom_main_llm_config?.provider &&
                        config.custom_main_llm_config?.model &&
                        config.custom_main_llm_config?.api_key?.trim());

    // Check fallback LLM required fields
    const fallbackValid = !!(config.custom_fallback_llm_config?.provider &&
                            config.custom_fallback_llm_config?.model &&
                            config.custom_fallback_llm_config?.api_key?.trim());

    return mainValid && fallbackValid;
  };

  const handleSaveFeatureConfig = async (updatedConfig: FeatureConfig) => {
    if (!selectedSubscription || !selectedFeature) return;

    console.log('Saving feature config:', {
      subscription: selectedSubscription,
      feature: selectedFeature,
      config: updatedConfig,
      use_custom_llm: updatedConfig.use_custom_llm
    });

    try {
      setSaving(true);
      const response = await apiService.saveAndTestFeature(selectedSubscription, selectedFeature, updatedConfig as unknown as Record<string, unknown>);

      if (response.success) {
        await loadSubscriptionFeatures();
        toast.success('Feature configuration saved successfully', 'Configuration has been saved');
        setShowFeatureConfigModal(false);
        setSelectedFeature(null);
        setHasUnsavedChanges(false);
      } else {
        console.error('Save failed - Response:', response);
        toast.error(response.message || 'Failed to save feature configuration', 'Unable to save feature configuration');
      }
    } catch (error) {
      console.error('Error saving feature configuration:', error);
      console.error('Error details:', error);
      toast.error('Failed to save feature configuration', 'Unable to save feature configuration');
    } finally {
      setSaving(false);
    }
  };



  return (
    <AdminLayout activeSection="features">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Features
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
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Select Subscription for Features</h3>
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
                  className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none w-full sm:w-auto"
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
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Select Subscription for Features</h3>
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
          <>
            {currentSubscriptions.length === 0 ? (
              searchTerm ? (
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
                <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  No subscriptions found. Please create a subscription first.
                </p>
              )
            ) : (
              <div className="space-y-3">
                {currentSubscriptions.map((subscription) => (
                  <div
                    key={subscription.subscription_key}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {subscription.customer_email}
                      </div>
                      <div className="text-sm text-gray-600">
                        {subscription.subscription_key}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewFeatures(subscription.subscription_key)}
                      className="admin-button px-1 py-0.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm flex items-center gap-0.5 sm:gap-2 w-fit"
                    >
                      View Features
                    </button>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && !searchTerm && (
                  <div className="pagination-container flex flex-row items-center justify-center gap-2 mt-6" style={{ borderColor: 'var(--border)' }}>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="admin-button-outline px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base flex-shrink-0"
                      >
                        <LuChevronLeft />
                      </button>
 
                      <div className="text-xs sm:text-sm text-gray-600 text-center flex-1 min-w-0">
                        Page {currentPage} of {totalPages} ({totalCount} total subscriptions)
                      </div>
 
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="admin-button-outline px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base flex-shrink-0"
                      >
                        <LuChevronRight />
                      </button>
                    </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Details View */}
      {viewMode === 'details' && selectedSubscription && (
        <div className={`transition-all duration-300 ease-in-out ${viewMode === 'details' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Subscription Info Header */}
          <div className="admin-card p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Features for: {subscriptions.find(s => s.subscription_key === selectedSubscription)?.customer_email || selectedSubscription}
            </h3>
          </div>

          <div className="space-y-4">
          {loadingFeatures ? (
            <div className="space-y-4 animate-pulse">
              {/* Active Features skeleton */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                <div className="h-6 w-32 rounded skeleton-block mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-40 rounded skeleton-block" />
                        <div className="h-4 w-64 rounded skeleton-block" />
                        <div className="h-4 w-20 rounded skeleton-block" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg skeleton-block" />
                        <div className="h-6 w-20 rounded skeleton-block" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Inactive Features skeleton */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                <div className="h-6 w-36 rounded skeleton-block mb-4" />
                <div className="space-y-3">
                  {[...Array(2)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', opacity: 0.7 }}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-36 rounded skeleton-block" />
                        <div className="h-4 w-56 rounded skeleton-block" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg skeleton-block" />
                        <div className="h-6 w-20 rounded skeleton-block" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Features */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Active Features
                </h3>
                <div className="space-y-3">
                  {Object.entries(subscriptionFeatures)
                    .filter(([, config]) => config.is_enabled)
                    .map(([featureName, config]) => (
                  <div
                    key={featureName}
                    className="p-3 rounded-lg border feature-item-mobile sm:flex sm:items-center sm:justify-between"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--accent)'
                    }}
                  >
                    <div className="mb-3 sm:mb-0 sm:flex-1">
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {availableFeatures[featureName]?.display_name || featureName}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {availableFeatures[featureName]?.description || 'Feature description'}
                      </p>
                      {config.use_custom_llm && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 mt-1 inline-block custom-llm-badge">
                          Custom LLM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 feature-controls sm:flex-shrink-0">
                      <button
                        onClick={() => handleConfigureFeature(featureName)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)'
                        }}
                        title="Configure LLM"
                      >
                        <FiSettings />
                      </button>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={(e) => handleToggleFeature(featureName, e.target.checked)}
                          disabled={updating === featureName}
                          className="sr-only"
                        />
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: 'var(--accent)' }}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Inactive Features */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Inactive Features
            </h3>
            <div className="space-y-3">
              {Object.entries(subscriptionFeatures)
                .filter(([, config]) => !config.is_enabled)
                .map(([featureName, config]) => (
                  <div
                    key={featureName}
                    className="p-3 rounded-lg border feature-item-mobile sm:flex sm:items-center sm:justify-between"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      opacity: 0.7
                    }}
                  >
                    <div className="mb-3 sm:mb-0 sm:flex-1">
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {availableFeatures[featureName]?.display_name || featureName}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {availableFeatures[featureName]?.description || 'Feature description'}
                      </p>
                      {config.use_custom_llm && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 mt-1 inline-block custom-llm-badge">
                          Custom LLM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 feature-controls sm:flex-shrink-0">
                      <button
                        onClick={() => handleConfigureFeature(featureName)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)'
                        }}
                        title="Configure LLM"
                      >
                        <FiSettings />
                      </button>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={(e) => handleToggleFeature(featureName, e.target.checked)}
                          disabled={updating === featureName}
                          className="sr-only"
                        />
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: '#d1d5db' }}>
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </div>
              </>
            )}
        </div>
        </div>
      )}

      {/* Feature LLM Configuration Modal */}
      {showFeatureConfigModal && selectedFeature && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="feature-config-modal rounded-lg p-3 sm:p-6 w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  Configure {availableFeatures[selectedFeature]?.display_name || selectedFeature}
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  {subscriptions.find(s => s.subscription_key === selectedSubscription)?.customer_email}
                </p>
              </div>
              <button 
                onClick={() => {
                  // If there are unsaved changes, revert to original snapshot
                  if (hasUnsavedChanges && selectedFeature && originalFeatureConfig) {
                    setSubscriptionFeatures(prev => ({
                      ...prev,
                      [selectedFeature]: originalFeatureConfig
                    }));
                  }
                  setShowFeatureConfigModal(false);
                  setSelectedFeature(null);
                  setHasUnsavedChanges(false);
                  setOriginalFeatureConfig(null);
                }}
                className="transition-colors"
                style={{ color: 'var(--foreground)', opacity: 0.5 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                }}
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            {/* Single Feature LLM Configuration */}
            <div className="space-y-6">
              {selectedFeature && subscriptionFeatures[selectedFeature] && (
                <div>
                  {/* Custom LLM Configuration */}
                  <div className="p-4 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div className="mb-4">
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>Custom LLM Configuration</h4>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        Use custom LLM for this feature instead of subscription defaults
                      </p>

                      <div className="mt-3 p-2 rounded-lg max-w-full overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-xs truncate" style={{ color: 'var(--foreground)' }}>LLM Mode</h5>
                          </div>
                          <label className="flex items-center cursor-pointer gap-1.5 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={subscriptionFeatures[selectedFeature].use_custom_llm}
                              onChange={(e) => {
                                const currentConfig = subscriptionFeatures[selectedFeature];
                                const updatedConfig = { ...currentConfig, use_custom_llm: e.target.checked } as FeatureConfig;
                                setSubscriptionFeatures(prev => ({
                                  ...prev,
                                  [selectedFeature]: updatedConfig
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              className="sr-only"
                            />
                            <div className={`relative inline-flex h-5 w-8 items-center rounded-full transition-colors flex-shrink-0`}
                                 style={{
                                   backgroundColor: subscriptionFeatures[selectedFeature].use_custom_llm ? 'var(--accent)' : '#d1d5db'
                                 }}>
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                subscriptionFeatures[selectedFeature].use_custom_llm ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                              {subscriptionFeatures[selectedFeature].use_custom_llm ? 'Custom' : 'Default'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {subscriptionFeatures[selectedFeature].use_custom_llm && (
                      <div className="space-y-6 mt-6">
                        {/* Main LLM Configuration */}
                        <div>
                          <h5 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Main LLM</h5>
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Provider
                              </label>
                              <ThemedSelect
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.provider || ''}
                                onChange={(provider) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  if (provider && providers[provider]) {
                                    const providerData = providers[provider];
                                    const endpoint = providerData.endpoint || '';
                                    const models = providerData.example_models || [];
                                    const pricing = providerData.default_pricing || {};
                                    const firstModel = models[0] || '';
                                    const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                                    const updatedConfig: FeatureConfig = {
                                      ...currentConfig,
                                      custom_main_llm_config: createLLMConfig({
                                        ...currentConfig.custom_main_llm_config,
                                        provider,
                                        endpoint,
                                        model: firstModel,
                                        api_key: '',
                                        input_price_per_million: firstPricing.input || 0,
                                        output_price_per_million: firstPricing.output || 0,
                                      }),
                                    };
                                    setSubscriptionFeatures(prev => ({
                                      ...prev,
                                      [selectedFeature]: updatedConfig,
                                    }));
                                  } else {
                                    const updatedConfig: FeatureConfig = {
                                      ...currentConfig,
                                      custom_main_llm_config: createLLMConfig({
                                        provider,
                                        model: '',
                                        endpoint: '',
                                        api_key: '',
                                        input_price_per_million: 0,
                                        output_price_per_million: 0,
                                      }),
                                    };
                                    setSubscriptionFeatures(prev => ({
                                      ...prev,
                                      [selectedFeature]: updatedConfig,
                                    }));
                                  }
                                }}
                                options={Object.entries(providers).map(([key, prov]) => ({ value: key, label: prov.name }))}
                                placeholder="Select Provider"
                                className="w-full"
                                ariaLabel="Main LLM Provider"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Model
                              </label>
                              <input
                                type="text"
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.model || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_main_llm_config: createLLMConfig({
                                      ...currentConfig.custom_main_llm_config,
                                      model: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="Enter model name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                API Key
                              </label>
                              <input
                                type="password"
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.api_key || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_main_llm_config: createLLMConfig({
                                      ...currentConfig.custom_main_llm_config,
                                      api_key: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="Enter API key"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Endpoint
                              </label>
                              <input
                                type="url"
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.endpoint || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_main_llm_config: createLLMConfig({
                                      ...currentConfig.custom_main_llm_config,
                                      endpoint: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="API endpoint URL"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Input Price (per million tokens)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.input_price_per_million || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_main_llm_config: createLLMConfig({
                                      ...currentConfig.custom_main_llm_config,
                                      input_price_per_million: parseFloat(e.target.value) || 0
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Output Price (per million tokens)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={subscriptionFeatures[selectedFeature].custom_main_llm_config?.output_price_per_million || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_main_llm_config: createLLMConfig({
                                      ...currentConfig.custom_main_llm_config,
                                      output_price_per_million: parseFloat(e.target.value) || 0
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Fallback LLM Configuration */}
                        <div>
                          <h5 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Fallback LLM</h5>
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Provider
                              </label>
                              <ThemedSelect
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.provider || ''}
                                onChange={(provider) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  if (provider && providers[provider]) {
                                    const providerData = providers[provider];
                                    const endpoint = providerData.endpoint || '';
                                    const models = providerData.example_models || [];
                                    const pricing = providerData.default_pricing || {};
                                    const firstModel = models[0] || '';
                                    const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                                    const updatedConfig: FeatureConfig = {
                                      ...currentConfig,
                                      custom_fallback_llm_config: createLLMConfig({
                                        ...currentConfig.custom_fallback_llm_config,
                                        provider,
                                        endpoint,
                                        model: firstModel,
                                        api_key: '',
                                        input_price_per_million: firstPricing.input || 0,
                                        output_price_per_million: firstPricing.output || 0,
                                      }),
                                    };
                                    setSubscriptionFeatures(prev => ({
                                      ...prev,
                                      [selectedFeature]: updatedConfig,
                                    }));
                                  } else {
                                    const updatedConfig: FeatureConfig = {
                                      ...currentConfig,
                                      custom_fallback_llm_config: createLLMConfig({
                                        provider,
                                        model: '',
                                        endpoint: '',
                                        api_key: '',
                                        input_price_per_million: 0,
                                        output_price_per_million: 0,
                                      }),
                                    };
                                    setSubscriptionFeatures(prev => ({
                                      ...prev,
                                      [selectedFeature]: updatedConfig,
                                    }));
                                  }
                                }}
                                options={Object.entries(providers).map(([key, prov]) => ({ value: key, label: prov.name }))}
                                placeholder="Select Provider"
                                className="w-full"
                                ariaLabel="Fallback LLM Provider"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Model
                              </label>
                              <input
                                type="text"
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.model || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_fallback_llm_config: createLLMConfig({
                                      ...currentConfig.custom_fallback_llm_config,
                                      model: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="Enter model name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                API Key
                              </label>
                              <input
                                type="password"
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.api_key || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_fallback_llm_config: createLLMConfig({
                                      ...currentConfig.custom_fallback_llm_config,
                                      api_key: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="Enter API key"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Endpoint
                              </label>
                              <input
                                type="url"
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.endpoint || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_fallback_llm_config: createLLMConfig({
                                      ...currentConfig.custom_fallback_llm_config,
                                      endpoint: e.target.value
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="API endpoint URL"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Input Price (per million tokens)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.input_price_per_million || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_fallback_llm_config: createLLMConfig({
                                      ...currentConfig.custom_fallback_llm_config,
                                      input_price_per_million: parseFloat(e.target.value) || 0
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Output Price (per million tokens)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={subscriptionFeatures[selectedFeature].custom_fallback_llm_config?.output_price_per_million || ''}
                                onChange={(e) => {
                                  const currentConfig = subscriptionFeatures[selectedFeature];
                                  const updatedConfig: FeatureConfig = {
                                    ...currentConfig,
                                    custom_fallback_llm_config: createLLMConfig({
                                      ...currentConfig.custom_fallback_llm_config,
                                      output_price_per_million: parseFloat(e.target.value) || 0
                                    })
                                  };
                                  setSubscriptionFeatures(prev => ({
                                    ...prev,
                                    [selectedFeature]: updatedConfig
                                  }));
                                }}
                                className="w-full p-3 rounded-lg border transition-colors"
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)'
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                    
                    {/* Save Button */}
                    {subscriptionFeatures[selectedFeature]?.use_custom_llm && (
                      <div className="pt-4 mt-6 space-y-4">
                        {/* Save Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveFeatureConfig(subscriptionFeatures[selectedFeature])}
                            disabled={!isFeatureConfigValid(subscriptionFeatures[selectedFeature]) || saving}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-medium ${
                              (!isFeatureConfigValid(subscriptionFeatures[selectedFeature]) || saving)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                            style={{
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none'
                            }}
                            aria-busy={saving}
                            aria-live="polite"
                            title={!isFeatureConfigValid(subscriptionFeatures[selectedFeature])
                              ? 'Please fill in all required fields (Provider, Model, API Key for both LLMs)'
                              : 'Save Configuration'
                            }
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Saving…</span>
                              </>
                            ) : (
                              <span>Save Configuration</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
      <style jsx>{`
        @media (max-width: 640px) {
          .feature-config-modal input[type="text"],
          .feature-config-modal input[type="password"],
          .feature-config-modal input[type="url"],
          .feature-config-modal input[type="number"],
          .feature-config-modal select,
          .feature-config-modal textarea {
            padding: 0.5rem; /* p-2 */
            font-size: 0.875rem; /* text-sm */
            border-radius: 0.5rem; /* rounded-lg */
          }
          .feature-config-modal label { font-size: 0.85rem; }
          .feature-config-modal h2 { font-size: 1rem; }
          .feature-config-modal h4 { font-size: 0.95rem; }
          .feature-config-modal h5 { font-size: 0.875rem; }
          .feature-config-modal button {
            padding: 0.4rem 0.75rem; /* smaller buttons */
            font-size: 0.875rem;
          }

          /* Sleek feature boxes for mobile */
          .feature-item-mobile {
            padding: 0.75rem !important; /* p-3 to p-3 but more compact */
          }
          .feature-item-mobile h4 {
            font-size: 0.9rem !important; /* Slightly smaller headings */
            font-weight: 500 !important;
          }
          .feature-item-mobile p {
            font-size: 0.8rem !important; /* Smaller description text */
            line-height: 1.3 !important;
          }
          .feature-item-mobile .custom-llm-badge {
            font-size: 0.7rem !important; /* Smaller badge text */
            padding: 0.2rem 0.5rem !important;
          }
          .feature-item-mobile .feature-controls {
            margin-top: 0.5rem !important; /* Less space between content and controls */
          }
        }
      `}</style>
    </AdminLayout>
  );
}
