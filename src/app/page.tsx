'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/LoginPage';
import UserLogin from '@/components/UserLogin';
import LoginSelector from '@/components/LoginSelector';
import { LoginFlowProvider, useLoginFlow } from '@/contexts/LoginFlowContext';
import TextLoader from '@/components/TextLoader';


function AppContent() {
  const { isAuthenticated: isAdminAuthenticated, loading: adminLoading } = useAuth();
  const { isAuthenticated: isUserAuthenticated, isLoading: userLoading } = useUserAuth();
  const { loginType } = useLoginFlow();
  const router = useRouter();

  // Set page title based on current state
  useEffect(() => {
    let title = 'IndeskAI';
    if (loginType === 'admin') {
      title = 'Admin Login - IndeskAI';
    } else if (loginType === 'user') {
      title = 'User Login - IndeskAI';
    } else {
      title = 'Welcome - IndeskAI';
    }
    document.title = title;
  }, [loginType]);

  // Redirect authenticated users to their respective dashboards
  useEffect(() => {
    if (!adminLoading && !userLoading) {
      if (isAdminAuthenticated) {
        router.push('/admin/overview');
        return;
      }
      if (isUserAuthenticated) {
        router.push('/user/overview');
        return;
      }
    }
  }, [isAdminAuthenticated, isUserAuthenticated, adminLoading, userLoading, router]);

  // Show loading if either auth system is loading
  if (adminLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <TextLoader fullscreen />
      </div>
    );
  }

  // If already authenticated, show loading while redirecting
  if (isAdminAuthenticated || isUserAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <TextLoader fullscreen />
      </div>
    );
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
