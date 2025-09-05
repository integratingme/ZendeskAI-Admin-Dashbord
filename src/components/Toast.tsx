'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <FiCheck className="text-lg" />;
      case 'error':
        return <FiX className="text-lg" />;
      case 'warning':
        return <FiAlertTriangle className="text-lg" />;
      case 'info':
        return <FiInfo className="text-lg" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 text-green-800';
      case 'error':
        return 'border-red-200 text-red-800';
      case 'warning':
        return 'border-yellow-200 text-yellow-800';
      case 'info':
        return 'border-blue-200 text-blue-800';
    }
  };

  const getIconBg = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'info':
        return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg
      transform transition-all duration-300 ease-in-out
      hover:shadow-xl font-sans
      ${getStyles()}
    `}
    style={{ background: 'var(--card-bg)' }}>
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5
        ${getIconBg()}
      `}>
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight" style={{ color: 'var(--foreground)' }}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-sm mt-1 leading-tight" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 transition-colors"
        style={{ color: 'var(--foreground)', opacity: 0.5 }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.5';
        }}
      >
        <FiX className="text-lg" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  };
}