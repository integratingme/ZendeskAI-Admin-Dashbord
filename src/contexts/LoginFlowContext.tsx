'use client';

import React, { createContext, useContext, useState } from 'react';

export type LoginType = 'selector' | 'admin' | 'user';

interface LoginFlowContextType {
  loginType: LoginType;
  setLoginType: (t: LoginType) => void;
}

const LoginFlowContext = createContext<LoginFlowContextType | undefined>(undefined);

export const LoginFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loginType, setLoginType] = useState<LoginType>('selector');

  return (
    <LoginFlowContext.Provider value={{ loginType, setLoginType }}>
      {children}
    </LoginFlowContext.Provider>
  );
};

export const useLoginFlow = () => {
  const ctx = useContext(LoginFlowContext);
  if (!ctx) {
    throw new Error('useLoginFlow must be used within a LoginFlowProvider');
  }
  return ctx;
};