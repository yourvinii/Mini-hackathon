import React from 'react';
import { Menu, ShieldAlert, User, Activity, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar({ onToggleSidebar, activeArea = 'Western Ghats Sector 4' }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Current AOI:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {activeArea}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick link to New Analysis */}
        <Link
          to="/analysis"
          id="btn-quick-new-analysis"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Start New Analysis</span>
        </Link>

        {/* Server status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>Catalog Online</span>
        </div>

        {/* Officer Profile Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold ring-2 ring-emerald-500/30">
            PD
          </div>
          <div className="hidden text-left lg:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              Officer P. Deshmukh
            </div>
            <div className="text-[10px] text-slate-600">
              Field Verification Unit
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
