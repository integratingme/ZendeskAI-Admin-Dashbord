'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiError } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useToastContext } from '@/contexts/ToastContext';
import { FiSearch } from 'react-icons/fi';

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

import AdminLayout from '@/components/AdminLayout';

export default function AdminTestingPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<TestUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userConfig, setUserConfig] = useState<Record<string, unknown> | null>(null);
  const [userConfigLoading, setUserConfigLoading] = useState(false);
  const [testType, setTestType] = useState<'main' | 'fallback' | 'both'>('both');
  const [testPrompt, setTestPrompt] = useState('Hello, this is a test message. Please respond briefly to confirm the connection is working.');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [testContext, setTestContext] = useState<{ user: string; page: number; search: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pageSize = 4;

  const toast = useToastContext();

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Testing';
  }, []);

  // Calculate display indices for pagination info
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalUsers);

  // const fetchUsers = useCallback(fetchUsersInternal, [pageSize, searchTerm]);

  const fetchUsers = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getTestingUsers({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        details: 'basic'
      });
      
      console.log('Testing users response:', response);
      
      // Normalize response for different shapes
      type TestingUsersNormalized = {
        users?: TestUser[];
        data?: { users?: TestUser[] };
        pagination?: { page: number; limit: number; total: number; totalPages: number };
        message?: string;
      };
      const anyResp = response as unknown as TestingUsersNormalized;
      let usersArray: TestUser[] = [];
      if (anyResp?.data?.users) {
        usersArray = anyResp.data.users as TestUser[];
      } else if (anyResp?.users) {
        usersArray = anyResp.users as TestUser[];
      }

      setUsers(usersArray);

      // Apply pagination metadata if present regardless of shape
      if (anyResp?.pagination) {
        setTotalPages(anyResp.pagination.totalPages);
        setTotalUsers(anyResp.pagination.total);
        setCurrentPage(anyResp.pagination.page ?? page);
      } else {
        // Fallback for backward compatibility (older backends without pagination info)
        setTotalUsers(usersArray.length);
        setTotalPages(Math.max(1, Math.ceil(usersArray.length / pageSize)));
        setCurrentPage(page);
      }

      // If no users key found at all, treat as error
      if (!usersArray || !Array.isArray(usersArray)) {
        throw new Error(anyResp?.message || 'Failed to fetch users');
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
  }, [pageSize]);

  useEffect(() => {
    fetchUsers(1, '');
  }, [fetchUsers]);

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedUser(''); // Clear selected user when changing pages
    setUserConfig(null); // Clear user config when changing pages
    setTestResults(null); // Clear test results when changing pages
    setTestContext(null); // Clear test context when changing pages
    await fetchUsers(newPage, searchTerm);
  };

  const handleSearch = async () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setCurrentPage(1);
    setSelectedUser(''); // Clear selected user when searching
    setUserConfig(null); // Clear user config when searching
    setTestResults(null); // Clear test results when searching
    setTestContext(null); // Clear test context when searching
    await fetchUsers(1, term);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = async () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedUser(''); // Clear selected user when clearing search
    setUserConfig(null); // Clear user config when clearing search
    setTestResults(null); // Clear test results when clearing search
    setTestContext(null); // Clear test context when clearing search
    await fetchUsers(1, '');
  };

  const runTest = async () => {
    if (!selectedUser) {
      toast.warning('User Selection Required', 'Please select a user to test');
      return;
    }

    if (!userConfig && !userConfigLoading) {
      toast.info('Fetching user config', 'Please wait while we load the user configuration');
      setUserConfigLoading(true);
      try {
        const cfg = await apiService.getUserLLMConfig(selectedUser);
        setUserConfig(cfg as unknown as Record<string, unknown>);
      } catch (e) {
        console.error('Failed to load user config before test', e);
      } finally {
        setUserConfigLoading(false);
      }
    }

    setTesting(true);
    setTestResults(null);
    setTestContext({ user: selectedUser, page: currentPage, search: searchTerm });

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

  // Helpers: format status and sanitize provider errors for user-friendly display
  const formatOverallStatus = (raw: string): string => {
    if (!raw) return 'Unknown';
    const spaced = raw.replace(/_/g, ' ').trim();
    return spaced
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getFriendlyError = (err: unknown): string => {
    if (!err) return '';
    const msg = String(err);
    const messageMatch = msg.match(/"message"\s*:\s*"([^"]+)"/i);
    if (messageMatch && messageMatch[1]) {
      return messageMatch[1];
    }
    if (/api key not valid|invalid api key|unauthorized|invalid authentication/i.test(msg)) {
      return 'API key not valid. Please provide a valid key.';
    }
    if (/rate limit|quota|too many requests|429/i.test(msg)) {
      return 'Rate limit reached. Please wait and try again.';
    }
    if (/timeout|timed out|deadline/i.test(msg)) {
      return 'Request timed out. Please try again.';
    }
    if (/connection|network|unreachable|host/i.test(msg)) {
      return 'Network or connection error. Please check connectivity and endpoint.';
    }
    return 'Provider returned an error. Please verify your API key, model, and endpoint.';
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
      <AdminLayout activeSection="testing">
        <div className="space-y-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 rounded skeleton-block" />
            <div className="h-8 w-28 rounded skeleton-block" />
          </div>

          {/* User Selection skeleton */}
          <div className="admin-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="h-5 w-48 rounded skeleton-block" />
              <div className="flex items-center gap-2">
                <div className="h-10 w-48 rounded skeleton-block" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 w-40 rounded skeleton-block" />
                    <div className="h-4 w-8 rounded skeleton-block" />
                  </div>
                  <div className="h-3 w-32 rounded skeleton-block mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-48 rounded skeleton-block" />
                    <div className="h-3 w-20 rounded skeleton-block" />
                  </div>
                  <div className="h-3 w-36 rounded skeleton-block mt-1" />
                </div>
              ))}
            </div>
            {/* Pagination skeleton */}
            <div className="flex items-center justify-between mt-4">
              <div className="h-4 w-32 rounded skeleton-block" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-20 rounded skeleton-block" />
                <div className="h-4 w-16 rounded skeleton-block" />
                <div className="h-8 w-16 rounded skeleton-block" />
              </div>
            </div>
          </div>

          {/* Test Configuration skeleton */}
          <div className="admin-card p-6">
            <div className="h-5 w-36 rounded skeleton-block mb-4" />
            <div className="space-y-4">
              <div>
                <div className="h-4 w-20 rounded skeleton-block mb-2" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 rounded skeleton-block" />
                  <div className="h-4 w-20 rounded skeleton-block" />
                  <div className="h-4 w-18 rounded skeleton-block" />
                </div>
              </div>
              <div>
                <div className="h-4 w-24 rounded skeleton-block mb-2" />
                <div className="h-20 w-full rounded skeleton-block" />
              </div>
              <div className="h-10 w-24 rounded skeleton-block" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeSection="testing">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Testing</h1>
            <button 
              onClick={async () => {
                setSearchInput('');
                setSearchTerm('');
                setCurrentPage(1);
                await fetchUsers(1, '');
              }}
              className="admin-button-outline px-4 py-2 rounded-lg"
            >
              Refresh Users
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={async () => { await fetchUsers(1, searchTerm); }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="testing">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LLM Testing</h1>
        <button 
          onClick={() => fetchUsers(currentPage, searchTerm)}
          className="admin-button-outline px-4 py-2 rounded-lg"
        >
          Refresh Users
        </button>
      </div>

      {/* User Selection */}
      <div className="admin-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Select User for Testing</h3>
            {searchTerm && (
              <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                Filtered by: {`"${searchTerm}"` }
              </p>
            )}
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none"
                style={{ color: 'var(--foreground)', background: 'transparent' }}
              />
              <button
                onClick={handleSearch}
                className="px-3 py-2 border-l text-sm hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                title="Search"
              >
                <FiSearch className="w-4 h-4" />
              </button>
            </div>
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                title="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {users.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {users.map((user) => (
              <div 
                key={user.subscription_key}
                onClick={async () => {
                  setSelectedUser(user.subscription_key);
                  setUserConfig(null);
                  setTestResults(null); // Clear previous test results
                  setTestContext(null); // Clear test context when selecting different user
                  setUserConfigLoading(true);
                  try {
                    const cfg = await apiService.getUserLLMConfig(user.subscription_key);
                    setUserConfig(cfg as unknown as Record<string, unknown>);
                  } catch (e) {
                    console.error('Failed to load user config', e);
                    toast.error('Failed to load user config', 'Please try again');
                  } finally {
                    setUserConfigLoading(false);
                  }
                }}
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <FiSearch className="w-12 h-12 mx-auto" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              No users found
            </h3>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              {searchTerm
                ? `No users match your search "${searchTerm}". Try a different search term.`
                : 'No active subscriptions available for testing.'
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalUsers > 0 && (
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Showing {startIndex}-{endIndex} of {totalUsers} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Configuration */}
      {selectedUser && (
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Test Configuration For {users.find(u => u.subscription_key === selectedUser)?.customer_email || selectedUser}
            </h3>
          </div>

          {userConfigLoading && (
            <div className="space-y-4 animate-pulse">
              <div>
                <div className="h-4 w-20 rounded skeleton-block mb-2" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 rounded skeleton-block" />
                  <div className="h-4 w-20 rounded skeleton-block" />
                  <div className="h-4 w-18 rounded skeleton-block" />
                </div>
              </div>
              <div>
                <div className="h-4 w-24 rounded skeleton-block mb-2" />
                <div className="h-20 w-full rounded skeleton-block" />
              </div>
              <div className="h-10 w-24 rounded skeleton-block" />
            </div>
          )}

          {!userConfigLoading && (
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
          )}
        </div>
      )}

      {/* Test Results */}
      {testResults && testContext &&
       testContext.user === selectedUser &&
       testContext.page === currentPage &&
       testContext.search === searchTerm && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Test Results</h3>
          
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Overall Status:</span>
              <span className="font-medium" style={{ color: theme === 'dark' ? 'var(--accent)' : '#000000' }}>
                {formatOverallStatus(String(testResults.overall_status || 'Unknown'))}
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
                  {(() => {
                    const preview = (testResults.main_llm_test as TestResult).response_preview;
                    return preview && typeof preview === 'string' ? (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: 'var(--hover-bg)' }}>
                        {preview}
                      </div>
                    ) : null;
                  })()}
                  {(() => {
                    const error = (testResults.main_llm_test as TestResult).error;
                    return error ? (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        {getFriendlyError(error)}
                      </div>
                    ) : null;
                  })()}
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
                  {(() => {
                    const preview = (testResults.fallback_llm_test as TestResult).response_preview;
                    return preview && typeof preview === 'string' ? (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: 'var(--hover-bg)' }}>
                        {preview}
                      </div>
                    ) : null;
                  })()}
                  {(() => {
                    const error = (testResults.fallback_llm_test as TestResult).error;
                    return error ? (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        {getFriendlyError(error)}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}