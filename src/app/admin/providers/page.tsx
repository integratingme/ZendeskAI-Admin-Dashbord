'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiError } from '@/lib/api';

import type { Provider } from '@/lib/api';

// interface ProviderOld__REMOVE_ME { // kept temporarily if needed for local edits

  // name: string;
  // endpoint: string;
  // auth_type: string;
  // format: string;
  // example_models: string[];
  // models_guide: string;
  // default_pricing: {
    // [key: string]: {
      // input: number;
      // output: number;
    // };
  // };
// }

import AdminLayout from '@/components/AdminLayout';

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Providers';
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.listProviders();
      if (response.success && response.providers) {
        setProviders(response.providers);
      } else {
        console.log('No providers found in response');
        setProviders({});
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch providers');
      }
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <AdminLayout activeSection="providers">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <div className="text-gray-600">Loading providers...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeSection="providers">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Providers</h1>
            <button 
              onClick={fetchProviders}
              className="admin-button-outline px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={fetchProviders}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="providers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Providers</h1>
          <button 
            onClick={fetchProviders}
            className="admin-button-outline px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(providers).map(([key, provider]) => (
            <div key={key} className="admin-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{provider.name}</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Endpoint:</p>
                  <p className="text-sm text-gray-600 break-all">{provider.endpoint}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Auth Type:</p>
                  <p className="text-sm text-gray-600">{provider.auth_type}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Format:</p>
                  <p className="text-sm text-gray-600">{provider.format}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Example Models:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {provider.example_models.slice(0, 3).map((model) => (
                      <span key={model} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {model}
                      </span>
                    ))}
                    {provider.example_models.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        +{provider.example_models.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Documentation:</p>
                  <p className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    {provider.models_guide}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Sample Pricing (per 1M tokens):</p>
                  <div className="mt-1 space-y-1">
                    {Object.entries(provider.default_pricing).slice(0, 2).map(([model, pricing]) => (
                      <div key={model} className="text-xs text-gray-600">
                        <span className="font-medium">{model}:</span> 
                        <span className="ml-1">In: ${pricing.input} | Out: ${pricing.output}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}