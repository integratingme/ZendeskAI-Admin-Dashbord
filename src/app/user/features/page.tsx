'use client';

import { useState, useEffect, useCallback } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { FiSettings, FiX, FiRefreshCw, FiPlay } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import { useToastContext } from '@/contexts/ToastContext';
import UserLayout from '@/components/UserLayout';

interface LLMConfig {
  provider: string;
  model: string;
  endpoint: string;
  api_key: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

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

export default function UserFeatureManagement() {
  const { user } = useUserAuth();
  const toast = useToastContext();
  
  const [features, setFeatures] = useState<Record<string, FeatureConfig>>({});
  const [availableFeatures, setAvailableFeatures] = useState<Record<string, AvailableFeature>>({});
  const [providers, setProviders] = useState<Record<string, { 
    name?: string;
    endpoint?: string; 
    example_models?: string[]; 
    default_pricing?: Record<string, { input: number; output: number }>;
  }>>({});
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showFeatureConfigModal, setShowFeatureConfigModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  // Track only test-in-flight state separately to avoid global reload/UI churn
  const [testingFeature, setTestingFeature] = useState<string | null>(null);

  // Core features that cannot be disabled by users
  const coreFeatures = ['ticket', 'format_ticket'];
  
  const isCoreFeature = (featureName: string) => coreFeatures.includes(featureName);

  const loadData = useCallback(async () => {
    if (!user?.access_token) return;

    try {
      // Kick off all requests but handle each independently to allow progressive UI
      setLoadingFeatures(true);
      setLoadingAvailable(true);
      setLoadingProviders(true);

      // Features
      userApiService.getFeatures(user.access_token)
        .then((featuresResponse) => {
          if (featuresResponse.success) {
            const coreFeatures = ['ticket', 'format_ticket'];
            const userManageableFeatures = Object.fromEntries(
              Object.entries(featuresResponse.features || {}).filter(
                ([featureName]) => !coreFeatures.includes(featureName)
              )
            ) as Record<string, FeatureConfig>;
            const normalizedFeatures = Object.fromEntries(
              Object.entries(userManageableFeatures).map(([name, cfg]) => {
                const { feature_usage_count, ...rest } = cfg as FeatureConfig;
                const finalCfg: FeatureConfig = { ...rest };
                if (typeof feature_usage_count === 'number' && feature_usage_count > 0) {
                  finalCfg.feature_usage_count = feature_usage_count;
                }
                return [name, finalCfg];
              })
            ) as Record<string, FeatureConfig>;
            setFeatures(normalizedFeatures);
          }
        })
        .catch((err) => {
          console.error('Error loading features:', err);
        })
        .finally(() => setLoadingFeatures(false));

      // Available features
      userApiService.getAvailableFeatures(user.access_token)
        .then((availableFeaturesResponse) => {
          if (availableFeaturesResponse.success) {
            const coreFeatures = ['ticket', 'format_ticket'];
            const userManageableAvailableFeatures = Object.fromEntries(
              Object.entries(availableFeaturesResponse.features || {}).filter(
                ([featureName]) => !coreFeatures.includes(featureName)
              )
            ) as Record<string, AvailableFeature>;
            setAvailableFeatures(userManageableAvailableFeatures);
          }
        })
        .catch((err) => {
          console.error('Error loading available features:', err);
        })
        .finally(() => setLoadingAvailable(false));

      // Providers
      userApiService.getProviders(user.access_token)
        .then((providersResponse) => {
          if (providersResponse.success) {
            setProviders(providersResponse.providers || {});
          }
        })
        .catch((err) => {
          console.error('Error loading providers:', err);
        })
        .finally(() => setLoadingProviders(false));

    } catch (error) {
      console.error('Error loading feature data:', error);
      toast.error('Failed to load features', 'Unable to load feature data');
      setLoadingFeatures(false);
      setLoadingAvailable(false);
      setLoadingProviders(false);
    }
  }, [user?.access_token, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set page title
  useEffect(() => {
    document.title = 'User Dashboard - Features';
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleToggleFeature = async (featureName: string, enabled: boolean) => {
    if (!user?.access_token) return;

    // Check if this is a core feature that cannot be disabled
    if (isCoreFeature(featureName) && !enabled) {
      toast.error(
        'Cannot disable core feature',
        `${availableFeatures[featureName]?.display_name || featureName} is a core feature and cannot be disabled`
      );
      return;
    }

    try {
      setUpdating(featureName);
      
      const currentConfig = features[featureName] || {};
      const updatedConfig = {
        ...currentConfig,
        is_enabled: enabled
      };

      const response = await userApiService.updateFeatureConfig(
        user.access_token,
        featureName,
        updatedConfig
      );
      
      if (response.success) {
        await loadData();
        toast.success(
          `Feature ${enabled ? 'enabled' : 'disabled'}`,
          `${availableFeatures[featureName]?.display_name || featureName} has been ${enabled ? 'enabled' : 'disabled'}`
        );
      } else {
        toast.error('Update failed', response.message || 'Failed to update feature status');
      }
    } catch (error: unknown) {
      console.error('Error updating feature:', error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('core feature')) {
        toast.error('Cannot modify core feature', 'This feature is essential and cannot be modified');
      } else {
        toast.error('Update failed', 'Failed to update feature status');
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleConfigureFeature = (featureName: string) => {
    setSelectedFeature(featureName);
    setShowFeatureConfigModal(true);
  };

  const handleSaveFeatureConfig = async (updatedConfig: FeatureConfig) => {
    if (!user?.access_token || !selectedFeature) return;

    try {
      const response = await userApiService.saveAndTestFeature(
        user.access_token,
        selectedFeature,
        updatedConfig
      );
      
      if (response.success) {
        await loadData();
        toast.success('Configuration saved', 'Feature configuration has been saved successfully');
        setShowFeatureConfigModal(false);
        setSelectedFeature(null);
      } else {
        toast.error('Save failed', response.message || 'Failed to save feature configuration');
      }
    } catch (error) {
      console.error('Error saving feature configuration:', error);
      toast.error('Save failed', 'Failed to save feature configuration');
    }
  };

  const handleTestFeature = async (featureName: string) => {
    if (!user?.access_token) return;

    try {
      setTestingFeature(featureName);
      const response = await userApiService.testFeatureLLM(user.access_token, featureName);
      if (response.success) {
        toast.success('Test successful', 'LLM configuration is working correctly');
        // Optional: update a last-tested timestamp locally here for better UX
      } else {
        toast.error('Test failed', 'LLM configuration test failed');
      }
    } catch (error) {
      console.error('Error testing feature:', error);
      toast.error('Test failed', 'Failed to test LLM configuration');
    } finally {
      setTestingFeature(null);
    }
  };




  if (loadingFeatures || loadingAvailable || loadingProviders) {
    return (
      <UserLayout activeSection="features">
        <div className="space-y-6">
        {/* Header (real text) */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Configure and manage your AI features
          </h1>
          <div className="p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
              <strong>Note:</strong> Core features (ticket processing, formatting) are always enabled and managed by your subscription settings.
            </p>
          </div>
        </div>

        {/* Active Features (skeleton items) */}
        <div className="user-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Active Features
          </h3>
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`active-skel-${i}`}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded skeleton-block" />
                  <div className="h-3 w-72 rounded skeleton-block" />
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 rounded skeleton-block" />
                    <div className="h-4 w-24 rounded skeleton-block" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded skeleton-block" />
                  <div className="h-6 w-12 rounded skeleton-block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Features (skeleton items) */}
        <div className="user-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Not Available with your subscription
          </h3>
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`avail-skel-${i}`}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 rounded skeleton-block" />
                  <div className="h-3 w-80 rounded skeleton-block" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-24 rounded skeleton-block" />
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeSection="features">
      <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Configure and manage your AI features
        </h1>
        <div className="p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            <strong>Note:</strong> Core features (ticket processing, formatting) are always enabled and managed by your subscription settings.
          </p>
        </div>
      </div>

      {/* Active Features */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Active Features
        </h3>
        {!loadingFeatures && Object.keys(features).length === 0 && (
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            No active features.
          </p>
        )}
        <div className="space-y-3">
          {Object.entries(features)
            .filter(([, config]) => config.is_enabled)
            .map(([featureName, config]) => (
              <div
                key={featureName}
                className="flex items-center justify-between p-4 rounded-lg border"
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
                  <div className="flex items-center gap-2 mt-1">
                    {config.use_custom_llm && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 inline-block">
                        Custom LLM
                      </span>
                    )}
                    {config.feature_request_limit && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 inline-block">
                        Limit: {config.feature_request_limit}
                      </span>
                    )}
                    {config.feature_usage_count !== undefined && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 inline-block">
                        Used: {config.feature_usage_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.is_enabled && (
                    <button
                      onClick={() => handleConfigureFeature(featureName)}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)'
                      }}
                      title="Configure"
                    >
                      <FiSettings />
                    </button>
                  )}
                  {config.use_custom_llm && (
                    <button
                      onClick={() => handleTestFeature(featureName)}
                      disabled={testingFeature === featureName}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none'
                      }}
                      title="Test LLM"
                    >
                      {testingFeature === featureName ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiPlay />
                      )}
                    </button>
                  )}
                  {/* Enable/disable is admin-only; remove user toggle */}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Inactive Features */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Not Available with your subscription
        </h3>
        {Object.entries(features).filter(([, config]) => !config.is_enabled).length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              All available features are currently enabled.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(features)
              .filter(([, config]) => !config.is_enabled)
              .map(([featureName, config]) => (
              <div
                key={featureName}
                className="flex items-center justify-between p-4 rounded-lg border opacity-70"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)'
                }}
              >
                <div className="flex-1">
                  <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {availableFeatures[featureName]?.display_name || featureName}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    {availableFeatures[featureName]?.description || 'Feature description'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {config.use_custom_llm && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 inline-block">
                        Custom LLM
                      </span>
                    )}
                    {config.feature_request_limit && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 inline-block">
                        Limit: {config.feature_request_limit}
                      </span>
                    )}
                    {config.feature_usage_count !== undefined && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 inline-block">
                        Used: {config.feature_usage_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Hide Configure button for disabled features */}
                  {config.is_enabled && (
                    <button
                      onClick={() => handleConfigureFeature(featureName)}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)'
                      }}
                      title="Configure"
                    >
                      <FiSettings />
                    </button>
                  )}
                  {/* Enable/disable is admin-only; remove user toggle */}
                </div>
              </div>
              ))}
          </div>
        )}
      </div>

      {/* Feature Configuration Modal */}
      {showFeatureConfigModal && selectedFeature && (
        <FeatureConfigModal
          featureName={selectedFeature}
          feature={features[selectedFeature]}
          availableFeature={availableFeatures[selectedFeature]}
          providers={providers}
          onSave={handleSaveFeatureConfig}
          onClose={() => {
            setShowFeatureConfigModal(false);
            setSelectedFeature(null);
          }}
        />
      )}
      </div>
    </UserLayout>
  );
}

