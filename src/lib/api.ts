// API configuration and service functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
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

  getAuthHeaders() {
    return this.adminToken ? { 'Authorization': `Bearer ${this.adminToken}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
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
      // Test token by calling a protected endpoint
      await this.request('/api/admin/analytics/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch {
      return false;
    }
  }

  // Admin Tokens
  async generateAdminToken(description: string, createdBy: string = 'admin') {
    return this.request('/api/admin/tokens/generate', {
      method: 'POST',
      body: JSON.stringify({ description, created_by: createdBy }),
    });
  }

  async listAdminTokens() {
    return this.request('/api/admin/tokens/list');
  }

  async revokeAdminToken(tokenId: string) {
    return this.request(`/api/admin/tokens/${tokenId}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions
  async createSubscription(data: {
    customer_email: string;
    zendesk_subdomain: string;
    subscription_days: number;
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
  }) {
    return this.request('/api/admin/subscriptions/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSubscriptions(includeExpired: boolean = false) {
    return this.request(`/api/admin/subscriptions/list?include_expired=${includeExpired}`);
  }

  async getSubscriptionDetails(subscriptionKey: string) {
    return this.request(`/api/admin/subscriptions/${subscriptionKey}`);
  }

  async deleteSubscription(subscriptionKey: string) {
    return this.request(`/api/admin/subscriptions/${subscriptionKey}`, {
      method: 'DELETE',
    });
  }

  async cleanupExpiredSubscriptions() {
    return this.request('/api/admin/subscriptions/cleanup-expired', {
      method: 'POST',
    });
  }

  // Analytics
  async getAnalyticsOverview() {
    return this.request('/api/admin/analytics/overview');
  }

  async getSubscriptionUsage(subscriptionKey: string) {
    return this.request(`/api/admin/analytics/usage/${subscriptionKey}`);
  }

  async getSubscriptionCosts(subscriptionKey: string) {
    return this.request(`/api/admin/analytics/costs/${subscriptionKey}`);
  }

  // Providers
  async listProviders() {
    return this.request('/api/admin/providers/list');
  }

  async testProviderConnection(data: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
  }) {
    return this.request('/api/admin/providers/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProviderModels(provider: string) {
    return this.request(`/api/admin/providers/models/${provider}`);
  }

  // Testing
  async getTestingUsers() {
    return this.request('/api/admin/testing/users');
  }

  async getUserLLMConfig(subscriptionKey: string) {
    return this.request(`/api/admin/testing/users/${subscriptionKey}/config`);
  }

  async testUserLLM(data: {
    subscription_key: string;
    llm_type: 'main' | 'fallback' | 'both';
    test_prompt?: string;
  }) {
    return this.request('/api/admin/testing/test-llm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);
export { ApiError };