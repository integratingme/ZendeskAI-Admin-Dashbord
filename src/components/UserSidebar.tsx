'use client';

import { FiX, FiHome, FiUser, FiSun, FiMoon, FiActivity, FiLink } from 'react-icons/fi';
import { CgOptions } from 'react-icons/cg';
import { TbPrompt } from 'react-icons/tb';
import { GrSync } from 'react-icons/gr';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

type ActiveSection = 'overview' | 'features' | 'testing' | 'settings' | 'prompts' | 'macros' | 'integrations';

interface UserSidebarProps {
  activeSection: ActiveSection;
  isOpen: boolean;
  onToggle: () => void;
}

export default function UserSidebar({ activeSection, isOpen, onToggle }: UserSidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  const menuItems = [
    {
      id: 'overview' as ActiveSection,
      label: 'Overview',
      icon: FiHome,
      description: 'Dashboard summary',
      path: '/user/overview'
    },
    {
      id: 'features' as ActiveSection,
      label: 'Features',
      icon: CgOptions,
      description: 'Manage AI features',
      path: '/user/features'
    },
    {
      id: 'testing' as ActiveSection,
      label: 'Testing',
      icon: FiActivity,
      description: 'Test configurations',
      path: '/user/testing'
    },
    {
      id: 'prompts' as ActiveSection,
      label: 'Prompts',
      icon: TbPrompt,
      description: 'Manage prompts',
      path: '/user/prompts'
    },
    {
      id: 'macros' as ActiveSection,
      label: 'Macros',
      icon: GrSync,
      description: 'Sync and manage macros',
      path: '/user/macros'
    },
    {
      id: 'integrations' as ActiveSection,
      label: 'Integrations',
      icon: FiLink,
      description: 'Connect Zendesk and Confluence',
      path: '/user/integrations'
    },
    {
      id: 'settings' as ActiveSection,
      label: 'Settings',
      icon: FiUser,
      description: 'Account settings',
      path: '/user/settings'
    }
  ];

  const handleSectionClick = (path: string) => {
    router.push(path);
    if (window.innerWidth < 768) {
      onToggle(); // Close sidebar on mobile after selection
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
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--card-bg)',
          borderRight: '1px solid var(--border)'
        }}
      >
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                User Dashboard
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                Manage your AI features
              </p>
            </div>
            <button
              onClick={onToggle}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--foreground)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FiX className="text-xl" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                    isActive ? 'shadow-sm' : ''
                  }`}
                  style={{
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'white' : 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className="text-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div 
                      className="text-xs opacity-75 truncate"
                      style={{ 
                        color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--foreground)' 
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Theme Toggle */}
          <div className="mt-6 pt-4">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left"
              style={{
                background: 'transparent',
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
              {theme === 'light' ? (
                <FiMoon className="text-lg flex-shrink-0" />
              ) : (
                <FiSun className="text-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </div>
                <div className="text-xs opacity-75">
                  Switch theme
                </div>
              </div>
            </button>
          </div>
        </nav>

      </div>
    </>
  );
}