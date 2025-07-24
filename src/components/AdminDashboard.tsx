'use client';

import { useState } from 'react';
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

  return (
    <div className="admin-container flex">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <main className="admin-content flex-1 p-8">
        {renderContent()}
      </main>
    </div>
  );
}