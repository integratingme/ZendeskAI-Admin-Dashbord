'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlay, FiRefreshCw } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { userApiService } from '@/lib/userApi';
import { useToastContext } from '@/contexts/ToastContext';

export default function UserTesting() {
  const { user } = useUserAuth();
  const toast = useToastContext();
  
  const [loading, setLoading] = useState(true);
  const [subscriptionTestType, setSubscriptionTestType] = useState<'main' | 'fallback' | 'both'>('both');
  const [subscriptionTesting, setSubscriptionTesting] = useState(false);
  const [subscriptionTestResult, setSubscriptionTestResult] = useState<{ 
    success: boolean; 
    message?: string; 
    data?: unknown;
    test_results?: {
      overall_status: string;
      main_llm?: { status: string; response?: string; error?: string };
      fallback_llm?: { status: string; response?: string; error?: string };
      main_llm_test?: { 
        status: string; 
        response?: string; 
        error?: string; 
        provider?: string; 
        model?: string; 
        response_preview?: string;
      };
      fallback_llm_test?: { 
        status: string; 
        response?: string; 
        error?: string; 
        provider?: string; 
        model?: string; 
        response_preview?: string;
      };
    };
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.access_token) return;
 
    try {
      setLoading(true);
      
      // Load testing data if needed
      // const [featuresResponse, providersResponse] = await Promise.all([
      //   userApiService.getFeatures(user.access_token),
      //   userApiService.getProviders(user.access_token)
      // ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data', 'Unable to load testing data');
    } finally {
      setLoading(false);
    }
  }, [user?.access_token, toast]);
 
  useEffect(() => {
    loadData();
  }, [loadData]);







  const testSubscriptionLLM = async () => {
    if (!user?.access_token) return;

    try {
      setSubscriptionTesting(true);
      setSubscriptionTestResult(null);
      const response = await userApiService.testSubscriptionLLM(user.access_token, {
        llm_type: subscriptionTestType
      });
      setSubscriptionTestResult(response);
      if (response.success) {
        toast.success('Subscription test successful', 'LLM configuration test completed');
      } else {
        toast.error('Subscription test failed', response.message || 'Test failed');
      }
    } catch (err) {
      console.error('Error testing subscription LLM:', err);
      toast.error('Subscription test failed', 'Please try again');
    } finally {
      setSubscriptionTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <FiRefreshCw className="animate-spin text-xl" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--foreground)' }}>Loading testing data...</span>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Test your AI configurations and validate functionality
          </h1>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none'
          }}
        >
          <FiRefreshCw />
          <span>Refresh</span>
        </button>
      </div>

      {/* Subscription LLM Testing */}
      <div className="user-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Subscription LLM Testing
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Test Type
            </label>
            <div className="flex gap-4">
              {(['main', 'fallback', 'both'] as const).map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={subscriptionTestType === type}
                    onChange={() => setSubscriptionTestType(type)}
                  />
                  <span className="capitalize" style={{ color: 'var(--foreground)' }}>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Runs a live connectivity test against your subscription&apos;s main and/or fallback LLM configuration.
            </div>
            <button
              onClick={testSubscriptionLLM}
              disabled={subscriptionTesting}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
            >
              {subscriptionTesting ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <FiPlay />
                  <span>Run Test</span>
                </>
              )}
            </button>
          </div>

          {subscriptionTestResult && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>Overall Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    subscriptionTestResult.test_results?.overall_status === 'excellent' || subscriptionTestResult.test_results?.overall_status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : subscriptionTestResult.test_results?.overall_status === 'main_only'
                      ? 'bg-yellow-100 text-yellow-800'
                      : subscriptionTestResult.test_results?.overall_status === 'fallback_only'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {subscriptionTestResult.test_results?.overall_status || 'Unknown'}
                </span>
              </div>

              {subscriptionTestResult.test_results?.main_llm_test && (
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Main LLM</div>
                  <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                    Status: {subscriptionTestResult.test_results.main_llm_test.status}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                    Provider: {subscriptionTestResult.test_results.main_llm_test.provider} | Model: {subscriptionTestResult.test_results.main_llm_test.model}
                  </div>
                  {subscriptionTestResult.test_results.main_llm_test.response_preview && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: 'var(--hover-bg)' }}>
                      {subscriptionTestResult.test_results.main_llm_test.response_preview}
                    </div>
                  )}
                  {subscriptionTestResult.test_results.main_llm_test.error && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      {subscriptionTestResult.test_results.main_llm_test.error}
                    </div>
                  )}
                </div>
              )}

              {subscriptionTestResult.test_results?.fallback_llm_test && (
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Fallback LLM</div>
                  <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                    Status: {subscriptionTestResult.test_results.fallback_llm_test.status}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                    Provider: {subscriptionTestResult.test_results.fallback_llm_test.provider} | Model: {subscriptionTestResult.test_results.fallback_llm_test.model}
                  </div>
                  {subscriptionTestResult.test_results.fallback_llm_test.response_preview && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: 'var(--hover-bg)' }}>
                      {subscriptionTestResult.test_results.fallback_llm_test.response_preview}
                    </div>
                  )}
                  {subscriptionTestResult.test_results.fallback_llm_test.error && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      {subscriptionTestResult.test_results.fallback_llm_test.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>




      {/* Test Results Details - Removed for now */}




    </div>
  );
}