'use client';

import { useState } from 'react';
import { FiArrowLeft, FiEye, FiEyeOff, FiUser } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToastContext } from '@/contexts/ToastContext';


import { useLoginFlow } from '@/contexts/LoginFlowContext';

export default function UserLogin() {
  const [email, setEmail] = useState('');
  const [subscriptionKey, setSubscriptionKey] = useState('');
  const [showSubscriptionKey, setShowSubscriptionKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useUserAuth();
  const toast = useToastContext();
  const { setLoginType } = useLoginFlow();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !subscriptionKey) {
      toast.error('Missing Information', 'Please enter both email and subscription key');
      return;
    }

    setIsLoading(true);
    
    try {
      await login(email, subscriptionKey);
      toast.success('Login Successful', 'Welcome to your dashboard!');
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg) {
        if (errorMsg.includes('Invalid subscription key')) {
          errorMessage = 'Invalid subscription key. Please check your credentials.';
        } else if (errorMsg.includes('Email does not match')) {
          errorMessage = 'Email does not match the subscription. Please verify your email address.';
        } else if (errorMsg.includes('Subscription is inactive')) {
          errorMessage = 'Your subscription is inactive. Please contact support.';
        } else if (errorMsg.includes('Subscription has expired')) {
          errorMessage = 'Your subscription has expired. Please renew your subscription.';
        } else {
          errorMessage = errorMsg;
        }
      }
      
      toast.error('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md p-8">
        {/* Back Button */}
        <button
          onClick={() => setLoginType('selector')}
          className="absolute top-4 left-4 flex items-center space-x-2 text-sm transition-colors"
          style={{ color: 'var(--foreground)', opacity: 0.7 }}
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

        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)' }}
          >
            <FiUser className="text-2xl text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            User Login
          </h1>
          <p className="text-lg" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Sign in with your email and subscription key
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border transition-colors"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Subscription Key Field */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Subscription Key
            </label>
            <div className="relative">
              <input
                type={showSubscriptionKey ? 'text' : 'password'}
                value={subscriptionKey}
                onChange={(e) => setSubscriptionKey(e.target.value)}
                className="w-full px-4 pr-12 py-3 rounded-lg border transition-colors"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}
                placeholder="Enter your subscription key"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowSubscriptionKey(!showSubscriptionKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                style={{ color: 'var(--foreground)', opacity: 0.5 }}
                disabled={isLoading}
              >
                {showSubscriptionKey ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Your subscription key was provided when your account was created
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email || !subscriptionKey}
            className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && email && subscriptionKey) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Don&apos;t have a subscription key?{' '}
            <span style={{ color: 'var(--accent)' }}>Contact your administrator</span>
          </p>
        </div>

        {/* Security Notice */}
        <div 
          className="mt-6 p-4 rounded-lg border"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)'
          }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Your login credentials are encrypted and secure
          </p>
        </div>
      </div>
    </div>
  );
}