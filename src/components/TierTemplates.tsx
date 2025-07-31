'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import { FiRefreshCw, FiEye } from 'react-icons/fi';

interface TierTemplate {
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
}

export default function TierTemplates() {
  const [templates, setTemplates] = useState<Record<string, TierTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const toast = useToastContext();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getTierTemplates();
      
      if (response.success && response.data) {
        setTemplates(response.data as Record<string, TierTemplate>);
      } else {
        console.warn('No templates found in response');
      }
    } catch (error) {
      console.error('Error fetching tier templates:', error);
      toast.error('Failed to load tier templates', 'Unable to load template data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);



  const getEnabledFeaturesCount = (features: Record<string, { enabled: boolean; use_custom_llm: boolean; description?: string }>) => {
    if (!features || typeof features !== 'object') return 0;
    return Object.values(features).filter((feature) => feature?.enabled).length;
  };

  const getTotalFeaturesCount = (features: Record<string, { enabled: boolean; use_custom_llm: boolean; description?: string }>) => {
    if (!features || typeof features !== 'object') return 0;
    return Object.keys(features).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <div className="text-gray-600">Loading tier templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Tier Templates</h1>
        <div className="flex gap-3">
          <button 
            onClick={fetchTemplates}
            className="admin-button-outline px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FiRefreshCw className="text-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Templates Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(templates).map(([key, template]) => (
          <div key={key} className="admin-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {template.display_name}
              </h3>
              <button
                onClick={() => setSelectedTemplate(selectedTemplate === key ? '' : key)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FiEye className="text-lg" />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              {template.description}
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="font-medium">{template.suggested_duration_days || 0} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Request Limit:</span>
                <span className="font-medium">
                  {template.suggested_request_limit === -1 
                    ? 'Unlimited' 
                    : (template.suggested_request_limit || 0).toLocaleString()
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Features:</span>
                <span className="font-medium">
                  {getEnabledFeaturesCount(template.features)} / {getTotalFeaturesCount(template.features)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Main LLM:</span>
                <span className="font-medium text-xs">
                  {template.suggested_main_llm?.provider || 'Not configured'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(templates).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tier templates found</p>
          <button 
            onClick={fetchTemplates}
            className="mt-4 admin-button px-6 py-2 rounded-lg"
          >
            Refresh Templates
          </button>
        </div>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && templates[selectedTemplate] && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {templates[selectedTemplate].display_name} Template
              </h2>
              <button 
                onClick={() => setSelectedTemplate('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiEye className="text-xl" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Template Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Template Key:</span>
                    <p className="font-mono text-xs">{selectedTemplate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p>{templates[selectedTemplate].description}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p>{templates[selectedTemplate].suggested_duration_days} days</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Request Limit:</span>
                    <p>
                      {templates[selectedTemplate].suggested_request_limit === -1 
                        ? 'Unlimited' 
                        : (templates[selectedTemplate].suggested_request_limit || 0).toLocaleString()
                      }
                    </p>
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
                      <p><span className="text-gray-600">Provider:</span> {templates[selectedTemplate].suggested_main_llm.provider}</p>
                      <p><span className="text-gray-600">Model:</span> {templates[selectedTemplate].suggested_main_llm.model}</p>
                      <p><span className="text-gray-600">Input Price:</span> ${templates[selectedTemplate].suggested_main_llm.input_price_per_million}/1M tokens</p>
                      <p><span className="text-gray-600">Output Price:</span> ${templates[selectedTemplate].suggested_main_llm.output_price_per_million}/1M tokens</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fallback LLM</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Provider:</span> {templates[selectedTemplate].suggested_fallback_llm.provider}</p>
                      <p><span className="text-gray-600">Model:</span> {templates[selectedTemplate].suggested_fallback_llm.model}</p>
                      <p><span className="text-gray-600">Input Price:</span> ${templates[selectedTemplate].suggested_fallback_llm.input_price_per_million}/1M tokens</p>
                      <p><span className="text-gray-600">Output Price:</span> ${templates[selectedTemplate].suggested_fallback_llm.output_price_per_million}/1M tokens</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="admin-card p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Features ({getEnabledFeaturesCount(templates[selectedTemplate].features)} enabled)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(templates[selectedTemplate].features).map(([featureName, config]) => (
                    <div key={featureName} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <span className="text-sm font-medium">{featureName.replace(/_/g, ' ')}</span>
                        {config.description && (
                          <p className="text-xs text-gray-500">{config.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          config.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {config.use_custom_llm && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Custom LLM
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setSelectedTemplate('')}
                className="admin-button-outline px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}