import React from 'react';

export default function SummaryCard({
  title,
  value,
  icon: Icon,
  subtitle,
  badgeText,
  badgeType = 'neutral',
  onClick,
  id
}) {
  const badgeColors = {
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border-rose-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-emerald-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-3">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value !== undefined && value !== null ? value : '—'}
        </span>
        {badgeText && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              badgeColors[badgeType] || badgeColors.neutral
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
