'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FiMenu } from 'react-icons/fi';
import Sidebar from '@/components/Sidebar';
import AdminIdleWarning from '@/components/AdminIdleWarning';

type ActiveSection = 'overview' | 'subscriptions' | 'analytics' | 'providers' | 'testing' | 'tokens' | 'features' | 'templates' | 'prompts';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: ActiveSection;
}

export default function AdminLayout({ children, activeSection }: AdminLayoutProps) {
  const { isIdleWarningOpen, warningSecondsLeft, staySignedIn, forceLogoutForIdle } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'overview':
        return 'Overview';
      case 'subscriptions':
        return 'Subscriptions';
      case 'analytics':
        return 'Analytics';
      case 'providers':
        return 'Providers';
      case 'testing':
        return 'Testing';
      case 'tokens':
        return 'Admin Tokens';
      case 'features':
        return 'Feature Management';
      case 'templates':
        return 'Tier Templates';
      case 'prompts':
        return 'Prompts';
      default:
        return 'Overview';
    }
  };

  return (
    <div className="admin-container flex min-h-screen">
      <Sidebar 
        activeSection={activeSection} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Mobile Header */}
        <header className="md:hidden p-4 flex items-center justify-between" style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--foreground)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FiMenu className="text-xl" />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{getSectionTitle()}</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Main Content Area */}
        <main className="admin-content flex-1 p-4 md:p-8 overflow-x-auto">
          {children}
        </main>

        {/* Idle Warning Modal */}
        <AdminIdleWarning
          isOpen={!!isIdleWarningOpen}
          secondsLeft={warningSecondsLeft}
          onStay={staySignedIn}
          onLogout={forceLogoutForIdle}
        />
      </div>
    </div>
  );
}