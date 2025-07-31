'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FiRefreshCw, FiPlus, FiEye, FiTrash2, FiX, FiEdit, FiRotateCcw } from 'react-icons/fi';
import TierTemplateSelector from '@/components/TierTemplateSelector';
import DateRangePicker from '@/components/DateRangePicker';

interface ProviderData {
  [key: string]: unknown;
}

interface Subscription {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
  subscription_days?: number; // Legacy field
  start_date: string;
  end_date: string;
  tier_template?: string;
  request_limit: number;
  current_usage: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  main_llm: {
    provider: string;
    model: string;
  };
  fallback_llm: {
    provider: string;
    model: string;
  };
  usage_stats?: {
    main_llm_usage?: {
      total_requests?: number;
      estimated_cost_usd?: number;
    };
    fallback_llm_usage?: {
      total_requests?: number;
      estimated_cost_usd?: number;
    };
  };
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [providers, setProviders] = useState<{[key: string]: ProviderData}>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: '', customerEmail: '' });
  const [reactivateDialog, setReactivateDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: '', customerEmail: '' });
  const [reactivating, setReactivating] = useState<string | null>(null);
  
  const toast = useToastContext();
  
  // Form state
  const [formData, setFormData] = useState({
    customer_email: '',
    zendesk_subdomain: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tier_template: '',
    request_limit: 1000,
    main_llm: {
      provider: '',
      endpoint: '',
      model: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    },
    fallback_llm: {
      provider: '',
      endpoint: '',
      model: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    },
    features_config: {}
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    customer_email: '',
    zendesk_subdomain: '',
    start_date: '',
    end_date: '',
    tier_template: '',
    request_limit: 1000,
    main_llm: {
      provider: '',
      endpoint: '',
      model: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    },
    fallback_llm: {
      provider: '',
      endpoint: '',
      model: '',
      api_key: '',
      input_price_per_million: 0,
      output_price_per_million: 0
    }
  });

  const fetchProviders = useCallback(async () => {
    try {
      const response = await apiService.listProviders();
      console.log('Providers response in Subscriptions:', response);
      
      if (response.success && response.data?.providers) {
        console.log('Using success + data.providers path');
        setProviders(response.data.providers as {[key: string]: ProviderData});
      } else if (response.data) {
        console.log('Using data only path');
        setProviders(response.data as {[key: string]: ProviderData});
      } else if ((response as unknown as Record<string, unknown>).providers) {
        console.log('Using direct providers path');
        setProviders((response as unknown as Record<string, unknown>).providers as {[key: string]: ProviderData});
      } else {
        console.log('Using response as-is for providers');
        setProviders(response as unknown as {[key: string]: ProviderData});
      }
      
      console.log('Final providers set:', Object.keys(response as unknown as {[key: string]: Record<string, unknown>}));
    } catch (err) {
      console.error('Error fetching providers:', err);
      toast.error('Failed to load providers', 'Unable to load LLM provider list');
    }
  }, [toast]);

  const fetchSubscriptionsWithValue = useCallback(async (showInactiveValue: boolean, isToggleAction = false) => {
    try {
      if (isToggleAction) {
        setToggleLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await apiService.listSubscriptions(showInactiveValue);
      console.log('Subscriptions response:', response);
      console.log('Response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasSubscriptions: response.data?.subscriptions ? 'yes' : 'no'
      });
      
      let subscriptionsData = null;
      
      // Try multiple response formats
      if (response.success && response.data?.subscriptions) {
        console.log('Using response.data.subscriptions');
        subscriptionsData = response.data.subscriptions;
      } else if (response.data && typeof response.data === 'object') {
        console.log('Using response.data directly');
        subscriptionsData = response.data;
      } else if ((response as unknown as Record<string, unknown>).subscriptions) {
        console.log('Using response.subscriptions');
        subscriptionsData = (response as unknown as Record<string, unknown>).subscriptions;
      } else {
        console.log('No subscriptions data found in response');
        setSubscriptions([]);
        return;
      }
      
      if (subscriptionsData && typeof subscriptionsData === 'object') {
        // Convert the subscriptions object to array format
        const subscriptionsArray = Object.entries(subscriptionsData).map(([key, sub]: [string, Record<string, unknown>]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string,
          subscription_days: sub.subscription_days as number,
          start_date: sub.start_date as string || sub.created_at as string,
          end_date: sub.end_date as string || sub.expires_at as string,
          tier_template: sub.tier_template as string,
          request_limit: sub.request_limit as number || 1000,
          current_usage: sub.current_usage as number || 0,
          created_at: sub.created_at as string,
          expires_at: sub.expires_at as string,
          is_active: sub.is_active as boolean,
          main_llm: {
            provider: (sub.main_llm as Record<string, unknown>)?.provider as string || 'unknown',
            model: (sub.main_llm as Record<string, unknown>)?.model as string || 'unknown'
          },
          fallback_llm: {
            provider: (sub.fallback_llm as Record<string, unknown>)?.provider as string || 'unknown',
            model: (sub.fallback_llm as Record<string, unknown>)?.model as string || 'unknown'
          },
          usage_stats: (sub.usage_stats as Record<string, unknown>) || {
            main_llm_usage: {
              total_requests: 0,
              estimated_cost_usd: 0.0
            },
            fallback_llm_usage: {
              total_requests: 0,
              estimated_cost_usd: 0.0
            }
          }
        }));
        console.log('Parsed subscriptions:', subscriptionsArray.length, 'subscriptions');
        setSubscriptions(subscriptionsArray);
      } else {
        console.log('Invalid subscriptions data format');
        setSubscriptions([]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch subscriptions');
      }
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
      setToggleLoading(false);
    }
  }, []);

  const fetchSubscriptions = useCallback(async (isToggleAction = false) => {
    return fetchSubscriptionsWithValue(showInactive, isToggleAction);
  }, [fetchSubscriptionsWithValue, showInactive]);

  useEffect(() => {
    fetchSubscriptions();
    fetchProviders();
  }, [fetchProviders, showInactive, fetchSubscriptions]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customer_email) {
      toast.warning('Customer Email Required', 'Please enter a customer email address');
      return;
    }
    
    if (!formData.main_llm.provider || !formData.fallback_llm.provider) {
      toast.warning('Providers Required', 'Please select both main and fallback LLM providers');
      return;
    }
    
    if (!formData.main_llm.api_key || !formData.fallback_llm.api_key) {
      toast.warning('API Keys Required', 'Please provide API keys for both LLM providers');
      return;
    }


    setCreating(true);
    try {
      const response = await apiService.createSubscription(formData);
      if (response.success) {
        const subscriptionKey = (response.data as Record<string, unknown>)?.subscription_key as string || 'Generated';
        toast.success('Subscription Created', `New subscription created successfully! Key: ${subscriptionKey}`);
        setShowCreateForm(false);
        resetForm();
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || 'Failed to create subscription');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      if (err instanceof ApiError) {
        toast.error('Failed to Create Subscription', err.message);
      } else {
        toast.error('Failed to Create Subscription', 'An unexpected error occurred');
      }
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_email: '',
      zendesk_subdomain: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tier_template: '',
      request_limit: 1000,
      main_llm: {
        provider: '',
        endpoint: '',
        model: '',
        api_key: '',
        input_price_per_million: 0,
        output_price_per_million: 0
      },
      fallback_llm: {
        provider: '',
        endpoint: '',
        model: '',
        api_key: '',
        input_price_per_million: 0,
        output_price_per_million: 0
      },
      features_config: {}
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalCost = (subscription: Subscription) => {
    try {
      const mainCost = subscription.usage_stats?.main_llm_usage?.estimated_cost_usd || 0;
      const fallbackCost = subscription.usage_stats?.fallback_llm_usage?.estimated_cost_usd || 0;
      return mainCost + fallbackCost;
    } catch (error) {
      console.warn('Error calculating total cost for subscription:', subscription.subscription_key, error);
      return 0;
    }
  };


  const handleTierTemplateSelect = (templateName: string, template: {
    display_name: string;
    description: string;
    suggested_duration_days: number;
    suggested_request_limit: number;
    suggested_main_llm: {
      provider: string;
      model: string;
      endpoint: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    suggested_fallback_llm: {
      provider: string;
      model: string;
      endpoint: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    features: Record<string, {
      enabled: boolean;
      use_custom_llm: boolean;
      description?: string;
    }>;
  } | null) => {
    if (!template) {
      // Reset to default values for custom configuration
      setFormData(prev => ({
        ...prev,
        tier_template: 'custom',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        request_limit: 1000,
        main_llm: {
          provider: '',
          endpoint: '',
          model: '',
          api_key: '',
          input_price_per_million: 0,
          output_price_per_million: 0
        },
        fallback_llm: {
          provider: '',
          endpoint: '',
          model: '',
          api_key: '',
          input_price_per_million: 0,
          output_price_per_million: 0
        },
        features_config: {} // Reset to empty for custom configuration
      }));
      return;
    }

    // Calculate end date based on suggested duration
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + template.suggested_duration_days * 24 * 60 * 60 * 1000);

    setFormData(prev => ({
      ...prev,
      tier_template: templateName,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      request_limit: template.suggested_request_limit,
      main_llm: {
        ...prev.main_llm,
        provider: template.suggested_main_llm.provider,
        model: template.suggested_main_llm.model,
        endpoint: template.suggested_main_llm.endpoint,
        input_price_per_million: template.suggested_main_llm.input_price_per_million,
        output_price_per_million: template.suggested_main_llm.output_price_per_million
      },
      fallback_llm: {
        ...prev.fallback_llm,
        provider: template.suggested_fallback_llm.provider,
        model: template.suggested_fallback_llm.model,
        endpoint: template.suggested_fallback_llm.endpoint,
        input_price_per_million: template.suggested_fallback_llm.input_price_per_million,
        output_price_per_million: template.suggested_fallback_llm.output_price_per_million
      },
      features_config: template.features || {}
    }));
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFormData(prev => ({
      ...prev,
      start_date: startDate,
      end_date: endDate
    }));
  };

  const handleToggleInactive = async (newValue: boolean) => {
    setShowInactive(newValue);
    // Pass the new value directly to avoid stale closure issue
    await fetchSubscriptionsWithValue(newValue, true);
  };

  const handleProviderChange = (llmType: 'main_llm' | 'fallback_llm', provider: string) => {
    const providerData = providers[provider] as Record<string, unknown>;
    console.log('Provider selected:', provider, 'Data:', providerData);
    
    if (providerData) {
      const endpoint = providerData.endpoint as string || '';
      const models = providerData.example_models as string[] || [];
      const pricing = providerData.default_pricing as Record<string, {input: number; output: number}> || {};
      
      // Get first model's pricing or default to 0
      const firstModel = models[0] || '';
      const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
      
      setFormData(prev => ({
        ...prev,
        [llmType]: {
          ...prev[llmType],
          provider,
          endpoint,
          model: firstModel,
          api_key: '',
          input_price_per_million: firstPricing.input || 0,
          output_price_per_million: firstPricing.output || 0
        }
      }));
      
      console.log('Updated form data for', llmType, 'with endpoint:', endpoint, 'model:', firstModel, 'pricing:', firstPricing);
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubscription) return;
    
    setUpdating(true);
    try {
      // Prepare update data - only include changed fields
      const updateData: Record<string, unknown> = {};
      
      if (editFormData.customer_email !== selectedSubscription.customer_email) {
        updateData.customer_email = editFormData.customer_email;
      }
      
      if (editFormData.zendesk_subdomain !== selectedSubscription.zendesk_subdomain) {
        updateData.zendesk_subdomain = editFormData.zendesk_subdomain;
      }
      
      if (editFormData.start_date !== selectedSubscription.start_date) {
        updateData.start_date = editFormData.start_date;
      }
      
      if (editFormData.end_date !== selectedSubscription.end_date) {
        updateData.end_date = editFormData.end_date;
      }
      
      if (editFormData.tier_template !== selectedSubscription.tier_template) {
        updateData.tier_template = editFormData.tier_template;
      }
      
      if (editFormData.request_limit !== selectedSubscription.request_limit) {
        updateData.request_limit = editFormData.request_limit;
      }

      // Check for LLM configuration changes
      if (editFormData.main_llm.provider || editFormData.main_llm.model || editFormData.main_llm.api_key || 
          editFormData.main_llm.endpoint || editFormData.main_llm.input_price_per_million || 
          editFormData.main_llm.output_price_per_million) {
        updateData.main_llm = editFormData.main_llm;
      }

      if (editFormData.fallback_llm.provider || editFormData.fallback_llm.model || editFormData.fallback_llm.api_key || 
          editFormData.fallback_llm.endpoint || editFormData.fallback_llm.input_price_per_million || 
          editFormData.fallback_llm.output_price_per_million) {
        updateData.fallback_llm = editFormData.fallback_llm;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No Changes', 'No changes were made to the subscription');
        setShowEditModal(false);
        setSelectedSubscription(null);
        return;
      }

      const response = await apiService.updateSubscription(selectedSubscription.subscription_key, updateData);
      
      if (response.success) {
        toast.success('Subscription Updated', 'Subscription has been updated successfully');
        setShowEditModal(false);
        setSelectedSubscription(null);
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      toast.error('Update Failed', 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubscription = async () => {
    try {
      const response = await apiService.deleteSubscription(confirmDialog.subscriptionKey);
      
      if (response.success) {
        toast.success('Subscription Deleted', 'Subscription has been deleted successfully');
        setConfirmDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' });
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || 'Failed to delete subscription');
      }
    } catch (err) {
      console.error('Error deleting subscription:', err);
      toast.error('Delete Failed', 'Failed to delete subscription');
    }
  };

  const canReactivateSubscription = (subscription: Subscription): boolean => {
    // Can only reactivate inactive subscriptions
    if (subscription.is_active) return false;
    
    // Check if the end date allows reactivation (end date should be in the future)
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    
    return endDate > now;
  };

  const handleReactivateSubscription = async () => {
    if (!reactivateDialog.subscriptionKey) return;
    
    try {
      setReactivating(reactivateDialog.subscriptionKey);
      const response = await apiService.reactivateSubscription(reactivateDialog.subscriptionKey);
      
      if (response.success) {
        toast.success('Subscription Reactivated', 'Subscription has been reactivated successfully');
        setReactivateDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' });
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || 'Failed to reactivate subscription');
      }
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      toast.error('Reactivation Failed', 'Failed to reactivate subscription');
    } finally {
      setReactivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <div className="text-gray-600">Loading subscriptions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={() => fetchSubscriptions()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Subscriptions</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => fetchSubscriptions()}
            className="admin-button-outline px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FiRefreshCw className="text-sm" />
            Refresh
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="admin-button px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FiPlus className="text-sm" />
            Create Subscription
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="admin-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Show inactive subscriptions
              </span>
              <button
                onClick={() => handleToggleInactive(!showInactive)}
                disabled={toggleLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out ${
                  showInactive 
                    ? 'focus:ring-orange-500' 
                    : 'focus:ring-gray-400'
                }`}
                style={{
                  backgroundColor: showInactive ? 'var(--accent)' : 'var(--border)',
                  transition: 'background-color 0.3s ease'
                }}
                role="switch"
                aria-checked={showInactive}
                aria-label="Toggle inactive subscriptions"
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transform transition-transform duration-300 ease-in-out ${
                    showInactive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
          </div>
          <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} found
            {showInactive && (
              <span className="ml-2">
                ({subscriptions.filter(s => s.is_active).length} active, {subscriptions.filter(s => !s.is_active).length} inactive)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="admin-card overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  LLM Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              {subscriptions.map((subscription) => (
                <tr key={subscription.subscription_key} className="transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {subscription.customer_email}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {subscription.zendesk_subdomain}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                        {subscription.tier_template ? subscription.tier_template.charAt(0).toUpperCase() + subscription.tier_template.slice(1) : 'Custom'}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        {subscription.request_limit === -1 ? 'Unlimited' : `${subscription.request_limit.toLocaleString()} requests`}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        Expires: {formatDate(subscription.end_date)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                        Main: {subscription.main_llm.provider}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        Fallback: {subscription.fallback_llm.provider}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                        {subscription.current_usage.toLocaleString()} / {subscription.request_limit === -1 ? 'Unlimited' : subscription.request_limit.toLocaleString()}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                        ${getTotalCost(subscription).toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscription.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {canReactivateSubscription(subscription) && (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                          Can Reactivate
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FiEye className="text-sm" />
                        View
                      </button>
                      {subscription.is_active && (
                        <button 
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setEditFormData({
                              customer_email: subscription.customer_email,
                              zendesk_subdomain: subscription.zendesk_subdomain,
                              start_date: subscription.start_date,
                              end_date: subscription.end_date,
                              tier_template: subscription.tier_template || '',
                              request_limit: subscription.request_limit,
                              main_llm: {
                                provider: subscription.main_llm.provider,
                                endpoint: '',
                                model: subscription.main_llm.model,
                                api_key: '',
                                input_price_per_million: 0,
                                output_price_per_million: 0
                              },
                              fallback_llm: {
                                provider: subscription.fallback_llm.provider,
                                endpoint: '',
                                model: subscription.fallback_llm.model,
                                api_key: '',
                                input_price_per_million: 0,
                                output_price_per_million: 0
                              }
                            });
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        >
                          <FiEdit className="text-sm" />
                          Edit
                        </button>
                      )}
                      {canReactivateSubscription(subscription) && (
                        <button 
                          onClick={() => {
                            setReactivateDialog({
                              isOpen: true,
                              subscriptionKey: subscription.subscription_key,
                              customerEmail: subscription.customer_email
                            });
                          }}
                          disabled={reactivating === subscription.subscription_key}
                          className="text-orange-600 hover:text-orange-900 flex items-center gap-1 disabled:opacity-50"
                        >
                          {reactivating === subscription.subscription_key ? (
                            <FiRefreshCw className="text-sm animate-spin" />
                          ) : (
                            <FiRotateCcw className="text-sm" />
                          )}
                          Reactivate
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            subscriptionKey: subscription.subscription_key,
                            customerEmail: subscription.customer_email
                          });
                        }}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <FiTrash2 className="text-sm" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {subscriptions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No subscriptions found</p>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create New Subscription</h2>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubscription} className="space-y-6">
              {/* Tier Template Selection */}
              <TierTemplateSelector
                selectedTemplate={formData.tier_template}
                onTemplateSelect={handleTierTemplateSelect}
              />

              {/* Basic Information */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Email *
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="customer@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zendesk Subdomain *
                    </label>
                    <input
                      type="text"
                      value={formData.zendesk_subdomain}
                      onChange={(e) => setFormData(prev => ({ ...prev, zendesk_subdomain: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="company"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Request Limit
                    </label>
                    <input
                      type="number"
                      value={formData.request_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, request_limit: parseInt(e.target.value) || 1000 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="1000"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to -1 for unlimited requests</p>
                  </div>
                </div>
              </div>

              {/* Date Range Selection */}
              <DateRangePicker
                startDate={formData.start_date}
                endDate={formData.end_date}
                onChange={handleDateRangeChange}
              />

              {/* Main LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Main LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider *
                    </label>
                    <select
                      value={formData.main_llm.provider}
                      onChange={(e) => handleProviderChange('main_llm', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select Provider</option>
                      {Object.entries(providers).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={formData.main_llm.model}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, model: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter model name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={formData.main_llm.api_key}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, api_key: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter API key"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint
                    </label>
                    <input
                      type="url"
                      value={formData.main_llm.endpoint}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, endpoint: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="API endpoint URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.main_llm.input_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, input_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million input tokens</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.main_llm.output_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, output_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million output tokens</p>
                  </div>
                </div>
              </div>

              {/* Fallback LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Fallback LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider *
                    </label>
                    <select
                      value={formData.fallback_llm.provider}
                      onChange={(e) => handleProviderChange('fallback_llm', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select Provider</option>
                      {Object.entries(providers).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={formData.fallback_llm.model}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, model: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter model name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={formData.fallback_llm.api_key}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, api_key: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter API key"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint
                    </label>
                    <input
                      type="url"
                      value={formData.fallback_llm.endpoint}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, endpoint: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="API endpoint URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fallback_llm.input_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, input_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million input tokens</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fallback_llm.output_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, output_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million output tokens</p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="admin-button-outline px-6 py-2 rounded-lg flex items-center gap-2"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="admin-button px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Subscription
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Subscription Modal */}
      {showViewModal && selectedSubscription && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Subscription Details</h2>
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSubscription(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Email:</span> {selectedSubscription.customer_email}</div>
                  <div><span className="font-medium">Subdomain:</span> {selectedSubscription.zendesk_subdomain}</div>
                  <div><span className="font-medium">Subscription Key:</span> <code className="text-xs bg-gray-100 px-1 rounded">{selectedSubscription.subscription_key}</code></div>
                </div>
              </div>
              
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Subscription Details</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Tier:</span> {selectedSubscription.tier_template || 'Custom'}</div>
                  <div><span className="font-medium">Start Date:</span> {formatDate(selectedSubscription.start_date)}</div>
                  <div><span className="font-medium">End Date:</span> {formatDate(selectedSubscription.end_date)}</div>
                  <div><span className="font-medium">Request Limit:</span> {selectedSubscription.request_limit === -1 ? 'Unlimited' : selectedSubscription.request_limit.toLocaleString()}</div>
                  <div><span className="font-medium">Current Usage:</span> {selectedSubscription.current_usage.toLocaleString()}</div>
                  <div><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      selectedSubscription.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSubscription.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Main LLM</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Provider:</span> {selectedSubscription.main_llm.provider}</div>
                  <div><span className="font-medium">Model:</span> {selectedSubscription.main_llm.model}</div>
                </div>
              </div>
              
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Fallback LLM</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Provider:</span> {selectedSubscription.fallback_llm.provider}</div>
                  <div><span className="font-medium">Model:</span> {selectedSubscription.fallback_llm.model}</div>
                </div>
              </div>
              
              <div className="admin-card p-4 md:col-span-2">
                <h3 className="font-medium text-gray-900 mb-3">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Main LLM Usage</div>
                    <div>Requests: {selectedSubscription.usage_stats?.main_llm_usage?.total_requests?.toLocaleString() || '0'}</div>
                    <div>Cost: ${(selectedSubscription.usage_stats?.main_llm_usage?.estimated_cost_usd || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Fallback LLM Usage</div>
                    <div>Requests: {selectedSubscription.usage_stats?.fallback_llm_usage?.total_requests?.toLocaleString() || '0'}</div>
                    <div>Cost: ${(selectedSubscription.usage_stats?.fallback_llm_usage?.estimated_cost_usd || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSubscription(null);
                }}
                className="admin-button-outline px-6 py-2 rounded-lg flex items-center gap-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && selectedSubscription && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Edit Subscription</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSubscription(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateSubscription} className="space-y-6">
              {/* Basic Information */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
                    <input
                      type="email"
                      value={editFormData.customer_email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zendesk Subdomain</label>
                    <input
                      type="text"
                      value={editFormData.zendesk_subdomain}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, zendesk_subdomain: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={editFormData.start_date}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={editFormData.end_date}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Request Limit</label>
                    <input
                      type="number"
                      value={editFormData.request_limit}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, request_limit: parseInt(e.target.value) || 1000 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Main LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Main LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider *
                    </label>
                    <select
                      value={editFormData.main_llm.provider}
                      onChange={(e) => {
                        const provider = e.target.value;
                        if (provider && providers[provider]) {
                          const providerData = providers[provider] as Record<string, unknown>;
                          const endpoint = providerData.endpoint as string || '';
                          const models = providerData.example_models as string[] || [];
                          const pricing = providerData.default_pricing as Record<string, {input: number; output: number}> || {};
                          
                          // Get first model's pricing or default to 0
                          const firstModel = models[0] || '';
                          const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                          
                          setEditFormData(prev => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              provider,
                              endpoint,
                              model: firstModel,
                              api_key: '',
                              input_price_per_million: firstPricing.input || 0,
                              output_price_per_million: firstPricing.output || 0
                            }
                          }));
                          
                          console.log('Updated edit form data for main_llm with endpoint:', endpoint);
                        } else {
                          setEditFormData(prev => ({ 
                            ...prev, 
                            main_llm: { ...prev.main_llm, provider }
                          }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select Provider</option>
                      {Object.entries(providers).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={editFormData.main_llm.model}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, model: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter model name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={editFormData.main_llm.api_key}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, api_key: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter API key"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint
                    </label>
                    <input
                      type="url"
                      value={editFormData.main_llm.endpoint}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, endpoint: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="API endpoint URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.main_llm.input_price_per_million}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, input_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million input tokens</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.main_llm.output_price_per_million}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, output_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million output tokens</p>
                  </div>
                </div>
              </div>

              {/* Fallback LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Fallback LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider *
                    </label>
                    <select
                      value={editFormData.fallback_llm.provider}
                      onChange={(e) => {
                        const provider = e.target.value;
                        if (provider && providers[provider]) {
                          const providerData = providers[provider] as Record<string, unknown>;
                          const endpoint = providerData.endpoint as string || '';
                          const models = providerData.example_models as string[] || [];
                          const pricing = providerData.default_pricing as Record<string, {input: number; output: number}> || {};
                          
                          // Get first model's pricing or default to 0
                          const firstModel = models[0] || '';
                          const firstPricing = firstModel && pricing[firstModel] ? pricing[firstModel] : { input: 0, output: 0 };
                          
                          setEditFormData(prev => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              provider,
                              endpoint,
                              model: firstModel,
                              api_key: '',
                              input_price_per_million: firstPricing.input || 0,
                              output_price_per_million: firstPricing.output || 0
                            }
                          }));
                          
                          console.log('Updated edit form data for fallback_llm with endpoint:', endpoint);
                        } else {
                          setEditFormData(prev => ({ 
                            ...prev, 
                            fallback_llm: { ...prev.fallback_llm, provider }
                          }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select Provider</option>
                      {Object.entries(providers).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={editFormData.fallback_llm.model}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, model: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter model name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={editFormData.fallback_llm.api_key}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, api_key: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter API key"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint
                    </label>
                    <input
                      type="url"
                      value={editFormData.fallback_llm.endpoint}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, endpoint: e.target.value }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="API endpoint URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.fallback_llm.input_price_per_million}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, input_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million input tokens</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price per Million Tokens ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.fallback_llm.output_price_per_million}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, output_price_per_million: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cost per 1 million output tokens</p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSubscription(null);
                  }}
                  className="admin-button-outline px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="admin-button px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Subscription
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Subscription"
        message={`Are you sure you want to delete the subscription for ${confirmDialog.customerEmail}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSubscription}
        onCancel={() => setConfirmDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' })}
        type="danger"
      />

      {/* Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={reactivateDialog.isOpen}
        title="Reactivate Subscription"
        message={`Are you sure you want to reactivate the subscription for ${reactivateDialog.customerEmail}? This will make the subscription active again until its expiration date.`}
        confirmText="Reactivate"
        cancelText="Cancel"
        type="success"
        onConfirm={handleReactivateSubscription}
        onCancel={() => setReactivateDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' })}
      />
    </div>
  );
}