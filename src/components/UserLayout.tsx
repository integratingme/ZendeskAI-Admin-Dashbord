'use client';

import { useState } from 'react';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import UserSidebar from '@/components/UserSidebar';
import ConfirmDialog from '@/components/ConfirmDialog';
import UserIdleWarning from '@/components/UserIdleWarning';

type ActiveSection = 'overview' | 'features' | 'testing' | 'settings' | 'prompts' | 'macros' | 'integrations';

interface UserLayoutProps {
  children: React.ReactNode;
  activeSection: ActiveSection;
}

export default function UserLayout({ children, activeSection }: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useUserAuth();
  const { isIdleWarningOpen, warningSecondsLeft, staySignedIn, forceLogoutForIdle } = useUserAuth();

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'overview':
        return 'Dashboard Overview';
      case 'features':
        return 'Feature Management';
      case 'testing':
        return 'Testing & Validation';
      case 'settings':
        return 'Account Settings';
      case 'prompts':
        return 'Prompts';
      case 'macros':
        return 'Macros';
      case 'integrations':
        return 'Integrations';
      default:
        return 'Dashboard';
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="user-container flex min-h-screen">
      <UserSidebar 
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
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--foreground)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Logout"
          >
            <FiLogOut className="text-xl" />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex p-6 items-center justify-between" style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{getSectionTitle()}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
               {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="user-content flex-1 p-4 md:p-8 overflow-x-auto">
          {children}
        </main>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to log in again to access your dashboard."
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />

      <UserIdleWarning
        isOpen={!!isIdleWarningOpen}
        secondsLeft={warningSecondsLeft}
        onStay={staySignedIn}
        onLogout={forceLogoutForIdle}
      />
    </div>
  );
}