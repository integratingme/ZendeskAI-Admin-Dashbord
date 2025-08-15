'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { 
  FiBarChart2, 
  FiUsers, 
  FiTrendingUp, 
  FiSettings, 
  FiActivity, 
  FiKey,
  FiLogOut,
  FiSun,
  FiMoon,
  FiLayers
} from 'react-icons/fi';
import { CgOptions } from 'react-icons/cg';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: 'overview' | 'subscriptions' | 'analytics' | 'providers' | 'testing' | 'tokens' | 'features' | 'templates') => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'subscriptions', label: 'Subscriptions', icon: FiUsers },
  { id: 'analytics', label: 'Analytics', icon: FiTrendingUp },
  { id: 'providers', label: 'Providers', icon: FiSettings },
  { id: 'testing', label: 'Testing', icon: FiActivity },
  { id: 'tokens', label: 'Admin Tokens', icon: FiKey },
  { id: 'features', label: 'Feature Control', icon: CgOptions },
  { id: 'templates', label: 'Tier Templates', icon: FiLayers },
];

export default function Sidebar({ activeSection, onSectionChange, isOpen = true, onToggle }: SidebarProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const handleMenuItemClick = (section: Parameters<typeof onSectionChange>[0]) => {
    onSectionChange(section);
    // Close mobile menu after selection
    if (onToggle && window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'var(--modal-overlay)' }}
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        admin-sidebar fixed md:static inset-y-0 left-0 z-50
        w-64 min-h-screen p-4 md:p-6
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
      <div className="mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Indesk AI Assistant</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id as Parameters<typeof onSectionChange>[0])}
              className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === item.id
                  ? 'text-white'
                  : 'hover:bg-opacity-50'
              }`}
              style={{
                backgroundColor: activeSection === item.id ? 'var(--accent)' : 'transparent',
                color: activeSection === item.id ? 'white' : 'var(--foreground)'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <IconComponent className="text-lg flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Theme Toggle */}
        <div className="mt-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <FiMoon className="text-lg flex-shrink-0" /> : <FiSun className="text-lg flex-shrink-0" />}
            <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </nav>
      
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg text-left transition-colors text-red-600 mb-4"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <FiLogOut className="text-lg flex-shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
        
        <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
          <p>Version 1.0.0</p>
          <p className="mt-1">Copyright 2025 IntegratingMe</p>
        </div>
      </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to enter your admin token again to access the dashboard."
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </>
  );
}