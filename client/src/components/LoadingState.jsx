import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading satellite intelligence data...', minHeight = 'h-64' }) {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} w-full p-8 text-center`}>
      <div className="relative flex items-center justify-center w-14 h-14 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-100 animate-ping opacity-30"></div>
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-800 animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="text-xs text-slate-600 mt-1">Connecting to geospatial catalog and verification service</p>
    </div>
  );
}
