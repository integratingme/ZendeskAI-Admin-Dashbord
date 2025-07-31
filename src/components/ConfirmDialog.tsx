'use client';

import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--modal-overlay)' }}>
      <div className="rounded-lg shadow-xl max-w-md w-full font-sans" style={{ background: 'var(--card-bg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 ${getIconColor()}`}>
              <FiAlertTriangle className="text-xl" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="transition-colors"
            style={{ color: 'var(--foreground)', opacity: 0.5 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
            }}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg transition-colors font-medium"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              background: 'var(--background)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background)';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${getButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing confirm dialogs
export function useConfirm() {
  const confirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      // This would need to be implemented with a context provider
      // For now, we'll use the component directly in each component
      resolve(window.confirm(`${options.title}\n\n${options.message}`));
    });
  };

  return { confirm };
}