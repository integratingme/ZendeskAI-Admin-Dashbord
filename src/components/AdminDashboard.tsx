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

type ActiveSection = 'overview' | 'subscriptions' | 'analytics' | 'providers' | 'testing' | 'tokens';

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
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiMenu className="text-xl text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-black">{getSectionTitle()}</h1>
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