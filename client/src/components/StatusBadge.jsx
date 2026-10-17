import React from 'react';

export default function StatusBadge({ status, type = 'status', className = '' }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      // General / Verification Statuses
      case 'OPEN':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10';
      case 'VERIFIED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'PROCESSING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      
      // Priorities
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      // Anomaly Categories
      case 'VEGETATION_LOSS':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'NEW_CONSTRUCTION':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'WATER_CHANGE':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'FOREST':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'WILDLIFE':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'WATERBODY':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'RESTRICTED_LAND':
        return 'bg-purple-100 text-purple-900 border-purple-300';

      // Demo/Source tags
      case 'PREPARED_DEMO':
      case 'PREPARED_RESULT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
      case 'SENTINEL_2':
        return 'bg-teal-50 text-teal-700 border-teal-200 font-medium';
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'VEGETATION_LOSS': return 'Vegetation Loss';
      case 'NEW_CONSTRUCTION': return 'New Construction';
      case 'WATER_CHANGE': return 'Hydrological Change';
      case 'IN_PROGRESS': return 'In Progress';
      case 'PREPARED_DEMO': return 'Prepared Demo';
      case 'PREPARED_RESULT': return 'Prepared Result';
      case 'SENTINEL_2': return 'Sentinel-2 RGB';
      default: return normalized.replace(/_/g, ' ');
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border font-medium tracking-wide ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 mr-1.5 shrink-0" />
      {getLabel()}
    </span>
  );
}
