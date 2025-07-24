'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiError } from '@/lib/api';

interface TestUser {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
  subscription_days: number;
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
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getTestingUsers();
      if (response.success) {
        setUsers(response.users);
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
      alert('Please select a user to test');
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

      if (response.success) {
        setTestResults(response.test_results);
      } else {
        throw new Error(response.message || 'Test failed');
      }
    } catch (err) {
      console.error('Error running test:', err);
      if (err instanceof ApiError) {
        alert(`Test failed: ${err.message}`);
      } else {
        alert('Test failed. Please try again.');
      }
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
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
          <h1 className="text-2xl font-bold text-black">LLM Testing</h1>
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
        <h1 className="text-2xl font-bold text-black">LLM Testing</h1>
        <button 
          onClick={fetchUsers}
          className="admin-button-outline px-4 py-2 rounded-lg"
        >
          Refresh Users
        </button>
      </div>

      {/* User Selection */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Select User for Testing</h3>
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
                <span className="text-sm text-gray-500">{user.subscription_days}d</span>
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
          <h3 className="text-lg font-semibold text-black mb-4">Test Configuration</h3>
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
                      onChange={(e) => setTestType(e.target.value as any)}
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
          <h3 className="text-lg font-semibold text-black mb-4">Test Results</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                testResults.overall_status === 'excellent' ? 'bg-green-100 text-green-800' :
                testResults.overall_status === 'main_only' ? 'bg-yellow-100 text-yellow-800' :
                testResults.overall_status === 'fallback_only' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {testResults.overall_status}
              </span>
            </div>

            {testResults.main_llm_test && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Main LLM Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={testResults.main_llm_test.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {testResults.main_llm_test.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span>{testResults.main_llm_test.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span>{testResults.main_llm_test.model}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Response Preview:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800">
                      {testResults.main_llm_test.response_preview}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {testResults.fallback_llm_test && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Fallback LLM Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={testResults.fallback_llm_test.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {testResults.fallback_llm_test.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span>{testResults.fallback_llm_test.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span>{testResults.fallback_llm_test.model}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Response Preview:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800">
                      {testResults.fallback_llm_test.response_preview}
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