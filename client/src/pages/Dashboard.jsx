import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Layers,
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import { getDashboard, getAreas, getProtectedZones } from '../api';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import MapView from '../components/MapView';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [areas, setAreas] = useState([]);
  const [protectedZones, setProtectedZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, areasRes, zonesRes] = await Promise.all([
        getDashboard(),
        getAreas(),
        getProtectedZones()
      ]);
      setData(dashRes);
      setAreas(areasRes.areas || []);
      setProtectedZones(zonesRes.protectedZones || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Unable to fetch dashboard intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingState message="Aggregating earth observation intelligence..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboardData} />;

  const { summary, recentAnalyses } = data || {};
  const activeArea = areas[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Mission Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Satellite Change Intelligence Command
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active Operations
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Detect vegetation clearing, unauthorized built-up expansion, and protected reserve boundary overlaps using multi-temporal satellite scene alignment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/analysis"
            id="btn-dashboard-start-analysis"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Change Analysis</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          id="kpi-monitored-areas"
          title="Monitored AOIs"
          value={summary?.monitoredAreas ?? 0}
          icon={MapPin}
          subtitle="Configured geographic sectors"
          badgeText="Active"
          badgeType="success"
        />
        <SummaryCard
          id="kpi-completed-analyses"
          title="Change Analyses"
          value={summary?.completedAnalyses ?? 0}
          icon={Layers}
          subtitle="Processed multi-temporal pairs"
          badgeText="Verified"
          badgeType="neutral"
        />
        <SummaryCard
          id="kpi-pending-inspections"
          title="Pending Inspections"
          value={summary?.pendingInspections ?? 0}
          icon={ClipboardCheck}
          subtitle="Tasks awaiting ground verification"
          badgeText="Action Required"
          badgeType="warning"
        />
        <SummaryCard
          id="kpi-protected-alerts"
          title="Protected Zone Alerts"
          value={summary?.protectedZoneAlerts ?? 0}
          icon={ShieldAlert}
          subtitle="Ecological buffer intersections"
          badgeText="High Priority"
          badgeType="danger"
        />
      </div>

      {/* Surface Urgent Inspection Tasks Banner (Chunk 5) */}
      {data?.urgentTasks && data.urgentTasks.length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                  Urgent Ground Inspection Required ({data.urgentTasks.length} Active High-Priority Tasks)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                  Buffer Zone Overlap
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                {data.urgentTasks[0].title} — Assigned to <span className="font-semibold">{data.urgentTasks[0].assignedTo || 'Unassigned'}</span> in {data.urgentTasks[0].monitoringArea?.name}
              </p>
            </div>
          </div>
          <Link
            to="/inspections?priority=HIGH"
            id="btn-dashboard-urgent-inspections"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs shrink-0 transition-colors"
          >
            <span>Review Urgent Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Split Map Preview & Monitored Areas Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map Preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Geospatial Monitoring Overview
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing active monitoring areas, protected nature reserves, and detected anomalies.
              </p>
            </div>
            <Link
              to="/areas"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View all areas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 min-h-[360px]">
            <MapView
              center={activeArea?.centroid?.coordinates ? [activeArea.centroid.coordinates[1], activeArea.centroid.coordinates[0]] : [12.50, 75.70]}
              zoom={11}
              areas={areas}
              protectedZones={protectedZones}
              detectedRegions={recentAnalyses?.[0]?.regions || []}
              detectionDate={recentAnalyses?.[0]?.completedAt || recentAnalyses?.[0]?.createdAt}
              height="380px"
            />
          </div>
        </div>

        {/* Right Col: Monitored Areas List */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Configured Areas of Interest
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {areas.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Select an area to inspect baseline satellite imagery and run automated comparison.
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {areas.map((area) => (
              <div
                key={area._id}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 truncate">
                      {area.name}
                    </h3>
                    <StatusBadge status={area.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {area.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>{area.scenesCount || 2} Satellite Scenes</span>
                  <Link
                    to={`/analysis?areaId=${area._id}`}
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 font-semibold"
                  >
                    <span>Analyze</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Change Analyses Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Multi-Temporal Change Analyses
            </h2>
            <p className="text-xs text-slate-500">
              Completed satellite difference analyses with verified quality notes.
            </p>
          </div>
          <Link
            to="/analysis"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Open Comparison Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAnalyses && recentAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Monitoring Area</th>
                  <th className="py-3 px-4">Scene Acquisition Dates</th>
                  <th className="py-3 px-4">Methodology</th>
                  <th className="py-3 px-4">Affected Area</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentAnalyses.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.monitoringArea?.name || 'Monitoring Area'}
                      <div className="text-[10px] font-normal text-slate-600">
                        {item.monitoringArea?.region}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-800">
                        {item.earlierScene?.acquisitionDate ? new Date(item.earlierScene.acquisitionDate).toISOString().slice(0, 10) : '2023-03-15'}
                        {' → '}
                        {item.laterScene?.acquisitionDate ? new Date(item.laterScene.acquisitionDate).toISOString().slice(0, 10) : '2024-03-20'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.method} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {item.changedAreaHectares ? `${item.changedAreaHectares} ha` : '—'}
                      </span>
                      <span className="text-[10px] text-slate-600 ml-1">
                        ({item.regionsCount || 0} regions)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/analysis?analysisId=${item._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-600">
            No change analyses executed yet. Launch a new analysis to begin.
          </div>
        )}
      </div>
    </div>
  );
}