// Feature Configuration Modal Component
interface FeatureConfigModalProps {
  featureName: string;
  feature: FeatureConfig;
  availableFeature: AvailableFeature;
  providers: Record<string, { 
    name?: string;
    endpoint?: string; 
    example_models?: string[]; 
    default_pricing?: Record<string, { input: number; output: number }>;
  }>;
  onSave: (config: FeatureConfig) => Promise<void>;
  onClose: () => void;
}

function FeatureConfigModal({ 
  featureName, 
  feature, 
  availableFeature, 
  providers, 
  onSave, 
  onClose 
}: FeatureConfigModalProps) {
  const [config, setConfig] = useState<FeatureConfig>(feature);

  const createLLMConfig = (partial: Partial<LLMConfig> = {}): LLMConfig => ({
    provider: '',
    model: '',
    endpoint: '',
    api_key: '',
    input_price_per_million: 0,
    output_price_per_million: 0,
    ...partial
  });

  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
      <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll" style={{ background: 'var(--card-bg)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              Configure {availableFeature?.display_name || featureName}
            </h2>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              {availableFeature?.description}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--foreground)', opacity: 0.5 }}
          >
            <FiX className="text-xl" />
          </button>
        </div>
        
        <div className="space-y-6">

          {!config.is_enabled && (
            <div className="p-3 rounded-lg mb-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                This feature is currently disabled by your administrator. You can view settings but cannot make changes.
              </p>
            </div>
          )}
          {/* Custom LLM Configuration */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <label className="flex items-center justify-between cursor-pointer mb-4">
              <div>
                <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>Custom LLM Configuration</h4>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Use custom LLM for this feature instead of subscription defaults
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.use_custom_llm}
                onChange={(e) => setConfig({ ...config, use_custom_llm: e.target.checked })}
                className="sr-only"
                disabled={!config.is_enabled}
              />
              <div 
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: !config.is_enabled ? '#e5e7eb' : (config.use_custom_llm ? 'var(--accent)' : '#d1d5db'), opacity: !config.is_enabled ? 0.6 : 1 }}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.use_custom_llm ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </div>
            </label>

            {config.use_custom_llm && (
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
                        value={config.custom_main_llm_config?.provider || ''}
                        onChange={(provider) => {
                          const providerData = providers[provider];
                          if (provider && providerData) {
                            const endpoint = providerData.endpoint || '';
                            const models = providerData.example_models || [];
                            const pricing = providerData.default_pricing || {};
                            const firstModel = models[0] || '';
                            const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                            setConfig({
                              ...config,
                              custom_main_llm_config: createLLMConfig({
                                ...config.custom_main_llm_config,
                                provider,
                                endpoint,
                                model: firstModel,
                                input_price_per_million: firstPricing.input || 0,
                                output_price_per_million: firstPricing.output || 0,
                              }),
                            });
                          } else {
                            setConfig({
                              ...config,
                              custom_main_llm_config: createLLMConfig({ provider }),
                            });
                          }
                        }}
                        options={Object.entries(providers).map(([key, prov]) => ({ value: key, label: prov.name || key }))}
                        placeholder="Select Provider"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={config.custom_main_llm_config?.model || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
                            model: e.target.value
                          })
                        })}
                        disabled={!config.is_enabled}
                        className="w-full p-3 rounded-lg border transition-colors"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          opacity: !config.is_enabled ? 0.6 : 1
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
                        value={config.custom_main_llm_config?.api_key || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
                            api_key: e.target.value
                          })
                        })}
                        disabled={!config.is_enabled}
                        className="w-full p-3 rounded-lg border transition-colors"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          opacity: !config.is_enabled ? 0.6 : 1
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
                        value={config.custom_main_llm_config?.endpoint || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
                            endpoint: e.target.value
                          })
                        })}
                        disabled={!config.is_enabled}
                        className="w-full p-3 rounded-lg border transition-colors"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          opacity: !config.is_enabled ? 0.6 : 1
                        }}
                        placeholder="API endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Input Price per Million ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.custom_main_llm_config?.input_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
                            input_price_per_million: parseFloat(e.target.value) || 0
                          })
                        })}
                        disabled={!config.is_enabled}
                        className="w-full p-3 rounded-lg border transition-colors"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          opacity: !config.is_enabled ? 0.6 : 1
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Output Price per Million ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.custom_main_llm_config?.output_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
                            output_price_per_million: parseFloat(e.target.value) || 0
                          })
                        })}
                        disabled={!config.is_enabled}
                        className="w-full p-3 rounded-lg border transition-colors"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          opacity: !config.is_enabled ? 0.6 : 1
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
                        value={config.custom_fallback_llm_config?.provider || ''}
                        onChange={(provider) => {
                          const providerData = providers[provider];
                          if (provider && providerData) {
                            const endpoint = providerData.endpoint || '';
                            const models = providerData.example_models || [];
                            const pricing = providerData.default_pricing || {};
                            const firstModel = models[0] || '';
                            const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                            setConfig({
                              ...config,
                              custom_fallback_llm_config: createLLMConfig({
                                ...config.custom_fallback_llm_config,
                                provider,
                                endpoint,
                                model: firstModel,
                                input_price_per_million: firstPricing.input || 0,
                                output_price_per_million: firstPricing.output || 0,
                              }),
                            });
                          } else {
                            setConfig({
                              ...config,
                              custom_fallback_llm_config: createLLMConfig({ provider }),
                            });
                          }
                        }}
                        options={Object.entries(providers).map(([key, prov]) => ({ value: key, label: prov.name || key }))}
                        placeholder="Select Provider"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={config.custom_fallback_llm_config?.model || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_fallback_llm_config: createLLMConfig({
                            ...config.custom_fallback_llm_config,
                            model: e.target.value
                          })
                        })}
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
                        value={config.custom_fallback_llm_config?.api_key || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_fallback_llm_config: createLLMConfig({
                            ...config.custom_fallback_llm_config,
                            api_key: e.target.value
                          })
                        })}
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
                        value={config.custom_fallback_llm_config?.endpoint || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_fallback_llm_config: createLLMConfig({
                            ...config.custom_fallback_llm_config,
                            endpoint: e.target.value
                          })
                        })}
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
                        Input Price per Million ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.custom_fallback_llm_config?.input_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_fallback_llm_config: createLLMConfig({
                            ...config.custom_fallback_llm_config,
                            input_price_per_million: parseFloat(e.target.value) || 0
                          })
                        })}
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
                        Output Price per Million ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.custom_fallback_llm_config?.output_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_fallback_llm_config: createLLMConfig({
                            ...config.custom_fallback_llm_config,
                            output_price_per_million: parseFloat(e.target.value) || 0
                          })
                        })}
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
            
            {/* Test and Save Buttons */}
            <div className="flex justify-end pt-4 mt-6">
              <button
                onClick={handleSave}
                disabled={!config.is_enabled || !isFeatureConfigValid(config) || saving}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-medium ${(!config.is_enabled || !isFeatureConfigValid(config) || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none'
                }}
                aria-busy={saving}
                aria-live="polite"
                title={!config.is_enabled
                  ? 'This feature is disabled by admin'
                  : !isFeatureConfigValid(config)
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
        </div>
      </div>
    </div>
  );
}