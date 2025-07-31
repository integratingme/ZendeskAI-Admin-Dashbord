'use client';

import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import Sidebar from '@/components/Sidebar';
import Overview from '@/components/Overview';
import Subscriptions from '@/components/Subscriptions';
import Analytics from '@/components/Analytics';
import Providers from '@/components/Providers';
import Testing from '@/components/Testing';
import AdminTokens from '@/components/AdminTokens';
import FeatureManagement from '@/components/FeatureManagement';
import TierTemplates from '@/components/TierTemplates';

type ActiveSection = 'overview' | 'subscriptions' | 'analytics' | 'providers' | 'testing' | 'tokens' | 'features' | 'templates';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'analytics':
        return <Analytics />;
      case 'providers':
        return <Providers />;
      case 'testing':
        return <Testing />;
      case 'tokens':
        return <AdminTokens />;
      case 'features':
        return <FeatureManagement />;
      case 'templates':
        return <TierTemplates />;
      default:
        return <Overview />;
    }
  };

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
      default:
        return 'Overview';
    }
  };

  return (
    <div className="admin-container flex min-h-screen">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
}