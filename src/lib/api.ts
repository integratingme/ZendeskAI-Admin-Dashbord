// API configuration and service functions
const _ENV_BASE_URL: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL as unknown as string | undefined;
if (!_ENV_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is required. Set it in your environment (e.g., .env.local)');
}
// Normalize (remove trailing slash)
const API_BASE_URL = _ENV_BASE_URL.replace(/\/$/, '');

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
    tokens: { [key: string]: AdminToken };
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
  total_count?: number;
  page?: number;
  limit?: number;
  data?: {
    subscriptions?: Record<string, unknown>;
    count?: number;
    total_count?: number;
    page?: number;
    limit?: number;
  };
  message: string;
}

// New concrete shapes matching Postgres backend responses
interface OverviewResponse {
  success: boolean;
  overview: Record<string, unknown>;
  message: string;
}

interface UsageResponse {
  success: boolean;
  subscription_key: string;
  usage_stats?: Record<string, unknown>;
  message: string;
}

interface CostResponse {
  success: boolean;
  subscription_key: string;
  cost_breakdown?: Record<string, unknown>;
  message: string;
}

interface UsageDailyRow {
  date: string;
  scope: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
  used_count?: number;
}

interface UsageDailyResponse {
  success: boolean;
  subscription_key: string;
  rows: UsageDailyRow[];
  message: string;
}

export interface Provider {
  name: string;
  endpoint: string;
  auth_type: string;
  format: string;
  example_models: string[];
  models_guide: string;
  default_pricing: {
    [key: string]: {
      input: number;
      output: number;
    };
  };
}

interface ProvidersListResponse {
  success: boolean;
  providers: Record<string, Provider>;
  message: string;
}

interface TestConnectionResponse {
  success: boolean;
  result: Record<string, unknown>;
  message: string;
}

interface ProviderModelsResponse {
  success: boolean;
  provider: string;
  example_models: string[];
  models_guide: string;
  default_pricing: Record<string, unknown>;
  message: string;
}

interface AvailableFeaturesResponse {
  success: boolean;
  features?: Record<string, {
    name: string;
    display_name: string;
    description: string;
    category: string;
  }>;
  categories?: Record<string, string[]>;
  total_count?: number;
}

interface TestingResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}



