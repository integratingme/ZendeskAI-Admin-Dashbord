'use client';

import { useAuth } from '@/contexts/AuthContext';
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
}

const menuItems = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'subscriptions', label: 'Subscriptions', icon: FiUsers },
  { id: 'analytics', label: 'Analytics', icon: FiTrendingUp },
  { id: 'providers', label: 'Providers', icon: FiSettings },
  { id: 'testing', label: 'Testing', icon: FiActivity },
  { id: 'tokens', label: 'Admin Tokens', icon: FiKey },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="admin-sidebar w-64 min-h-screen p-6">
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
              onClick={() => onSectionChange(item.id as Parameters<typeof onSectionChange>[0])}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === item.id
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <IconComponent className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 mb-4"
        >
          <FiLogOut className="text-lg" />
          <span className="font-medium">Logout</span>
        </button>
        
        <div className="text-xs text-gray-500">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 IntegratingMe</p>
        </div>
      </div>
    </div>
  );
}