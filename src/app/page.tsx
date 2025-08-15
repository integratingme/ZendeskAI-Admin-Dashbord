'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAuth } from '@/contexts/UserAuthContext';
import LoginPage from '@/components/LoginPage';
import AdminDashboard from '@/components/AdminDashboard';
import UserLogin from '@/components/UserLogin';
import UserDashboard from '@/components/UserDashboard';
import LoginSelector from '@/components/LoginSelector';
import { LoginFlowProvider, useLoginFlow } from '@/contexts/LoginFlowContext';


function AppContent() {
  const { isAuthenticated: isAdminAuthenticated, loading: adminLoading } = useAuth();
  const { isAuthenticated: isUserAuthenticated, isLoading: userLoading } = useUserAuth();
  const { loginType } = useLoginFlow();

  // Show loading if either auth system is loading
  if (adminLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If admin is authenticated, show admin dashboard
  if (isAdminAuthenticated) {
    return <AdminDashboard />;
  }

  // If user is authenticated, show user dashboard
  if (isUserAuthenticated) {
    return <UserDashboard />;
  }

  // Show appropriate login screen based on selection
  switch (loginType) {
    case 'admin':
      return <LoginPage />;
    case 'user':
      return <UserLogin />;
    default:
      return <LoginSelector />;
  }
}

export default function Home() {
  return (
    <LoginFlowProvider>
      <AppContent />
    </LoginFlowProvider>
  );
}
