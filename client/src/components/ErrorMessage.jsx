import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  title = 'Failed to load intelligence data',
  message = 'An error occurred while communicating with the backend service.',
  onRetry,
  className = ''
}) {
  return (
    <div
      className={`rounded-xl bg-rose-50/70 border border-rose-200 p-6 text-slate-800 ${className}`}
      role="alert"
    >
      <div className="flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
          <p className="mt-1 text-xs text-rose-700 leading-relaxed">{message}</p>
          {onRetry && (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-xs font-medium text-rose-800 hover:bg-rose-50 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Request</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
