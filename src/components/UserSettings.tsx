'use client';

import { useState, useEffect, useCallback } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { FiUser, FiKey, FiServer, FiRefreshCw, FiCopy, FiCheck, FiEdit3, FiSave, FiX } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import { useToastContext } from '@/contexts/ToastContext';

export default function UserSettings() {
  const { user, subscription, refreshUserData } = useUserAuth();
  const toast = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      await refreshUserData();
      toast.success('Data refreshed', 'Account information has been updated');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Refresh failed', 'Failed to refresh account data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success('Copied!', `${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Copy failed', 'Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getUsagePercentage = () => {
    if (!subscription?.limits) return 0;
    const { current_usage, request_limit } = subscription.limits;
    if (request_limit <= 0) return 0;
    return Math.min((current_usage / request_limit) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return 'var(--accent)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Manage your account information and subscription details
          </h1>
        </div>
        <button 
          onClick={handleRefreshData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none'
          }}
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Account Information */}
      <div className="user-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiUser className="text-xl" style={{ color: 'var(--accent)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Account Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Email Address
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={user?.email || ''}
                  readOnly
                  className="flex-1 p-3 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(user?.email || '', 'Email')}
                  className="p-3 rounded-lg transition-colors"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                >
                  {copiedField === 'Email' ? <FiCheck className="text-green-500" /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Zendesk Subdomain
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={subscription?.subdomain || ''}
                  readOnly
                  className="flex-1 p-3 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(subscription?.subdomain || '', 'Subdomain')}
                  className="p-3 rounded-lg transition-colors"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                >
                  {copiedField === 'Subdomain' ? <FiCheck className="text-green-500" /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Subscription Tier
              </label>
              <input
                type="text"
                value={subscription?.tier || 'Standard'}
                readOnly
                className="w-full p-3 rounded-lg border"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Subscription Status
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={subscription?.status === 'active' ? 'Active' : 'Inactive'}
                  readOnly
                  className="flex-1 p-3 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: subscription?.status === 'active' ? '#22c55e' : '#ef4444'
                  }}
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: subscription?.status === 'active' ? '#22c55e' : '#ef4444'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Created Date
              </label>
              <input
                type="text"
                value={formatDate(subscription?.dates?.created_at || '')}
                readOnly
                className="w-full p-3 rounded-lg border"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Expires At
              </label>
              <input
                type="text"
                value={formatDate(subscription?.dates?.expires_at || '')}
                readOnly
                className="w-full p-3 rounded-lg border"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Key */}
      <div className="user-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiKey className="text-xl" style={{ color: 'var(--accent)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Subscription Key
          </h3>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            Your Subscription Key
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="password"
              value={user?.subscription_key || ''}
              readOnly
              className="flex-1 p-3 rounded-lg border font-mono"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            />
            <button
              onClick={() => copyToClipboard(user?.subscription_key || '', 'Subscription Key')}
              className="p-3 rounded-lg transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none'
              }}
            >
              {copiedField === 'Subscription Key' ? <FiCheck /> : <FiCopy />}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Keep this key secure. It provides access to your AI features and subscription.
          </p>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="user-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiServer className="text-xl" style={{ color: 'var(--accent)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Usage Statistics
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                API Requests
              </span>
              <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {subscription?.limits?.current_usage || 0} / {(subscription?.limits?.request_limit || 0) > 0 ? subscription?.limits?.request_limit : '∞'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${getUsagePercentage()}%`,
                  backgroundColor: getUsageColor()
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {getUsagePercentage().toFixed(1)}% used
              </span>
              {(subscription?.limits?.request_limit || 0) > 0 && (
                <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  {(subscription?.limits?.request_limit || 0) - (subscription?.limits?.current_usage || 0)} remaining
                </span>
              )}
            </div>
          </div>

          {getUsagePercentage() >= 80 && (
            <div 
              className="p-3 rounded-lg"
              style={{
                background: getUsagePercentage() >= 90 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${getUsagePercentage() >= 90 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {getUsagePercentage() >= 90 ? '⚠️ High Usage Warning' : '📊 Usage Notice'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {getUsagePercentage() >= 90 
                  ? 'You are approaching your request limit. Consider upgrading your plan.'
                  : 'You have used most of your monthly requests. Monitor your usage carefully.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

     {/* LLM Configuration */}
     {subscription && (
       <LLMConfigurationSection 
         subscription={subscription}
         onConfigUpdate={refreshUserData}
       />
     )}

      {/* Support Information */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Support & Help
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Need help with your subscription?</span>
            <span style={{ color: 'var(--accent)' }}>Contact your administrator</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Technical support:</span>
            <span style={{ color: 'var(--accent)' }}>Check documentation</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>Feature requests:</span>
            <span style={{ color: 'var(--accent)' }}>Submit feedback</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// LLM Configuration Section Component
interface LLMConfigurationSectionProps {
  subscription: {
    llm_config?: {
      main_llm: {
        provider: string;
        model: string;
        endpoint: string;
        api_key: string;
        input_price_per_million: number;
        output_price_per_million: number;
      };
      fallback_llm: {
        provider: string;
        model: string;
        endpoint: string;
        api_key: string;
        input_price_per_million: number;
        output_price_per_million: number;
      };
    };
  };
  onConfigUpdate: () => void;
}

function LLMConfigurationSection({ subscription, onConfigUpdate }: LLMConfigurationSectionProps) {
  const { user } = useUserAuth();
  const toast = useToastContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [providers, setProviders] = useState<Record<string, { 
    name?: string;
    endpoint?: string; 
    example_models?: string[]; 
    default_pricing?: Record<string, { input: number; output: number }>;
  }>>({});
  const [saving, setSaving] = useState(false);

  
  const [llmConfig, setLlmConfig] = useState({
    main_llm: {
      provider: '',
      model: '',
      endpoint: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    },
    fallback_llm: {
      provider: '',
      model: '',
      endpoint: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    }
  });

  const loadProviders = useCallback(async () => {
    if (!user?.access_token) return;
    
    try {
      const response = await userApiService.getProviders(user.access_token);
      if (response.success) {
        setProviders(response.providers || {});
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  }, [user?.access_token]);

  const loadCurrentConfig = useCallback(() => {
    if (!subscription?.llm_config) return;

    const parseConfig = (config: unknown) => {
      if (!config) return null;
      if (typeof config === 'string') {
        try { return JSON.parse(config); } catch { return null; }
      }
      return config;
    };

    const mainLlm = parseConfig(subscription.llm_config?.main_llm);
    const fallbackLlm = parseConfig(subscription.llm_config?.fallback_llm);

    setLlmConfig({
      main_llm: {
        provider: mainLlm?.provider || '',
        model: mainLlm?.model || '',
        endpoint: mainLlm?.endpoint || '',
        api_key: mainLlm?.api_key || '',
        input_price_per_million: mainLlm?.input_price_per_million || 0,
        output_price_per_million: mainLlm?.output_price_per_million || 0
      },
      fallback_llm: {
        provider: fallbackLlm?.provider || '',
        model: fallbackLlm?.model || '',
        endpoint: fallbackLlm?.endpoint || '',
        api_key: fallbackLlm?.api_key || '',
        input_price_per_million: fallbackLlm?.input_price_per_million || 0,
        output_price_per_million: fallbackLlm?.output_price_per_million || 0
      }
    });
  }, [subscription]);

  useEffect(() => {
    loadProviders();
    loadCurrentConfig();
  }, [loadProviders, loadCurrentConfig]);

  const handleProviderChange = (llmType: 'main_llm' | 'fallback_llm', provider: string) => {
    const providerData = providers[provider];
    
    if (provider && providerData) {
      const endpoint = providerData.endpoint || '';
      const models = providerData.example_models || [];
      const pricing = providerData.default_pricing || {};
      const firstModel = models[0] || '';
      const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
      
      setLlmConfig(prev => ({
        ...prev,
        [llmType]: {
          ...prev[llmType],
          provider,
          endpoint,
          model: firstModel,
          input_price_per_million: firstPricing.input || 0,
          output_price_per_million: firstPricing.output || 0
        }
      }));
    } else {
      setLlmConfig(prev => ({
        ...prev,
        [llmType]: {
          ...prev[llmType],
          provider,
          endpoint: '',
          model: '',
          input_price_per_million: 0,
          output_price_per_million: 0
        }
      }));
    }
  };

  const handleConfigChange = (llmType: 'main_llm' | 'fallback_llm', field: string, value: string | number) => {
    setLlmConfig(prev => ({
      ...prev,
      [llmType]: {
        ...prev[llmType],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!user?.access_token) return;

    try {
      setSaving(true);
      
      const response = await userApiService.updateSubscriptionLLMConfig(user.access_token, llmConfig);
      
      if (response.success) {
        await onConfigUpdate();
        toast.success('Configuration saved', 'LLM configuration has been updated successfully');
        setIsEditing(false);
      } else {
        toast.error('Save failed', response.message || 'Failed to save LLM configuration');
      }
    } catch (error) {
      console.error('Error saving LLM config:', error);
      toast.error('Save failed', 'Failed to save LLM configuration');
    } finally {
      setSaving(false);
    }
  };




  const renderLLMConfig = (llmType: 'main_llm' | 'fallback_llm', title: string) => {
    const config = llmConfig[llmType];

    
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
          {title}
        </div>
        
        <div className="space-y-2">
          {isEditing ? (
            <>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Provider</div>
                <ThemedSelect
                  value={config.provider}
                  onChange={(provider) => handleProviderChange(llmType, provider)}
                  options={Object.entries(providers).map(([key, prov]) => ({ value: key, label: prov.name || key }))}
                  placeholder="Select Provider"
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Model</div>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => handleConfigChange(llmType, 'model', e.target.value)}
                  className="w-full p-2 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="Enter model name"
                />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>API Key</div>
                <input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => handleConfigChange(llmType, 'api_key', e.target.value)}
                  className="w-full p-2 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Endpoint</div>
                <input
                  type="url"
                  value={config.endpoint}
                  onChange={(e) => handleConfigChange(llmType, 'endpoint', e.target.value)}
                  className="w-full p-2 rounded-lg border"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="API endpoint URL"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Input Price ($/M)</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.input_price_per_million}
                    onChange={(e) => handleConfigChange(llmType, 'input_price_per_million', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)'
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Output Price ($/M)</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.output_price_per_million}
                    onChange={(e) => handleConfigChange(llmType, 'output_price_per_million', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Provider</div>
                <div className="p-2 rounded-lg border" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  {config.provider || 'Not configured'}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Model</div>
                <div className="p-2 rounded-lg border" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  {config.model || 'Not configured'}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Endpoint</div>
                <div className="p-2 rounded-lg border break-all" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  {config.endpoint || 'Not configured'}
                </div>
              </div>
              {(config.input_price_per_million > 0 || config.output_price_per_million > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Input Price</div>
                    <div className="p-2 rounded-lg border" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      ${config.input_price_per_million}/M
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Output Price</div>
                    <div className="p-2 rounded-lg border" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      ${config.output_price_per_million}/M
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="user-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FiServer className="text-xl" style={{ color: 'var(--accent)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Subscription LLM Configuration
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadCurrentConfig(); // Reset changes
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                <FiX />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiSave />
                )}
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none'
              }}
            >
              <FiEdit3 />
              <span>Edit Configuration</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderLLMConfig('main_llm', 'Main LLM')}
        {renderLLMConfig('fallback_llm', 'Fallback LLM')}
      </div>
      

    </div>
  );
}