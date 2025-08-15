'use client';

import { useState } from 'react';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginFlow } from '@/contexts/LoginFlowContext';


export default function LoginPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { setLoginType } = useLoginFlow();

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
    <div className="relative min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Back Button */}
        <button
          onClick={() => setLoginType('selector')}
          className="absolute top-4 left-4 flex items-center space-x-2 text-sm transition-colors"
          style={{ color: 'var(--foreground)', opacity: 0.7, zIndex: 10 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
        >
          <FiArrowLeft />
          <span>Back to login selection</span>
        </button>

        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)' }}
          >
            <FiShield className="text-2xl text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Dashboard</h1>
          <p className="mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Indesk AI Assistant</p>
          <p className="mt-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
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