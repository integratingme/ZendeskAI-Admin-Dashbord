'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { 
  FiBarChart2, 
  FiUsers, 
  FiTrendingUp, 
  FiSettings, 
  FiActivity, 
  FiKey,
  FiLogOut
} from 'react-icons/fi';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: 'overview' | 'subscriptions' | 'analytics' | 'providers' | 'testing' | 'tokens') => void;
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
];

export default function Sidebar({ activeSection, onSectionChange, isOpen = true, onToggle }: SidebarProps) {
  const { logout } = useAuth();
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        admin-sidebar fixed md:static inset-y-0 left-0 z-50
        w-64 min-h-screen p-4 md:p-6 bg-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-black">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Zendesk AI Assistant</p>
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
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <IconComponent className="text-lg flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 mb-4"
        >
          <FiLogOut className="text-lg flex-shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
        
        <div className="text-xs text-gray-500">
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