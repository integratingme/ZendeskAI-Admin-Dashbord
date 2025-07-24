'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FiRefreshCw, FiPlus, FiEye, FiTrash2, FiX, FiCheck } from 'react-icons/fi';

interface ProviderData {
  [key: string]: unknown;
}

interface Subscription {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
  subscription_days: number;
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
  usage_stats: {
    main_llm_usage: {
      total_requests: number;
      estimated_cost_usd: number;
    };
    fallback_llm_usage: {
      total_requests: number;
      estimated_cost_usd: number;
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
  const [creating, setCreating] = useState(false);
  const [providers, setProviders] = useState<{[key: string]: ProviderData}>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: '', customerEmail: '' });
  
  const toast = useToastContext();
  
  // Form state
  const [formData, setFormData] = useState({
    customer_email: '',
    zendesk_subdomain: '',
    subscription_days: 30,
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

  useEffect(() => {
    fetchSubscriptions();
    fetchProviders();
  }, [fetchProviders]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.listSubscriptions();
      console.log('Subscriptions response:', response);
      
      if (response.success && response.data?.subscriptions) {
        // Convert the subscriptions object to array format
        const subscriptionsArray = Object.entries(response.data.subscriptions).map(([key, sub]: [string, Record<string, unknown>]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string,
          subscription_days: sub.subscription_days as number,
          created_at: sub.created_at as string,
          expires_at: sub.expires_at as string,
          is_active: sub.is_active as boolean,
          main_llm: {
            provider: (sub.main_llm as Record<string, unknown>).provider as string,
            model: (sub.main_llm as Record<string, unknown>).model as string
          },
          fallback_llm: {
            provider: (sub.fallback_llm as Record<string, unknown>).provider as string,
            model: (sub.fallback_llm as Record<string, unknown>).model as string
          },
          usage_stats: sub.usage_stats as {
            main_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
            fallback_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
          }
        }));
        setSubscriptions(subscriptionsArray);
      } else if (response.data) {
        // Handle case where subscriptions are directly in data
        const subscriptionsArray = Object.entries(response.data as Record<string, Record<string, unknown>>).map(([key, sub]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string,
          subscription_days: sub.subscription_days as number,
          created_at: sub.created_at as string,
          expires_at: sub.expires_at as string,
          is_active: sub.is_active as boolean,
          main_llm: {
            provider: (sub.main_llm as Record<string, unknown>).provider as string,
            model: (sub.main_llm as Record<string, unknown>).model as string
          },
          fallback_llm: {
            provider: (sub.fallback_llm as Record<string, unknown>).provider as string,
            model: (sub.fallback_llm as Record<string, unknown>).model as string
          },
          usage_stats: sub.usage_stats as {
            main_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
            fallback_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
          }
        }));
        
        setSubscriptions(subscriptionsArray);
      } else if ((response as unknown as Record<string, unknown>).subscriptions) {
        // Handle case where subscriptions are directly in response
        const subscriptionsArray = Object.entries((response as unknown as Record<string, unknown>).subscriptions as Record<string, Record<string, unknown>>).map(([key, sub]: [string, Record<string, unknown>]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string,
          zendesk_subdomain: sub.zendesk_subdomain as string,
          subscription_days: sub.subscription_days as number,
          created_at: sub.created_at as string,
          expires_at: sub.expires_at as string,
          is_active: sub.is_active as boolean,
          main_llm: {
            provider: (sub.main_llm as Record<string, unknown>).provider as string,
            model: (sub.main_llm as Record<string, unknown>).model as string
          },
          fallback_llm: {
            provider: (sub.fallback_llm as Record<string, unknown>).provider as string,
            model: (sub.fallback_llm as Record<string, unknown>).model as string
          },
          usage_stats: sub.usage_stats as {
            main_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
            fallback_llm_usage: {
              total_requests: number;
              estimated_cost_usd: number;
            };
          }
        }));
        setSubscriptions(subscriptionsArray);
      } else {
        console.log('No subscriptions found in expected format, trying response as-is');
        // Try to use response directly as subscriptions object
        const subscriptionsArray = Object.entries(response as unknown as Record<string, Record<string, unknown>>).map(([key, sub]: [string, Record<string, unknown>]) => ({
          subscription_key: key,
          customer_email: sub.customer_email as string || 'Unknown',
          zendesk_subdomain: sub.zendesk_subdomain as string || 'Unknown',
          subscription_days: sub.subscription_days as number || 30,
          created_at: sub.created_at as string || new Date().toISOString(),
          expires_at: sub.expires_at as string || new Date().toISOString(),
          is_active: sub.is_active as boolean || true,
          main_llm: {
            provider: ((sub.main_llm as Record<string, unknown>)?.provider as string) || 'Unknown',
            model: ((sub.main_llm as Record<string, unknown>)?.model as string) || 'Unknown'
          },
          fallback_llm: {
            provider: ((sub.fallback_llm as Record<string, unknown>)?.provider as string) || 'Unknown',
            model: ((sub.fallback_llm as Record<string, unknown>)?.model as string) || 'Unknown'
          },
          usage_stats: {
            main_llm_usage: {
              total_requests: 0,
              estimated_cost_usd: 0
            },
            fallback_llm_usage: {
              total_requests: 0,
              estimated_cost_usd: 0
            }
          }
        }));
        setSubscriptions(subscriptionsArray);
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
    }
  };

  const handleDeleteSubscription = (subscriptionKey: string, customerEmail: string) => {
    setConfirmDialog({
      isOpen: true,
      subscriptionKey,
      customerEmail
    });
  };

  const confirmDelete = async () => {
    try {
      const response = await apiService.deleteSubscription(confirmDialog.subscriptionKey);
      if (response.success) {
        // Remove from local state
        setSubscriptions(prev => prev.filter(sub => sub.subscription_key !== confirmDialog.subscriptionKey));
        toast.success('Subscription Deleted', 'Subscription has been successfully removed');
      } else {
        throw new Error(response.message || 'Failed to delete subscription');
      }
    } catch (err) {
      console.error('Error deleting subscription:', err);
      if (err instanceof ApiError) {
        toast.error('Failed to Delete Subscription', err.message);
      } else {
        toast.error('Failed to Delete Subscription', 'An unexpected error occurred');
      }
    } finally {
      setConfirmDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' });
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, subscriptionKey: '', customerEmail: '' });
  };

  const handleViewSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowViewModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleProviderChange = (llmType: 'main_llm' | 'fallback_llm', provider: string) => {
    const providerData = providers[provider];
    if (providerData) {
      setFormData(prev => ({
        ...prev,
        [llmType]: {
          ...prev[llmType],
          provider,
          endpoint: providerData.endpoint as string,
          model: (providerData.example_models as string[])[0] || '',
          input_price_per_million: Object.values(providerData.default_pricing as Record<string, {input: number; output: number}>)[0]?.input || 0,
          output_price_per_million: Object.values(providerData.default_pricing as Record<string, {input: number; output: number}>)[0]?.output || 0
        }
      }));
    }
  };

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
      subscription_days: 30,
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
  };

  const getTotalCost = (subscription: Subscription) => {
    return subscription.usage_stats.main_llm_usage.estimated_cost_usd + 
           subscription.usage_stats.fallback_llm_usage.estimated_cost_usd;
  };

  const getTotalRequests = (subscription: Subscription) => {
    return subscription.usage_stats.main_llm_usage.total_requests + 
           subscription.usage_stats.fallback_llm_usage.total_requests;
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
          onClick={fetchSubscriptions}
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
        <h1 className="text-2xl font-bold text-black">Subscriptions</h1>
        <div className="flex gap-3">
          <button 
            onClick={fetchSubscriptions}
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

      {/* Subscriptions Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LLM Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((subscription) => (
                <tr key={subscription.subscription_key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.customer_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {subscription.zendesk_subdomain}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {subscription.subscription_days} days
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires: {formatDate(subscription.expires_at)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        Main: {subscription.main_llm.provider}
                      </div>
                      <div className="text-sm text-gray-500">
                        Fallback: {subscription.fallback_llm.provider}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {getTotalRequests(subscription)} requests
                      </div>
                      <div className="text-sm text-gray-500">
                        ${getTotalCost(subscription).toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      subscription.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {subscription.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewSubscription(subscription)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FiEye className="text-sm" />
                        View
                      </button>
                      <button 
                        onClick={() => handleDeleteSubscription(subscription.subscription_key, subscription.customer_email)}
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
          <button 
            onClick={() => setShowCreateForm(true)}
            className="mt-4 admin-button px-6 py-2 rounded-lg"
          >
            Create First Subscription
          </button>
        </div>
      )}

      {/* View Subscription Modal */}
      {showViewModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Subscription Details</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Subscription Key:</span>
                    <p className="font-mono text-xs break-all">{selectedSubscription.subscription_key}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer Email:</span>
                    <p>{selectedSubscription.customer_email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Zendesk Subdomain:</span>
                    <p>{selectedSubscription.zendesk_subdomain}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p>{selectedSubscription.subscription_days} days</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p>{formatDateTime(selectedSubscription.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Expires:</span>
                    <p>{formatDateTime(selectedSubscription.expires_at)}</p>
                  </div>
                </div>
              </div>

              {/* LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Main LLM</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Provider:</span> {selectedSubscription.main_llm.provider}</p>
                      <p><span className="text-gray-600">Model:</span> {selectedSubscription.main_llm.model}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fallback LLM</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Provider:</span> {selectedSubscription.fallback_llm.provider}</p>
                      <p><span className="text-gray-600">Model:</span> {selectedSubscription.fallback_llm.model}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Usage Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Main LLM Usage</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Requests:</span> {selectedSubscription.usage_stats.main_llm_usage.total_requests.toLocaleString()}</p>
                      <p><span className="text-gray-600">Cost:</span> ${selectedSubscription.usage_stats.main_llm_usage.estimated_cost_usd.toFixed(6)}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fallback LLM Usage</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Requests:</span> {selectedSubscription.usage_stats.fallback_llm_usage.total_requests.toLocaleString()}</p>
                      <p><span className="text-gray-600">Cost:</span> ${selectedSubscription.usage_stats.fallback_llm_usage.estimated_cost_usd.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost:</span>
                    <span className="font-medium">${getTotalCost(selectedSubscription).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Requests:</span>
                    <span className="font-medium">{getTotalRequests(selectedSubscription).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowViewModal(false)}
                className="admin-button-outline px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      Subscription Duration
                    </label>
                    <select
                      value={formData.subscription_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, subscription_days: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={365}>365 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Main LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Main LLM Configuration</h3>
                {/* Debug info */}
                <div className="mb-2 text-xs text-gray-500">
                  Providers loaded: {Object.keys(providers).length} ({Object.keys(providers).join(', ')})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {Object.keys(providers).length === 0 ? (
                        <option disabled>Loading providers...</option>
                      ) : (
                        Object.entries(providers).map(([key, provider]) => (
                          <option key={key} value={key}>{provider.name as string}</option>
                        ))
                      )}
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
                      Input Price (per 1M tokens)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.main_llm.input_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, input_price_per_million: parseFloat(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price (per 1M tokens)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.main_llm.output_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        main_llm: { ...prev.main_llm, output_price_per_million: parseFloat(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Fallback LLM Configuration */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-4">Fallback LLM Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {Object.keys(providers).length === 0 ? (
                        <option disabled>Loading providers...</option>
                      ) : (
                        Object.entries(providers).map(([key, provider]) => (
                          <option key={key} value={key}>{provider.name as string}</option>
                        ))
                      )}
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
                      Input Price (per 1M tokens)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.fallback_llm.input_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, input_price_per_million: parseFloat(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Price (per 1M tokens)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.fallback_llm.output_price_per_million}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        fallback_llm: { ...prev.fallback_llm, output_price_per_million: parseFloat(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
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
                  className="admin-button-outline px-6 py-2 rounded-lg"
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
                      <FiCheck className="text-sm" />
                      Create Subscription
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Subscription"
        message={`Are you sure you want to delete the subscription for "${confirmDialog.customerEmail}"? This action cannot be undone and will immediately disable access for this customer.`}
        confirmText="Delete Subscription"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}