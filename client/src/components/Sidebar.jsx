import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  ClipboardCheck,
  ShieldCheck,
  Satellite,
  Compass,
  FileText
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard, exact: true },
    { name: 'Change Analysis', to: '/analysis', icon: Layers },
    { name: 'Monitoring Areas', to: '/areas', icon: MapPin },
    { name: 'Inspections', to: '/inspections', icon: ClipboardCheck },
    { name: 'Protected Zones', to: '/protected-zones', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-400/30">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-base font-sans">
                LandWatch
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Earth Observation Platform</p>
          </div>
        </div>

        {/* Demo banner indicator */}
        <div className="mx-4 mt-4 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Demonstration Mode</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-normal">
            Prepared multi-temporal Sentinel-2 simulation dataset loaded.
          </p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Intelligence Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info / System Specs */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              CRS Projection
            </span>
            <span className="font-mono text-slate-300">EPSG:4326</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              API Standard
            </span>
            <span className="font-mono text-emerald-400">REST v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
