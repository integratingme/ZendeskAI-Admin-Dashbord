'use client';

import { useState, useEffect, useCallback } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { FiSettings, FiX, FiRefreshCw, FiPlay, FiSave } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import { useToastContext } from '@/contexts/ToastContext';

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
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showFeatureConfigModal, setShowFeatureConfigModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Core features that cannot be disabled by users
  const coreFeatures = ['ticket', 'format_ticket'];
  
  const isCoreFeature = (featureName: string) => coreFeatures.includes(featureName);

  const loadData = useCallback(async () => {
    if (!user?.access_token) return;

    try {
      setLoading(true);
      
      const [featuresResponse, availableFeaturesResponse, providersResponse] = await Promise.all([
        userApiService.getFeatures(user.access_token),
        userApiService.getAvailableFeatures(user.access_token),
        userApiService.getProviders(user.access_token)
      ]);

      if (featuresResponse.success) {
        // Filter out core features that cannot be managed by users
        const coreFeatures = ['ticket', 'format_ticket'];
        const userManageableFeatures = Object.fromEntries(
          Object.entries(featuresResponse.features || {}).filter(
            ([featureName]) => !coreFeatures.includes(featureName)
          )
        ) as Record<string, FeatureConfig>;
        // Normalize: hide usage count when zero to avoid placeholder-like "Used: 0"
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

      if (availableFeaturesResponse.success) {
        // Filter out core features from available features too
        const coreFeatures = ['ticket', 'format_ticket'];
        const userManageableAvailableFeatures = Object.fromEntries(
          Object.entries(availableFeaturesResponse.features || {}).filter(
            ([featureName]) => !coreFeatures.includes(featureName)
          )
        ) as Record<string, AvailableFeature>;
        setAvailableFeatures(userManageableAvailableFeatures);
      }

      if (providersResponse.success) {
        setProviders(providersResponse.providers || {});
      }

    } catch (error) {
      console.error('Error loading feature data:', error);
      toast.error('Failed to load features', 'Unable to load feature data');
    } finally {
      setLoading(false);
    }
  }, [user?.access_token, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setUpdating(featureName);
      
      const response = await userApiService.testFeatureLLM(user.access_token, featureName);
      
      if (response.success) {
        toast.success('Test successful', 'LLM configuration is working correctly');
      } else {
        toast.error('Test failed', 'LLM configuration test failed');
      }
    } catch (error) {
      console.error('Error testing feature:', error);
      toast.error('Test failed', 'Failed to test LLM configuration');
    } finally {
      setUpdating(null);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <FiRefreshCw className="animate-spin text-xl" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--foreground)' }}>Loading features...</span>
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
            Configure and manage your AI features
          </h1>
          <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
              <strong>Note:</strong> Core features (ticket processing, formatting) are always enabled and managed by your subscription settings.
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none'
          }}
        >
          <FiRefreshCw />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Features */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Active Features
        </h3>
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
                  {config.use_custom_llm && (
                    <button
                      onClick={() => handleTestFeature(featureName)}
                      disabled={updating === featureName}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none'
                      }}
                      title="Test LLM"
                    >
                      {updating === featureName ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiPlay />
                      )}
                    </button>
                  )}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={(e) => handleToggleFeature(featureName, e.target.checked)}
                      disabled={updating === featureName}
                      className="sr-only"
                    />
                    <div 
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </div>
                  </label>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Inactive Features */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Available Features
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
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => handleToggleFeature(featureName, e.target.checked)}
                      disabled={updating === featureName}
                      className="sr-only"
                    />
                    <div 
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ backgroundColor: '#d1d5db' }}
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </div>
                  </label>
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
  onSave: (config: FeatureConfig) => void;
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

  const handleSave = () => {
    onSave(config);
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
          {/* Enable/Disable Feature */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>Enable Feature</h4>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Turn this feature on or off
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.is_enabled}
                onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                className="sr-only"
              />
              <div 
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: config.is_enabled ? 'var(--accent)' : '#d1d5db' }}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </div>
            </label>
          </div>

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
              />
              <div 
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: config.use_custom_llm ? 'var(--accent)' : '#d1d5db' }}
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
                        value={config.custom_main_llm_config?.api_key || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
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
                        value={config.custom_main_llm_config?.endpoint || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
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
                        value={config.custom_main_llm_config?.input_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
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
                        value={config.custom_main_llm_config?.output_price_per_million || 0}
                        onChange={(e) => setConfig({
                          ...config,
                          custom_main_llm_config: createLLMConfig({
                            ...config.custom_main_llm_config,
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
            <div className="flex justify-end pt-4 mt-6" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-medium"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none'
                }}
              >
                <FiSave />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}