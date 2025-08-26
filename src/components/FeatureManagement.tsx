'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import { 
  FiSettings, 
  FiX, 
  FiRefreshCw
} from 'react-icons/fi';
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

export default function FeatureManagement() {
  const [subscriptions, setSubscriptions] = useState<Record<string, {
    customer_email: string;
    subscription_key: string;
    status: string;
    start_date: string;
    end_date: string;
  }>>({});
  const [selectedSubscription, setSelectedSubscription] = useState<string>('');
  const [availableFeatures, setAvailableFeatures] = useState<Record<string, AvailableFeature>>({});
  const [subscriptionFeatures, setSubscriptionFeatures] = useState<Record<string, FeatureConfig>>({});
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Record<string, {
    name: string;
    endpoint: string;
    example_models: string[];
    default_pricing: Record<string, { input: number; output: number }>;
  }>>({});
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showFeatureConfigModal, setShowFeatureConfigModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  
  const toast = useToastContext();

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load subscriptions, available features, and providers in parallel
      const [subscriptionsResponse, featuresResponse, providersResponse] = await Promise.all([
        (async () => { const { subscriptions } = await apiService.listSubscriptions(false); return { success: true, data: subscriptions } as { success: boolean; data: Record<string, unknown> }; })(), // normalized
        apiService.getAvailableFeatures(),
        apiService.listProviders()
      ]);

      console.log('Feature Management - Subscriptions response:', subscriptionsResponse);
      
      // Try multiple response formats like in Subscriptions component
      let subscriptionsData = null;
      
      if (subscriptionsResponse.success && subscriptionsResponse.data?.subscriptions) {
        console.log('Feature Management - Using response.data.subscriptions');
        subscriptionsData = subscriptionsResponse.data.subscriptions;
      } else if (subscriptionsResponse.data && typeof subscriptionsResponse.data === 'object') {
        console.log('Feature Management - Using response.data directly');
        subscriptionsData = subscriptionsResponse.data;
      } else if ((subscriptionsResponse as unknown as Record<string, unknown>).subscriptions) {
        console.log('Feature Management - Using response.subscriptions');
        subscriptionsData = (subscriptionsResponse as unknown as Record<string, unknown>).subscriptions;
      } else {
        console.log('Feature Management - No subscriptions data found in response');
        console.log('Response structure:', {
          success: subscriptionsResponse.success,
          hasData: !!subscriptionsResponse.data,
          dataKeys: subscriptionsResponse.data ? Object.keys(subscriptionsResponse.data) : [],
          hasSubscriptions: (subscriptionsResponse.data as unknown as Record<string, unknown>)?.subscriptions ? 'yes' : 'no',
          directSubscriptions: (subscriptionsResponse as unknown as Record<string, unknown>).subscriptions ? 'yes' : 'no'
        });
      }
      
      if (subscriptionsData && typeof subscriptionsData === 'object') {
        console.log('Feature Management - Found subscriptions:', Object.keys(subscriptionsData));
        setSubscriptions(subscriptionsData as Record<string, {
          customer_email: string;
          subscription_key: string;
          status: string;
          start_date: string;
          end_date: string;
        }>);
        // Don't auto-select subscription - let user choose
      }

      console.log('Feature Management - Features response:', featuresResponse);
      
      if (featuresResponse.success && (featuresResponse as unknown as Record<string, unknown>).features) {
        console.log('Feature Management - Using response.features');
        setAvailableFeatures((featuresResponse as unknown as Record<string, unknown>).features as Record<string, AvailableFeature>);
      } else if (featuresResponse.success && featuresResponse.data) {
        console.log('Feature Management - Using response.data');
        setAvailableFeatures(featuresResponse.data);
      } else if ((featuresResponse as unknown as Record<string, unknown>).features) {
        console.log('Feature Management - Using direct features');
        setAvailableFeatures((featuresResponse as unknown as Record<string, unknown>).features as Record<string, AvailableFeature>);
      } else {
        console.log('Feature Management - No features found in response');
        console.log('Features response structure:', {
          success: featuresResponse.success,
          hasData: !!featuresResponse.data,
          hasFeatures: !!(featuresResponse as unknown as Record<string, unknown>).features,
          dataKeys: featuresResponse.data ? Object.keys(featuresResponse.data) : [],
          responseKeys: Object.keys(featuresResponse)
        });
      }

      // Load providers for FeatureConfigurationForm
      if (providersResponse.success && providersResponse.data?.providers) {
        setProviders(providersResponse.data.providers as Record<string, {
          name: string;
          endpoint: string;
          example_models: string[];
          default_pricing: Record<string, { input: number; output: number }>;
        }>);
      } else if (providersResponse.data) {
        setProviders(providersResponse.data as Record<string, {
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
      console.error('Error loading initial data:', error);
      toast.error('Failed to load feature management data', 'Unable to load feature management data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSubscriptionFeatures = useCallback(async () => {
    if (!selectedSubscription) return;

    try {
      const response = await apiService.getSubscriptionFeatures(selectedSubscription);
      console.log('Subscription features response:', response);
      
      let features = {};
      if (response.success && (response as unknown as Record<string, unknown>).features) {
        console.log('Using response.features for subscription features');
        features = (response as unknown as Record<string, unknown>).features || {};
        console.log('Loaded features from API:', features);
      } else if (response.success && response.data) {
        console.log('Using response.data for subscription features');
        features = response.data || {};
        console.log('Loaded features from API (data):', features);
      } else {
        console.log('No subscription features found in response');
        console.log('Subscription features response structure:', {
          success: response.success,
          hasData: !!response.data,
          hasFeatures: !!(response as unknown as Record<string, unknown>).features,
          responseKeys: Object.keys(response)
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
    }
  }, [selectedSubscription, availableFeatures, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedSubscription) {
      loadSubscriptionFeatures();
    }
  }, [selectedSubscription, loadSubscriptionFeatures]);

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
    setSelectedFeature(featureName);
    setShowFeatureConfigModal(true);
    setHasUnsavedChanges(false);
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <FiRefreshCw className="animate-spin text-xl" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--foreground)' }}>Loading feature management...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Feature Control
          </h1>
        </div>
      </div>

      {/* Subscription Selector */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Select Subscription
        </label>
        <ThemedSelect
          value={selectedSubscription}
          onChange={(val) => setSelectedSubscription(val)}
          options={[{ value: '', label: 'Select a subscription...' }, ...Object.entries(subscriptions).map(([key, subscription]) => ({ value: key, label: `${subscription.customer_email} (${key})` }))]}
          className="w-full"
          placeholder="Select a subscription..."
        />
        {Object.keys(subscriptions).length === 0 && (
          <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            No subscriptions found. Please create a subscription first.
          </p>
        )}
      </div>

      {selectedSubscription && (
        <div className="space-y-4">
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
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--accent)'
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {availableFeatures[featureName]?.display_name || featureName}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {availableFeatures[featureName]?.description || 'Feature description'}
                      </p>
                      {config.use_custom_llm && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 mt-1 inline-block">
                          Custom LLM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                        <span className="ml-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {updating === featureName ? 'Updating...' : 'Enabled'}
                        </span>
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
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      opacity: 0.7
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {availableFeatures[featureName]?.display_name || featureName}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {availableFeatures[featureName]?.description || 'Feature description'}
                      </p>
                      {config.use_custom_llm && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 mt-1 inline-block">
                          Custom LLM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                        <span className="ml-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {updating === featureName ? 'Updating...' : 'Disabled'}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Feature LLM Configuration Modal */}
      {showFeatureConfigModal && selectedFeature && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  Configure {availableFeatures[selectedFeature]?.display_name || selectedFeature}
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  {subscriptions[selectedSubscription]?.customer_email}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowFeatureConfigModal(false);
                  setSelectedFeature(null);
                  setHasUnsavedChanges(false);
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
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>Custom LLM Configuration</h4>
                        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                          Use custom LLM for this feature instead of subscription defaults
                        </p>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={subscriptionFeatures[selectedFeature].use_custom_llm}
                          onChange={(e) => {
                            const currentConfig = subscriptionFeatures[selectedFeature];
                            const updatedConfig = { ...currentConfig, use_custom_llm: e.target.checked };
                            setSubscriptionFeatures(prev => ({
                              ...prev,
                              [selectedFeature]: updatedConfig as FeatureConfig
                            }));
                            // Mark as having unsaved changes
                            setHasUnsavedChanges(true);
                          }}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                             style={{
                               backgroundColor: subscriptionFeatures[selectedFeature].use_custom_llm ? 'var(--accent)' : '#d1d5db'
                             }}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            subscriptionFeatures[selectedFeature].use_custom_llm ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                        <span className="ml-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {subscriptionFeatures[selectedFeature].use_custom_llm ? 'Custom LLM' : 'Default LLM'}
                        </span>
                      </label>
                    </div>

                    {subscriptionFeatures[selectedFeature].use_custom_llm && (
                      <div className="space-y-6 mt-6">
                        {/* Main LLM Configuration */}
                        <div>
                          <h5 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Main LLM</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    {/* Save Button - Show when custom LLM is enabled or when there are changes */}
                    {(subscriptionFeatures[selectedFeature].use_custom_llm || hasUnsavedChanges) && (
                      <div className="flex justify-end pt-4 mt-6" style={{ borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => handleSaveFeatureConfig(subscriptionFeatures[selectedFeature])}
                          className="px-6 py-2 rounded-lg transition-colors font-medium"
                          style={{
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          Save Configuration
                        </button>
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
  );
}