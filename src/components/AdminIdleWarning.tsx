'use client';

import React from 'react';

interface Props {
  isOpen: boolean;
  secondsLeft?: number;
  onStay: () => void;
  onLogout: () => void;
}

export default function AdminIdleWarning({ isOpen, secondsLeft, onStay, onLogout }: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--modal-overlay)' }}>
      <div className="rounded-lg p-6 w-full max-w-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>You are about to be logged out</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
          You have been inactive for a while. For your security, you will be signed out{secondsLeft ? ` in ${secondsLeft}s` : ' soon'}.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onLogout} className="px-4 py-2 rounded" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>Logout now</button>
          <button onClick={onStay} className="px-4 py-2 rounded" style={{ background: 'var(--accent)', color: 'white' }}>Stay signed in</button>
        </div>
      </div>
    </div>
  );
}
