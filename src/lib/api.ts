// API configuration and service functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Response type interfaces
interface AdminToken {
  token_id: string;
  token_preview: string;
  created_at: string;
  created_by: string;
  last_used: string | null;
  description: string;
  is_active: boolean;
  is_current_token?: boolean;
}

interface GenerateTokenResponse {
  success: boolean;
  token: string;
  message: string;
}

interface TokenListResponse {
  success: boolean;
  data: {
    count: number;
    max_allowed: number;
    tokens: {[key: string]: AdminToken};
  };
  message: string;
}

interface RevokeTokenResponse {
  success: boolean;
  message: string;
}

interface SubscriptionResponse {
  success: boolean;
  subscriptions?: Record<string, unknown>;
  count?: number;
  data?: {
    subscriptions?: Record<string, unknown>;
    count?: number;
  };
  message: string;
}

interface AnalyticsResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
}

interface ProvidersResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
}

interface TestingResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
}



export class ApiService {
  private baseURL: string;
  private adminToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Try to get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.adminToken = localStorage.getItem('admin_token');
    }
  }

  setAdminToken(token: string) {
    this.adminToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  clearAdminToken() {
    this.adminToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
  }

  getAuthHeaders(): Record<string, string> {
    return this.adminToken ? { 'Authorization': `Bearer ${this.adminToken}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Prepare headers
    const authHeaders = this.getAuthHeaders();
    const optionHeaders = (options.headers as Record<string, string>) || {};
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...optionHeaders,
    };
    
    // Add ngrok-skip-browser-warning header if using ngrok
    if (this.baseURL.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    const config: RequestInit = {
      headers: headers as HeadersInit,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error}`);
    }
  }

  // Admin Authentication
  async testAdminToken(token: string): Promise<boolean> {
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      // Add ngrok-skip-browser-warning header if using ngrok
      if (this.baseURL.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }
      
      // Test token by calling a protected endpoint
      await this.request('/api/admin/analytics/overview', {
        headers
      });
      return true;
    } catch (error) {
      console.error('Token test failed:', error);
      return false;
    }
  }

  // Admin Tokens
  async generateAdminToken(description: string, createdBy: string = 'admin'): Promise<GenerateTokenResponse> {
    return this.request<GenerateTokenResponse>('/api/admin/tokens/generate', {
      method: 'POST',
      body: JSON.stringify({ description, created_by: createdBy }),
    });
  }

  async listAdminTokens(): Promise<TokenListResponse> {
    return this.request<TokenListResponse>('/api/admin/tokens/list');
  }

  async revokeAdminToken(tokenId: string): Promise<RevokeTokenResponse> {
    return this.request<RevokeTokenResponse>(`/api/admin/tokens/${tokenId}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions
  async createSubscription(data: {
    customer_email: string;
    zendesk_subdomain?: string;
    start_date: string;
    end_date: string;
    tier_template?: string;
    request_limit: number;
    main_llm: {
      provider: string;
      endpoint: string;
      model: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    fallback_llm: {
      provider: string;
      endpoint: string;
      model: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    features_config?: Record<string, unknown>;
  }): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>('/api/admin/subscriptions/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSubscriptions(includeExpired: boolean = false): Promise<{ subscriptions: Record<string, unknown>; count: number; raw: SubscriptionResponse }> {
    const resp = await this.request<SubscriptionResponse>(`/api/admin/subscriptions/list?include_expired=${includeExpired}`);
    // Normalize shape: prefer top-level subscriptions/count, fallback to data.*
    const subs = (resp.subscriptions as Record<string, unknown>) || (resp.data?.subscriptions as Record<string, unknown>) || {};
    const count = (typeof resp.count === 'number' ? resp.count : (typeof resp.data?.count === 'number' ? resp.data.count : Object.keys(subs).length));
    return { subscriptions: subs, count, raw: resp };

  }

  async getSubscriptionDetails(subscriptionKey: string): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>(`/api/admin/subscriptions/${subscriptionKey}`);
  }

  async updateSubscription(subscriptionKey: string, data: {
    customer_email?: string;
    zendesk_subdomain?: string;
    start_date?: string;
    end_date?: string;
    tier_template?: string;
    request_limit?: number;
    main_llm?: {
      provider: string;
      endpoint: string;
      model: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
    fallback_llm?: {
      provider: string;
      endpoint: string;
      model: string;
      api_key: string;
      input_price_per_million: number;
      output_price_per_million: number;
    };
  }): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>(`/api/admin/subscriptions/${subscriptionKey}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubscription(subscriptionKey: string): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>(`/api/admin/subscriptions/${subscriptionKey}`, {
      method: 'DELETE',
    });
  }

  async reactivateSubscription(subscriptionKey: string): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>(`/api/admin/subscriptions/${subscriptionKey}/reactivate`, {
      method: 'POST',
    });
  }

  async permanentlyDeleteSubscription(subscriptionKey: string): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>(`/api/admin/subscriptions/${subscriptionKey}/permanent`, {
      method: 'DELETE',
    });
  }

  async cleanupExpiredSubscriptions(): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>('/api/admin/subscriptions/cleanup-expired', {
      method: 'POST',
    });
  }

  // Analytics
  async getUsageDaily(subscriptionKey: string, params?: { startDate?: string; endDate?: string; scope?: string }): Promise<{ success: boolean; subscription_key: string; rows: Array<{ date: string; scope: string; total_requests: number; total_input_tokens: number; total_output_tokens: number; estimated_cost_usd: number; used_count?: number }>; message: string; }> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('start_date', params.startDate);
    if (params?.endDate) query.append('end_date', params.endDate);
    if (params?.scope) query.append('scope', params.scope);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/admin/analytics/usage/daily/${subscriptionKey}${qs}`);
  }

  async getAnalyticsOverview(): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>('/api/admin/analytics/overview');
  }

  async getSubscriptionUsage(subscriptionKey: string): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>(`/api/admin/analytics/usage/${subscriptionKey}`);
  }

  async getSubscriptionCosts(subscriptionKey: string): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>(`/api/admin/analytics/costs/${subscriptionKey}`);
  }

  // Providers
  async listProviders(): Promise<ProvidersResponse> {
    return this.request<ProvidersResponse>('/api/admin/providers/list');
  }

  async testProviderConnection(data: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
  }): Promise<ProvidersResponse> {
    return this.request<ProvidersResponse>('/api/admin/providers/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProviderModels(provider: string): Promise<ProvidersResponse> {
    return this.request<ProvidersResponse>(`/api/admin/providers/models/${provider}`);
  }

  // Testing
  async getTestingUsers(): Promise<TestingResponse> {
    return this.request<TestingResponse>('/api/admin/testing/users');
  }

  async getUserLLMConfig(subscriptionKey: string): Promise<TestingResponse> {
    return this.request<TestingResponse>(`/api/admin/testing/users/${subscriptionKey}/config`);
  }

  async testUserLLM(data: {
    subscription_key: string;
    llm_type: 'main' | 'fallback' | 'both';
    test_prompt?: string;
  }): Promise<TestingResponse> {
    return this.request<TestingResponse>('/api/admin/testing/test-llm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tier Templates
  async getTierTemplates(): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    return this.request('/api/admin/tier-templates/list');
  }

  async getTierTemplate(tierName: string): Promise<{ success: boolean; data?: unknown }> {
    return this.request(`/api/admin/tier-templates/${tierName}`);
  }

  async reloadTierTemplates(): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/admin/tier-templates/reload', {
      method: 'POST',
    });
  }

  async createTemplateFromSubscription(subscriptionKey: string, templateData: {
    name: string;
    display_name: string;
    description: string;
  }): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/admin/tier-templates/create-from-subscription', {
      method: 'POST',
      body: JSON.stringify({
        subscription_key: subscriptionKey,
        template_data: templateData
      }),
    });
  }

  // Features
  async getAvailableFeatures(): Promise<{ 
    success: boolean; 
    data?: Record<string, {
      name: string;
      display_name: string;
      description: string;
      category: string;
    }>
  }> {
    return this.request('/api/admin/features/available');
  }

  // Admin Prompts
  async getSubscriptionPrompts(subscriptionKey: string): Promise<{ prompts: Record<string, string> }> {
    return this.request(`/api/admin/prompts/${subscriptionKey}`);
  }

  async updateSubscriptionPrompts(subscriptionKey: string, yamlContent: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/admin/prompts/${subscriptionKey}/update`, {
      method: 'POST',
      body: JSON.stringify({ yaml_content: yamlContent })
    });
  }

  async resetSubscriptionPrompts(subscriptionKey: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/admin/prompts/${subscriptionKey}/reset`, { method: 'POST' });
  }

  async reloadSubscriptionPrompts(subscriptionKey: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/admin/prompts/${subscriptionKey}/reload`, { method: 'POST' });
  }

  async downloadSubscriptionPrompts(subscriptionKey: string): Promise<{ yaml: string }> {
    return this.request(`/api/admin/prompts/${subscriptionKey}/download`);
  }

  async getSubscriptionFeatures(subscriptionKey: string): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    return this.request(`/api/admin/features/subscription/${subscriptionKey}`);
  }

  async getFeatureConfig(subscriptionKey: string, featureName: string): Promise<{ success: boolean; data?: unknown }> {
    return this.request(`/api/admin/features/subscription/${subscriptionKey}/${featureName}`);
  }

  async saveAndTestFeature(subscriptionKey: string, featureName: string, config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    console.log('Saving feature config:', { subscriptionKey, featureName, config });
    return this.request(`/api/admin/features/subscription/${subscriptionKey}/${featureName}/save-and-test`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  async testFeatureLLM(data: {
    subscription_key: string;
    feature_name: string;
    test_prompt?: string;
  }): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/admin/features/test-llm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

}

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);