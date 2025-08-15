import { ApiError } from './api';



interface UserLoginResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  user_info: {
    email: string;
    subscription_key: string;
    zendesk_subdomain: string;
    tier_template: string;
    request_limit: number;
    current_usage: number;
    expires_at: string;
  };
}

interface LLMConfig {
  provider: string;
  endpoint: string;
  model: string;
  api_key: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

interface FeatureConfig {
  is_enabled: boolean;
  use_custom_llm: boolean;
  custom_main_llm_config?: LLMConfig;
  custom_fallback_llm_config?: LLMConfig;
  feature_request_limit?: number;
}

class UserApiService {
  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async login(email: string, subscriptionKey: string): Promise<UserLoginResponse> {
    const response = await fetch('/api/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        subscription_key: subscriptionKey
      })
    });

    return this.handleResponse(response);
  }

  async getProfile(token: string) {
    const response = await fetch('/api/user/profile', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getSubscription(token: string) {
    const response = await fetch('/api/user/subscription', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getFeatures(token: string) {
    const response = await fetch('/api/user/features', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getFeatureConfig(token: string, featureName: string) {
    const response = await fetch(`/api/user/features/${featureName}`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async updateFeatureConfig(token: string, featureName: string, config: FeatureConfig) {
    const response = await fetch(`/api/user/features/${featureName}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async saveAndTestFeature(token: string, featureName: string, config: FeatureConfig) {
    const response = await fetch(`/api/user/features/${featureName}/save-and-test`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async testFeatureLLM(token: string, featureName: string, testPrompt?: string) {
    const response = await fetch(`/api/user/features/${featureName}/test`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        test_prompt: testPrompt
      })
    });

    return this.handleResponse(response);
  }

  async getAvailableFeatures(token: string) {
    const response = await fetch('/api/user/features/available', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getProviders(token: string) {
    const response = await fetch('/api/user/providers', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getProviderDetails(token: string, providerName: string) {
    const response = await fetch(`/api/user/providers/${providerName}`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async testLLMConfig(token: string, config: {
    provider: string;
    model: string;
    endpoint: string;
    api_key: string;
    test_prompt?: string;
  }) {
    const response = await fetch('/api/user/test-llm-config', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async testProviderConnection(token: string, config: {
    provider: string;
    endpoint: string;
    api_key: string;
  }) {
    const response = await fetch('/api/user/test-provider-connection', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async getSubscriptionLLMConfig(token: string) {
    const response = await fetch('/api/user/subscription/llm-config', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async testSubscriptionLLM(token: string, options: { llm_type?: 'main' | 'fallback' | 'both'; test_prompt?: string } = {}) {
    const response = await fetch('/api/user/testing/test-llm', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        llm_type: options.llm_type || 'both',
        test_prompt: options.test_prompt
      })
    });

    return this.handleResponse(response);
  }

  async bulkUpdateFeatures(token: string, features: Record<string, FeatureConfig>) {
    const response = await fetch('/api/user/features/bulk-update', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        features
      })
    });

    return this.handleResponse(response);
  }

  async verifyToken(token: string) {
    const response = await fetch('/api/user/verify-token', {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async updateSubscriptionLLMConfig(token: string, config: {
    main_llm: LLMConfig;
    fallback_llm: LLMConfig;
  }) {
    const response = await fetch('/api/user/subscription/llm-config', {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async logout(token: string) {
    const response = await fetch('/api/user/logout', {
      method: 'POST',
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }
}

export const userApiService = new UserApiService();