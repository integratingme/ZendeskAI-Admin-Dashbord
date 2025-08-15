'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';
import ThemedSelect from '@/components/ThemedSelect';

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

interface TierTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateName: string, template: TierTemplate | null) => void;
}

export default function TierTemplateSelector({ selectedTemplate, onTemplateSelect }: TierTemplateSelectorProps) {
  const [templates, setTemplates] = useState<Record<string, TierTemplate>>({});
  const [loading, setLoading] = useState(true);
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
      toast.error('Failed to load tier templates', 'Unable to load template options');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplateChange = async (templateName: string) => {
    if (templateName === '') {
      onTemplateSelect('', null);
    } else {
      try {
        const response = await apiService.getTierTemplate(templateName);
        if (response.success && (response as unknown as Record<string, unknown>).template) {
          onTemplateSelect(templateName, (response as unknown as Record<string, unknown>).template as TierTemplate);
        } else {
          console.error('Failed to fetch template details:', response);
          onTemplateSelect(templateName, templates[templateName]);
        }
      } catch (error) {
        console.error('Error fetching template details:', error);
        onTemplateSelect(templateName, templates[templateName]);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <h3 className="font-medium mb-4" style={{ color: 'var(--foreground)' }}>Tier Template (Loading...)</h3>
        <div className="animate-pulse">
          <div className="h-10 rounded" style={{ background: 'var(--border)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <h3 className="font-medium mb-4" style={{ color: 'var(--foreground)' }}>Tier Template (Optional)</h3>
      <div className="space-y-4">
        <ThemedSelect
          value={selectedTemplate}
          onChange={(name) => handleTemplateChange(name)}
          options={[{ value: '', label: 'Custom Configuration' }, ...Object.entries(templates).map(([key, template]) => ({ value: key, label: template.display_name }))]}
          className="w-full"
          placeholder="Custom Configuration"
        />
        
        {selectedTemplate && templates[selectedTemplate] && (
          <div className="rounded-lg p-4 border" style={{ 
            background: 'var(--card-bg)', 
            border: '1px solid var(--accent)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              {templates[selectedTemplate].display_name}
            </h4>
            <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
              {templates[selectedTemplate].description}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>Duration:</span>
                <span className="ml-1" style={{ color: 'var(--foreground)' }}>
                  {templates[selectedTemplate].suggested_duration_days} days
                </span>
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>Request Limit:</span>
                <span className="ml-1" style={{ color: 'var(--foreground)' }}>
                  {templates[selectedTemplate].suggested_request_limit === -1 
                    ? 'Unlimited' 
                    : templates[selectedTemplate].suggested_request_limit.toLocaleString()
                  }
                </span>
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>Main LLM:</span>
                <span className="ml-1" style={{ color: 'var(--foreground)' }}>
                  {templates[selectedTemplate].suggested_main_llm.provider} / {templates[selectedTemplate].suggested_main_llm.model}
                </span>
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>Fallback LLM:</span>
                <span className="ml-1" style={{ color: 'var(--foreground)' }}>
                  {templates[selectedTemplate].suggested_fallback_llm.provider} / {templates[selectedTemplate].suggested_fallback_llm.model}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <span className="font-medium" style={{ color: 'var(--accent)' }}>Features:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(templates[selectedTemplate].features)
                  .filter(([, config]) => config.enabled)
                  .map(([featureName]) => (
                    <span 
                      key={featureName}
                      className="inline-block text-xs px-2 py-1 rounded-full border"
                      style={{
                        background: 'var(--background)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent)',
                        fontSize: '0.75rem'
                      }}
                    >
                      {featureName.replace(/_/g, ' ')}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}