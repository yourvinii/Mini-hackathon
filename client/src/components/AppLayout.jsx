import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Info } from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Global Advisory Banner for Demo Integrity */}
        <div className="bg-emerald-950 text-emerald-200 text-xs py-1.5 px-4 sm:px-6 flex items-center justify-between border-b border-emerald-900/60 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium text-emerald-300">
              Environmental Monitoring Notice:
            </span>
            <span className="text-emerald-100 hidden sm:inline">
              LandWatch highlights land-use anomalies for field inspection. Findings indicate potential changes requiring authorized ground verification.
            </span>
            <span className="text-emerald-100 sm:hidden">
              Ground verification required for all flagged anomalies.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700/60">
            Hackathon MVP
          </span>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
