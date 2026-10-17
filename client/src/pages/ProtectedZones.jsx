import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Trees,
  Waves,
  AlertOctagon,
  Info,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { getProtectedZones } from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import MapView from '../components/MapView';

export default function ProtectedZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProtectedZones();
      const loaded = res.protectedZones || [];
      setZones(loaded);
      if (loaded.length > 0 && !selectedZone) {
        setSelectedZone(loaded[0]);
      }
    } catch (err) {
      console.error('Failed to load protected zones:', err);
      setError(err.message || 'Unable to retrieve protected ecological reserves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  if (loading) return <LoadingState message="Loading protected ecological boundaries and GIS layers..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchZones} />;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'FOREST': return Trees;
      case 'WATERBODY': return Waves;
      default: return ShieldCheck;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Protected Zones & Ecological Reserves
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {zones.length} Active Reserves
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Designated wildlife sanctuaries, gazetted forest reserves, and Ramsar wetland boundaries with strict zero-disturbance covenants.
          </p>
        </div>
      </div>

      {/* Advisory Guidance Box */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-emerald-900 block mb-0.5">
            Buffer Zone Policy & Verification Principle:
          </span>
          Satellite change detection flags anomalies that intersect or border these protected polygon boundaries. Overlap indicates a location requiring authorized field inspection, not definitive proof of illegal activity.
        </div>
      </div>

      {/* Main Grid: Zones List & Map View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: List of Protected Zones */}
        <div className="lg:col-span-5 space-y-3">
          {zones.map((zone) => {
            const isSelected = selectedZone?._id === zone._id;
            const Icon = getCategoryIcon(zone.category);

            return (
              <div
                key={zone._id}
                onClick={() => setSelectedZone(zone)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900">
                        {zone.name}
                      </h2>
                      <span className="text-[11px] text-slate-500">
                        {zone.source} Source Layer
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={zone.category} />
                </div>

                <p className="mt-2.5 text-xs text-slate-600 line-clamp-2">
                  {zone.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">GeoJSON Boundary Active</span>
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enforced Boundary
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 7 Cols: Protected Zones Map */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {selectedZone ? selectedZone.name : 'Protected Reserves Map'}
              </h2>
              <p className="text-xs text-slate-500">
                Category: {selectedZone?.category || 'FOREST'} • Zero Development Buffer
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              WGS84 EPSG:4326
            </span>
          </div>

          <div className="flex-1 min-h-[460px]">
            <MapView
              center={selectedZone?.name?.includes('Pulicat') ? [13.55, 80.20] : [12.50, 75.70]}
              zoom={11}
              protectedZones={selectedZone ? [selectedZone] : zones}
              height="460px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
