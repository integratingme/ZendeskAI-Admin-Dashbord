'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import { FiToggleLeft, FiToggleRight, FiSettings } from 'react-icons/fi';

interface FeatureConfig {
  is_enabled: boolean;
  use_custom_llm: boolean;
  custom_main_llm_config?: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
    input_price_per_million: number;
    output_price_per_million: number;
  };
  custom_fallback_llm_config?: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
    input_price_per_million: number;
    output_price_per_million: number;
  };
}

interface FeatureConfigurationFormProps {
  featuresConfig: Record<string, FeatureConfig>;
  onChange: (featuresConfig: Record<string, FeatureConfig>) => void;
  providers: Record<string, {
    name: string;
    endpoint: string;
    example_models: string[];
    default_pricing: Record<string, { input: number; output: number }>;
  }>;
}

export default function FeatureConfigurationForm({ 
  featuresConfig, 
  onChange, 
  providers 
}: FeatureConfigurationFormProps) {
  const [availableFeatures, setAvailableFeatures] = useState<Record<string, {
    name: string;
    display_name: string;
    description: string;
    category: string;
  }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedFeature, setExpandedFeature] = useState<string>('');
  const toast = useToastContext();


  const fetchAvailableFeatures = useCallback(async () => {
    try {
      const response = await apiService.getAvailableFeatures();
      if (response.success && response.data) {
        setAvailableFeatures(response.data as Record<string, {
          name: string;
          display_name: string;
          description: string;
          category: string;
        }>);
        
        // Initialize features config if empty
        if (Object.keys(featuresConfig).length === 0) {
          const defaultConfig: Record<string, FeatureConfig> = {};
          Object.keys(response.data as Record<string, unknown>).forEach(featureName => {
            defaultConfig[featureName] = {
              is_enabled: false,
              use_custom_llm: false
            };
          });
          onChange(defaultConfig);
        }
      }
    } catch (error) {
      console.error('Error fetching available features:', error);
      toast.error('Failed to load features', 'Unable to load available features');
    } finally {
      setLoading(false);
    }
  }, [toast, featuresConfig, onChange]);

  useEffect(() => {
    fetchAvailableFeatures();
  }, [fetchAvailableFeatures]);

  const updateFeatureConfig = (featureName: string, updates: Partial<FeatureConfig>) => {
    const newConfig = {
      ...featuresConfig,
      [featureName]: {
        ...featuresConfig[featureName],
        ...updates
      }
    };
    onChange(newConfig);
  };

  const toggleFeature = (featureName: string) => {
    const currentEnabled = featuresConfig[featureName]?.is_enabled || false;
    updateFeatureConfig(featureName, { is_enabled: !currentEnabled });
  };

  const toggleCustomLLM = (featureName: string) => {
    const currentCustom = featuresConfig[featureName]?.use_custom_llm || false;
    updateFeatureConfig(featureName, { use_custom_llm: !currentCustom });
  };

  const updateLLMConfig = (featureName: string, llmType: 'main' | 'fallback', config: {
    provider?: string;
    model?: string;
    endpoint?: string;
    api_key?: string;
    input_price_per_million?: number;
    output_price_per_million?: number;
  }) => {
    const configKey = llmType === 'main' ? 'custom_main_llm_config' : 'custom_fallback_llm_config';
    updateFeatureConfig(featureName, {
      [configKey]: config
    });
  };

  const handleProviderChange = (featureName: string, llmType: 'main' | 'fallback', provider: string) => {
    if (provider && providers[provider]) {
      const providerData = providers[provider];
      const endpoint = providerData.endpoint || '';
      const models = providerData.example_models || [];
      const pricing = providerData.default_pricing || {};
      
      // Get first model's pricing or default to 0
      const firstModel = models[0] || '';
      const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
      
      updateLLMConfig(featureName, llmType, {
        provider,
        endpoint,
        model: firstModel,
        api_key: '',
        input_price_per_million: firstPricing.input || 0,
        output_price_per_million: firstPricing.output || 0
      });
    }
  };

  const groupFeaturesByCategory = () => {
    const grouped: Record<string, Array<{ name: string; display_name: string; description: string; category: string }>> = {};
    
    Object.entries(availableFeatures).forEach(([featureName, feature]) => {
      const category = feature.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ ...feature, name: featureName });
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="admin-card p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
          <span>Loading features...</span>
        </div>
      </div>
    );
  }

  const groupedFeatures = groupFeaturesByCategory();

  return (
    <div className="admin-card p-4">
      <h3 className="font-medium text-gray-900 mb-4">Feature Configuration</h3>
      
      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <div key={category} className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3 capitalize">
              {category.replace(/_/g, ' ')} Features
            </h4>
            
            <div className="space-y-3">
              {features.map((feature) => {
                const featureConfig = featuresConfig[feature.name] || { is_enabled: false, use_custom_llm: false };
                const isExpanded = expandedFeature === feature.name;
                
                return (
                  <div key={feature.name} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium text-gray-900">{feature.display_name}</h5>
                          <button
                            onClick={() => toggleFeature(feature.name)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                              featureConfig.is_enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {featureConfig.is_enabled ? (
                              <>
                                <FiToggleRight className="text-green-600" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <FiToggleLeft className="text-gray-400" />
                                Disabled
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      </div>
                      
                      {featureConfig.is_enabled && (
                        <button
                          onClick={() => setExpandedFeature(isExpanded ? '' : feature.name)}
                          className="ml-3 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          <FiSettings className="inline mr-1" />
                          {isExpanded ? 'Hide' : 'Configure'} LLM
                        </button>
                      )}
                    </div>
                    
                    {featureConfig.is_enabled && isExpanded && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="space-y-4">
                          {/* Custom LLM Toggle */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleCustomLLM(feature.name)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out ${
                                featureConfig.use_custom_llm 
                                  ? 'focus:ring-orange-500' 
                                  : 'focus:ring-gray-400'
                              }`}
                              style={{
                                backgroundColor: featureConfig.use_custom_llm ? 'var(--accent)' : 'var(--border)',
                                transition: 'background-color 0.3s ease'
                              }}
                              role="switch"
                              aria-checked={featureConfig.use_custom_llm}
                              aria-label="Use custom LLM for this feature"
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full transform transition-transform duration-300 ease-in-out ${
                                  featureConfig.use_custom_llm ? 'translate-x-6' : 'translate-x-1'
                                }`}
                                style={{
                                  backgroundColor: 'var(--card-bg)',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                            </button>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Use custom LLM for this feature
                              </span>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                When enabled, this feature will use its own LLM configuration instead of the subscription&apos;s default LLMs
                              </p>
                            </div>
                          </div>
                          
                          {featureConfig.use_custom_llm && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Main LLM Config */}
                              <div className="border border-gray-200 rounded p-3">
                                <h6 className="font-medium text-gray-800 mb-2">Main LLM</h6>
                                <div className="space-y-2">
                                  <select
                                    value={featureConfig.custom_main_llm_config?.provider || ''}
                                    onChange={(e) => handleProviderChange(feature.name, 'main', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Select Provider</option>
                                    {Object.entries(providers).map(([key, provider]) => (
                                      <option key={key} value={key}>{provider.name}</option>
                                    ))}
                                  </select>
                                  
                                  <input
                                    type="text"
                                    placeholder="Model"
                                    value={featureConfig.custom_main_llm_config?.model || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'main', {
                                      ...featureConfig.custom_main_llm_config,
                                      model: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="password"
                                    placeholder="API Key"
                                    value={featureConfig.custom_main_llm_config?.api_key || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'main', {
                                      ...featureConfig.custom_main_llm_config,
                                      api_key: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="url"
                                    placeholder="Endpoint"
                                    value={featureConfig.custom_main_llm_config?.endpoint || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'main', {
                                      ...featureConfig.custom_main_llm_config,
                                      endpoint: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Input Price per Million ($)"
                                    value={featureConfig.custom_main_llm_config?.input_price_per_million || 0}
                                    onChange={(e) => updateLLMConfig(feature.name, 'main', {
                                      ...featureConfig.custom_main_llm_config,
                                      input_price_per_million: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Output Price per Million ($)"
                                    value={featureConfig.custom_main_llm_config?.output_price_per_million || 0}
                                    onChange={(e) => updateLLMConfig(feature.name, 'main', {
                                      ...featureConfig.custom_main_llm_config,
                                      output_price_per_million: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                              
                              {/* Fallback LLM Config */}
                              <div className="border border-gray-200 rounded p-3">
                                <h6 className="font-medium text-gray-800 mb-2">Fallback LLM</h6>
                                <div className="space-y-2">
                                  <select
                                    value={featureConfig.custom_fallback_llm_config?.provider || ''}
                                    onChange={(e) => handleProviderChange(feature.name, 'fallback', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Select Provider</option>
                                    {Object.entries(providers).map(([key, provider]) => (
                                      <option key={key} value={key}>{provider.name}</option>
                                    ))}
                                  </select>
                                  
                                  <input
                                    type="text"
                                    placeholder="Model"
                                    value={featureConfig.custom_fallback_llm_config?.model || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'fallback', {
                                      ...featureConfig.custom_fallback_llm_config,
                                      model: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="password"
                                    placeholder="API Key"
                                    value={featureConfig.custom_fallback_llm_config?.api_key || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'fallback', {
                                      ...featureConfig.custom_fallback_llm_config,
                                      api_key: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="url"
                                    placeholder="Endpoint"
                                    value={featureConfig.custom_fallback_llm_config?.endpoint || ''}
                                    onChange={(e) => updateLLMConfig(feature.name, 'fallback', {
                                      ...featureConfig.custom_fallback_llm_config,
                                      endpoint: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Input Price per Million ($)"
                                    value={featureConfig.custom_fallback_llm_config?.input_price_per_million || 0}
                                    onChange={(e) => updateLLMConfig(feature.name, 'fallback', {
                                      ...featureConfig.custom_fallback_llm_config,
                                      input_price_per_million: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Output Price per Million ($)"
                                    value={featureConfig.custom_fallback_llm_config?.output_price_per_million || 0}
                                    onChange={(e) => updateLLMConfig(feature.name, 'fallback', {
                                      ...featureConfig.custom_fallback_llm_config,
                                      output_price_per_million: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Enabled Features:</strong> {Object.values(featuresConfig).filter(f => f.is_enabled).length} / {Object.keys(availableFeatures).length}
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Features with custom LLMs will use their specific AI models. Others will use the subscription&apos;s default LLMs.
        </p>
      </div>
    </div>
  );
}