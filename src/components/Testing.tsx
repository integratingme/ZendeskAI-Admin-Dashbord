'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { useToastContext } from '@/contexts/ToastContext';

interface TestResult {
  [key: string]: unknown;
}

interface TestUser {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
  subscription_days: number | null;
  start_date?: string;
  end_date?: string;
  main_provider: string;
  fallback_provider: string;
  last_main_used: string | null;
  total_requests: number;
}

export default function Testing() {
  const [users, setUsers] = useState<TestUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [testType, setTestType] = useState<'main' | 'fallback' | 'both'>('both');
  const [testPrompt, setTestPrompt] = useState('Hello, this is a test message. Please respond briefly to confirm the connection is working.');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToastContext();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getTestingUsers();
      console.log('Testing users response:', response);
      
      // Handle different response structures
      if (response.success && response.data) {
        setUsers((response.data as Record<string, unknown>).users as TestUser[]);
      } else if (response.data) {
        // Handle case where response doesn't have success field but has data
        setUsers((response.data as Record<string, unknown>).users as TestUser[]);
      } else if ((response as unknown as Record<string, unknown>).users) {
        // Handle case where response IS the data (direct users array)
        setUsers((response as unknown as Record<string, unknown>).users as TestUser[]);
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch users');
      }
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    if (!selectedUser) {
      toast.warning('User Selection Required', 'Please select a user to test');
      return;
    }

    setTesting(true);
    setTestResults(null);

    try {
      const response = await apiService.testUserLLM({
        subscription_key: selectedUser,
        llm_type: testType,
        test_prompt: testPrompt
      });

      console.log('Test response:', response);
      console.log('Response keys:', Object.keys(response));
      
      // Handle different response structures
      if (response.success && (response as unknown as Record<string, unknown>).test_results) {
        console.log('Using success + test_results path');
        setTestResults((response as unknown as Record<string, unknown>).test_results as TestResult);
      } else if (response.success && response.data) {
        console.log('Using success + data path');
        setTestResults(response.data as unknown as TestResult);
      } else if (response.data) {
        console.log('Using data only path');
        setTestResults(response.data as unknown as TestResult);
      } else if ((response as unknown as Record<string, unknown>).overall_status) {
        console.log('Using direct response path');
        setTestResults(response as unknown as TestResult);
      } else {
        console.log('Using response as-is');
        setTestResults(response as unknown as TestResult);
      }
      
      // Log the final test results to see what we actually have
      console.log('Final test results set:', response as unknown as TestResult);
    } catch (err) {
      console.error('Error running test:', err);
      if (err instanceof ApiError) {
        toast.error('Test Failed', err.message);
      } else {
        toast.error('Test Failed', 'Please try again');
      }
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const calculateDaysRemaining = (user: TestUser) => {
    // For legacy subscriptions, use subscription_days if available
    if (user.subscription_days !== null && user.subscription_days !== undefined) {
      return user.subscription_days;
    }
    
    // For new subscriptions, calculate from end_date
    if (user.end_date) {
      const endDate = new Date(user.end_date);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays); // Don't show negative days
    }
    
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <div className="text-gray-600">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Testing</h1>
          <button 
            onClick={fetchUsers}
            className="admin-button-outline px-4 py-2 rounded-lg"
          >
            Refresh Users
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Testing</h1>
        <button 
          onClick={fetchUsers}
          className="admin-button-outline px-4 py-2 rounded-lg"
        >
          Refresh Users
        </button>
      </div>

      {/* User Selection */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Select User for Testing</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {users.map((user) => (
            <div 
              key={user.subscription_key}
              onClick={() => setSelectedUser(user.subscription_key)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedUser === user.subscription_key 
                  ? 'border-black bg-gray-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{user.customer_email}</h4>
                <span className="text-sm text-gray-500">{calculateDaysRemaining(user)}d</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{user.zendesk_subdomain}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Main: {user.main_provider} | Fallback: {user.fallback_provider}</span>
                <span>{user.total_requests} requests</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Last used: {formatDate(user.last_main_used)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Test Configuration */}
      {selectedUser && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Test Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Type:</label>
              <div className="flex gap-4">
                {(['main', 'fallback', 'both'] as const).map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      value={type}
                      checked={testType === type}
                      onChange={(e) => setTestType(e.target.value as 'main' | 'fallback' | 'both')}
                      className="mr-2"
                    />
                    <span className="capitalize">{type} LLM{type === 'both' ? 's' : ''}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Prompt:</label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter test prompt..."
              />
            </div>
            
            <button
              onClick={runTest}
              disabled={testing}
              className="admin-button px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {testing ? 'Running Test...' : 'Run Test'}
            </button>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Test Results</h3>
          
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                (testResults.overall_status as string) === 'excellent' ? 'bg-green-100 text-green-800' :
                (testResults.overall_status as string) === 'success' ? 'bg-green-100 text-green-800' :
                (testResults.overall_status as string) === 'main_only' ? 'bg-yellow-100 text-yellow-800' :
                (testResults.overall_status as string) === 'fallback_only' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {testResults.overall_status as string || 'Unknown'}
              </span>
            </div>

            {(testResults.main_llm_test as TestResult) && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Main LLM Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={(testResults.main_llm_test as TestResult).status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {(testResults.main_llm_test as TestResult).status as string}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span>{(testResults.main_llm_test as TestResult).provider as string}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span>{(testResults.main_llm_test as TestResult).model as string}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Response Preview:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800">
                      {(testResults.main_llm_test as TestResult).response_preview as string}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(testResults.fallback_llm_test as TestResult) && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Fallback LLM Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={(testResults.fallback_llm_test as TestResult).status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {(testResults.fallback_llm_test as TestResult).status as string}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span>{(testResults.fallback_llm_test as TestResult).provider as string}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span>{(testResults.fallback_llm_test as TestResult).model as string}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Response Preview:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800">
                      {(testResults.fallback_llm_test as TestResult).response_preview as string}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}