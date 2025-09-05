'use client';

import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { FiUser, FiSettings, FiArrowRight } from 'react-icons/fi';
import { useLoginFlow } from '@/contexts/LoginFlowContext';


export default function LoginSelector() {
  const { setLoginType } = useLoginFlow();
  const [selectedType, setSelectedType] = useState<'admin' | 'user' | null>(null);

  const handleSelection = (type: 'admin' | 'user') => {
    setSelectedType(type);
    setTimeout(() => {
      setLoginType(type);
    }, 200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md p-8 relative">
        <div className="fixed top-4 left-4">
          {/* Optional: brand/logo or keep empty */}
        </div>
        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Welcome
          </h1>
          <p className="text-lg" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Choose your login type to continue
          </p>
        </div>

        {/* Login Type Cards */}
        <div className="space-y-4">
          {/* Admin Login Card */}
          <div
            onClick={() => handleSelection('admin')}
            className={`login-card p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedType === 'admin' ? 'scale-105' : 'hover:scale-102'
            }`}
            style={{
              background: selectedType === 'admin' ? 'var(--accent)' : 'var(--card-bg)',
              borderColor: selectedType === 'admin' ? 'var(--accent)' : 'var(--border)',
              color: selectedType === 'admin' ? 'white' : 'var(--foreground)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{
                    background: selectedType === 'admin' ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                    color: selectedType === 'admin' ? 'white' : 'white'
                  }}
                >
                  <FiSettings className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Admin Panel</h3>
                  <p className="text-sm opacity-80">
                    Full system administration access
                  </p>
                </div>
              </div>
              <FiArrowRight 
                className={`text-xl transition-transform duration-200 ${
                  selectedType === 'admin' ? 'translate-x-1' : ''
                }`}
              />
            </div>
          </div>

          {/* User Login Card */}
          <div
            onClick={() => handleSelection('user')}
            className={`login-card p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedType === 'user' ? 'scale-105' : 'hover:scale-102'
            }`}
            style={{
              background: selectedType === 'user' ? 'var(--accent)' : 'var(--card-bg)',
              borderColor: selectedType === 'user' ? 'var(--accent)' : 'var(--border)',
              color: selectedType === 'user' ? 'white' : 'var(--foreground)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{
                    background: selectedType === 'user' ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                    color: selectedType === 'user' ? 'white' : 'white'
                  }}
                >
                  <FiUser className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">User Dashboard</h3>
                  <p className="text-sm opacity-80">
                    Manage your subscription features
                  </p>
                </div>
              </div>
              <FiArrowRight 
                className={`text-xl transition-transform duration-200 ${
                  selectedType === 'user' ? 'translate-x-1' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Need help? Contact your system administrator
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}