export class ApiService {
  // Optional callback for admin token changes (set by AuthContext)
  onAdminTokensChanged?: (accessToken: string | null, refreshToken: string | null, meta?: { expires_in?: number }) => void;
  private baseURL: string;
  private adminAccessToken: string | null = null;
  private adminRefreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Try to get tokens from sessionStorage on client side (more production-friendly than localStorage)
    if (typeof window !== 'undefined') {
      this.adminAccessToken = sessionStorage.getItem('admin_access_token');
      this.adminRefreshToken = sessionStorage.getItem('admin_refresh_token');
    }
  }

  private persistTokens() {
    if (typeof window !== 'undefined') {
      if (this.adminAccessToken) sessionStorage.setItem('admin_access_token', this.adminAccessToken);
      else sessionStorage.removeItem('admin_access_token');
      if (this.adminRefreshToken) sessionStorage.setItem('admin_refresh_token', this.adminRefreshToken);
      else sessionStorage.removeItem('admin_refresh_token');
    }
  }

  setAdminToken(token: string) {
    this.adminAccessToken = token;
    this.persistTokens();
  }

  setAdminTokens(accessToken: string, refreshToken: string) {
    this.adminAccessToken = accessToken;
    this.adminRefreshToken = refreshToken;
    this.persistTokens();
    // Notify listeners about token change
    this.onAdminTokensChanged?.(this.adminAccessToken, this.adminRefreshToken);
  }

  clearAdminToken() {
    this.adminAccessToken = null;
    this.adminRefreshToken = null;
    this.persistTokens();
    // Notify listeners about token cleared
    this.onAdminTokensChanged?.(null, null);
  }

  getAuthHeaders(): Record<string, string> {
    return this.adminAccessToken ? { 'Authorization': `Bearer ${this.adminAccessToken}` } : {};
  }

  async adminLogin(rawToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const resp = await this.request<{ success: boolean; access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
      '/api/admin/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ token: rawToken }),
      }
    );
    this.setAdminTokens(resp.access_token, resp.refresh_token);
    // Pass expires_in meta to listeners to allow scheduling timers
    this.onAdminTokensChanged?.(resp.access_token, resp.refresh_token, { expires_in: resp.expires_in });
    return { access_token: resp.access_token, refresh_token: resp.refresh_token, expires_in: resp.expires_in };
  }

  async refreshAdminTokens(): Promise<boolean> {
    return this.adminRefresh();
  }

  private async adminRefresh(): Promise<boolean> {
    if (!this.adminRefreshToken) return false;
    try {
      const resp = await this.request<{ success: boolean; access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
        '/api/admin/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.adminRefreshToken }),
        }
      );
      this.setAdminTokens(resp.access_token, resp.refresh_token);
      this.onAdminTokensChanged?.(resp.access_token, resp.refresh_token, { expires_in: resp.expires_in });
      return true;
    } catch {
      this.clearAdminToken();
      return false;
    }
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
      let response = await fetch(url, config);
      
      // If unauthorized and we have a refresh token, try to refresh once
      if (response.status === 401 && this.adminRefreshToken) {
        const refreshed = await this.adminRefresh();
        if (refreshed) {
          const authHeaders = this.getAuthHeaders();
          const optionHeaders = (options.headers as Record<string, string>) || {};
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...optionHeaders,
          };
          if (this.baseURL.includes('ngrok')) {
            headers['ngrok-skip-browser-warning'] = 'true';
          }
          response = await fetch(url, { ...options, headers: headers as HeadersInit });
        }
      }

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const raw = await response.text();
          if (raw) {
            try {
              const data = JSON.parse(raw) as { message?: string; detail?: string | { message?: string } };
              if (data && typeof data === 'object') {
                if (data.detail && typeof data.detail === 'object' && typeof (data.detail as { message?: string }).message === 'string') {
                  message = ((data.detail as { message?: string }).message as string) || message;
                } else if (typeof data.message === 'string') {
                  message = data.message || message;
                } else if (typeof data.detail === 'string') {
                  message = data.detail || message;
                } else {
                  message = raw || message;
                }
              } else {
                message = raw || message;
              }
            } catch {
              message = raw || message;
            }
          }
        } catch {
          // ignore body parsing issues, keep default message
        }
        throw new ApiError(response.status, message);
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

  async listSubscriptions(includeExpired: boolean = false, page: number = 1, limit: number = 10, includeCount: boolean = false): Promise<{ subscriptions: Record<string, unknown>; count: number; totalCount?: number; page: number; limit: number; raw: SubscriptionResponse }> {
    const queryParams = new URLSearchParams({
      include_expired: includeExpired.toString(),
      page: page.toString(),
      limit: limit.toString(),
      include_count: includeCount.toString()
    });
    const resp = await this.request<SubscriptionResponse>(`/api/admin/subscriptions/list?${queryParams}`);
    // Normalize shape: prefer top-level subscriptions/count, fallback to data.*
    const subs = (resp.subscriptions as Record<string, unknown>) || (resp.data?.subscriptions as Record<string, unknown>) || {};
    const count = (typeof resp.count === 'number' ? resp.count : (typeof resp.data?.count === 'number' ? resp.data.count : Object.keys(subs).length));
    const totalCount = resp.total_count || resp.data?.total_count;
    return { subscriptions: subs, count, totalCount, page: resp.page || page, limit: resp.limit || limit, raw: resp };

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
  async getUsageDaily(subscriptionKey: string, params?: { startDate?: string; endDate?: string; scope?: string }): Promise<UsageDailyResponse> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('start_date', params.startDate);
    if (params?.endDate) query.append('end_date', params.endDate);
    if (params?.scope) query.append('scope', params.scope);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<UsageDailyResponse>(`/api/admin/analytics/usage/daily/${subscriptionKey}${qs}`);
  }

  async getAnalyticsOverview(): Promise<OverviewResponse> {
    return this.request<OverviewResponse>('/api/admin/analytics/overview');
  }

  async getSubscriptionUsage(subscriptionKey: string): Promise<UsageResponse> {
    return this.request<UsageResponse>(`/api/admin/analytics/usage/${subscriptionKey}`);
  }

  async getSubscriptionCosts(subscriptionKey: string): Promise<CostResponse> {
    return this.request<CostResponse>(`/api/admin/analytics/costs/${subscriptionKey}`);
  }

  // Providers
  async listProviders(): Promise<ProvidersListResponse> {
    return this.request<ProvidersListResponse>('/api/admin/providers/list');
  }

  async testProviderConnection(data: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
  }): Promise<TestConnectionResponse> {
    return this.request<TestConnectionResponse>('/api/admin/providers/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProviderModels(provider: string): Promise<ProviderModelsResponse> {
    return this.request<ProviderModelsResponse>(`/api/admin/providers/models/${provider}`);
  }

  // Testing
  async getTestingUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    details?: 'basic' | 'full';
  }): Promise<TestingResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.details) queryParams.append('details', params.details);
    
    const url = `/api/admin/testing/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<TestingResponse>(url);
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
  async getAvailableFeatures(): Promise<AvailableFeaturesResponse> {
    return this.request<AvailableFeaturesResponse>('/api/admin/features/available');
  }

  // Admin Prompts
  async getSubscriptionPrompts(subscriptionKey: string): Promise<{ subscription_key: string; prompts: Record<string, string> }> {
    return this.request<{ subscription_key: string; prompts: Record<string, string> }>(`/api/admin/prompts/${subscriptionKey}`);
  }

  async updateSubscriptionPrompts(subscriptionKey: string, yamlContent: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/admin/prompts/${subscriptionKey}/update`, {
      method: 'POST',
      body: JSON.stringify({ yaml_content: yamlContent })
    });
  }

  async resetSubscriptionPrompts(subscriptionKey: string): Promise<{ status: string; subscription_key: string }> {
    return this.request<{ status: string; subscription_key: string }>(`/api/admin/prompts/${subscriptionKey}/reset`, { method: 'POST' });
  }

  async resetSubscriptionPrompt(subscriptionKey: string, promptName: string): Promise<{ status: string; subscription_key: string; prompt_name: string }> {
    return this.request<{ status: string; subscription_key: string; prompt_name: string }>(`/api/admin/prompts/${subscriptionKey}/reset/${promptName}`, { method: 'POST' });
  }

  async reloadSubscriptionPrompts(subscriptionKey: string): Promise<{ status: string; ok: boolean }> {
    return this.request<{ status: string; ok: boolean }>(`/api/admin/prompts/${subscriptionKey}/reload`, { method: 'POST' });
  }


  // Default Prompts Management
  async getDefaultPrompts(): Promise<{ subscription_key: string; prompts: Record<string, string> }> {
    return this.request<{ subscription_key: string; prompts: Record<string, string> }>('/api/admin/prompts/default');
  }

  async updateDefaultPrompts(yamlContent: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/admin/prompts/default/update', {
      method: 'POST',
      body: JSON.stringify({ yaml_content: yamlContent })
    });
  }

  async resetDefaultPrompts(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/admin/prompts/default/reset', { method: 'POST' });
  }

  async getSubscriptionFeatures(subscriptionKey: string): Promise<{ success: boolean; subscription_key?: string; features?: Record<string, unknown> }> {
    return this.request<{ success: boolean; subscription_key?: string; features?: Record<string, unknown> }>(`/api/admin/features/subscription/${subscriptionKey}`);
  }

  async getFeatureConfig(subscriptionKey: string, featureName: string): Promise<{ success: boolean; config?: unknown; error?: string }> {
    return this.request<{ success: boolean; config?: unknown; error?: string }>(`/api/admin/features/subscription/${subscriptionKey}/${featureName}`);
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
  }): Promise<{ success: boolean; test_result?: unknown; error?: string; error_type?: string }> {
    return this.request<{ success: boolean; test_result?: unknown; error?: string; error_type?: string }>('/api/admin/features/test-llm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

}

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);