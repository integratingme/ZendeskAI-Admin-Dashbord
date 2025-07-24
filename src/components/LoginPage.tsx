'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Please enter an admin token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(token.trim());
      if (!success) {
        setError('Invalid admin token. Please check your token and try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Zendesk AI Assistant</p>
          <p className="mt-4 text-sm text-gray-500">
            Enter your admin token to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter your admin token..."
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full admin-button py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Need an admin token?</h3>
            <div className="text-xs text-gray-500 space-y-2">
              <p>• Contact your system administrator</p>
              <p>• Use the initial token from environment variables</p>
              <p>• Generate a new token if you have existing access</p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          <p>© 2025 Admin Dashboard v1.0.0</p>
        </div>
      </div>
    </div>
  );
}