import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry, className = '' }) => {
  return (
    <div
      className={`bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start justify-between shadow-xs ${className}`}
    >
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
        <div className="text-sm font-medium leading-relaxed">{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>重试</span>
        </button>
      )}
    </div>
  );
};
