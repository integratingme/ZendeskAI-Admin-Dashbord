import { ApiError } from './api';

const _ENV_BASE_URL: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL as unknown as string | undefined;
if (!_ENV_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is required. Set it in your environment (e.g., .env.local)');
}
const USER_API_BASE_URL = _ENV_BASE_URL.replace(/\/$/, '');
import { userAuthEvents } from '@/contexts/userAuthEvents';



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
  async getIntegrationStatus(token: string): Promise<{ success: boolean; zendesk_configured: boolean; confluence_configured: boolean; message: string }> {
    const response = await fetch(this.base('/api/user/integrations/status'), {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async saveUserZendeskCreds(token: string, data: { zendesk_email: string; zendesk_api_token: string; zendesk_subdomain?: string }): Promise<{ success: boolean }> {
    const response = await fetch(this.base('/api/user/integrations/zendesk/save'), {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async saveUserConfluenceCreds(token: string, data: { confluence_base_url: string; confluence_username: string; confluence_api_token: string }): Promise<{ success: boolean }> {
    const response = await fetch(this.base('/api/user/integrations/confluence/save'), {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  private base(path: string) { return `${USER_API_BASE_URL}${path}`; }

  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      // Notify global listener on unauthorized
      if (response.status === 401) {
        userAuthEvents.emitUnauthorized();
      }
      // Try to parse error message gracefully
      let message = `HTTP ${response.status}`;
      try {
        const data: unknown = await response.json();
        type ErrorEnvelope = { message?: string; detail?: string | { message?: string } };
        const body = data as ErrorEnvelope;
        // Prefer structured detail.message or message, then detail string
        if (body.detail && typeof body.detail === 'object' && typeof (body.detail as { message?: string }).message === 'string') {
          message = ((body.detail as { message?: string }).message as string) || message;
        } else if (typeof body.message === 'string') {
          message = body.message || message;
        } else if (typeof body.detail === 'string') {
          message = body.detail || message;
        }
      } catch {
        try {
          const text = await response.text();
          message = text || message;
        } catch (e2) {
          // Ensure non-empty catch to satisfy eslint(no-empty)
          if (typeof console !== 'undefined' && console.debug) {
            console.debug('Failed to parse error response body', e2);
          }
        }
      }
      throw new ApiError(response.status, message);
    }
    return response.json();
  }

  async login(email: string, subscriptionKey: string): Promise<UserLoginResponse> {
    const response = await fetch(this.base('/api/user/login'), {
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

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(this.base('/api/user/refresh-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return this.handleResponse(response);
  }

  async getProfile(token: string) {
    const response = await fetch(this.base('/api/user/profile'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getSubscription(token: string) {
    const response = await fetch(this.base('/api/user/subscription'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getFeatures(token: string) {
    const response = await fetch(this.base('/api/user/features'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getFeatureConfig(token: string, featureName: string) {
    const response = await fetch(this.base(`/api/user/features/${featureName}`), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async updateFeatureConfig(token: string, featureName: string, config: FeatureConfig) {
    const response = await fetch(this.base(`/api/user/features/${featureName}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async saveAndTestFeature(token: string, featureName: string, config: FeatureConfig) {
    const response = await fetch(this.base(`/api/user/features/${featureName}/save-and-test`), {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async testFeatureLLM(token: string, featureName: string, testPrompt?: string) {
    const response = await fetch(this.base(`/api/user/features/${featureName}/test`), {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        test_prompt: testPrompt
      })
    });

    return this.handleResponse(response);
  }

  async getAvailableFeatures(token: string) {
    const response = await fetch(this.base('/api/user/features/available'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getProviders(token: string) {
    const response = await fetch(this.base('/api/user/providers'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getProviderDetails(token: string, providerName: string) {
    const response = await fetch(this.base(`/api/user/providers/${providerName}`), {
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
    const response = await fetch(this.base('/api/user/test-llm-config'), {
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
    const response = await fetch(this.base('/api/user/test-provider-connection'), {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async getSubscriptionLLMConfig(token: string) {
    const response = await fetch(this.base('/api/user/subscription/llm-config'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async testSubscriptionLLM(token: string, options: { llm_type?: 'main' | 'fallback' | 'both'; test_prompt?: string } = {}) {
    const response = await fetch(this.base('/api/user/testing/test-llm'), {
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
    const response = await fetch(this.base('/api/user/features/bulk-update'), {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        features
      })
    });

    return this.handleResponse(response);
  }

  async verifyToken(token: string) {
    const response = await fetch(this.base('/api/user/verify-token'), {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async updateSubscriptionLLMConfig(token: string, config: {
    main_llm: LLMConfig;
    fallback_llm: LLMConfig;
  }) {
    const response = await fetch(this.base('/api/user/subscription/llm-config'), {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(config)
    });

    return this.handleResponse(response);
  }

  async logout(token: string) {
    const response = await fetch(this.base('/api/user/logout'), {
      method: 'POST',
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }
}

export const userApiService = new UserApiService();