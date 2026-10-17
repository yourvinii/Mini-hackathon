import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Trees,
  Waves,
  AlertTriangle,
  Info,
  MapPin,
  CheckCircle2,
  Layers,
  Compass,
  Eye,
  Sliders
} from 'lucide-react';
import { getProtectedZones, getAnalyses, getAreas } from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import MapView, { extractBoundsFromGeoJson, isValidGeometry } from '../components/MapView';

export default function ProtectedZones() {
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [viewAllReserves, setViewAllReserves] = useState(false);
  const [showDetectedAnomalies, setShowDetectedAnomalies] = useState(true);

  const fetchZonesAndData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [zonesRes, areasRes, analysesRes] = await Promise.all([
        getProtectedZones(),
        getAreas(),
        getAnalyses()
      ]);

      const loadedZones = zonesRes.protectedZones || [];
      setZones(loadedZones);
      setAreas(areasRes.areas || []);
      setAnalyses(analysesRes.analyses || []);

      if (loadedZones.length > 0 && !selectedZone) {
        setSelectedZone(loadedZones[0]);
      }
    } catch (err) {
      console.error('Failed to load protected zones and spatial layers:', err);
      setError(err.message || 'Unable to retrieve protected ecological reserves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZonesAndData();
  }, []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'FOREST':
        return Trees;
      case 'WATERBODY':
        return Waves;
      default:
        return ShieldCheck;
    }
  };

  // Extract all detected regions across analyses with dates and valid geometry
  const allDetectedRegions = useMemo(() => {
    const list = [];
    analyses.forEach((analysis) => {
      if (Array.isArray(analysis.regions)) {
        analysis.regions.forEach((region) => {
          if (isValidGeometry(region.geometry)) {
            list.push({
              ...region,
              date:
                region.date ||
                region.detectionDate ||
                analysis.laterScene?.acquisitionDate ||
                analysis.completedAt ||
                analysis.createdAt,
              areaName: analysis.monitoringArea?.name
            });
          }
        });
      }
    });
    return list;
  }, [analyses]);

  // Filter detected regions relevant to protected zones
  const displayedRegions = useMemo(() => {
    if (!showDetectedAnomalies) return [];
    // Show all detected regions or focus on those with protectedZoneOverlap
    return allDetectedRegions;
  }, [allDetectedRegions, showDetectedAnomalies]);

  // Count overlapping anomalies for a specific zone
  const getZoneOverlapCount = (zone) => {
    if (!zone) return 0;
    // Regions flagged with protectedZoneOverlap
    return allDetectedRegions.filter((r) => r.protectedZoneOverlap).length;
  };

  // Derive bounds for the selected zone or all zones
  const mapBounds = useMemo(() => {
    if (viewAllReserves) {
      // Fit to all zones if coordinates are available
      return null;
    }
    if (selectedZone?.boundary) {
      return extractBoundsFromGeoJson(selectedZone.boundary);
    }
    return null;
  }, [selectedZone, viewAllReserves]);

  if (loading) return <LoadingState message="Loading protected ecological boundaries and GIS layers..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchZonesAndData} />;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Protected Zones & Ecological Reserves
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Chunk 4: Map Visualization
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Designated wildlife sanctuaries, gazetted forest reserves, and Ramsar wetland boundaries with strict zero-disturbance covenants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{zones.length} Active Reserves Enforced</span>
          </span>
        </div>
      </div>

      {/* Advisory Guidance Box */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-emerald-900 block mb-0.5">
            Buffer Zone Policy & Verification Principle:
          </span>
          Satellite change detection flags anomalies that intersect or border these protected polygon boundaries. Intersecting regions are visually highlighted with high-contrast borders and warning alerts, indicating locations requiring authorized ground inspection.
        </div>
      </div>

      {/* Main Grid: Zones List & Map View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: List of Protected Zones */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gazetted Ecological Reserves ({zones.length})
            </h2>
            <span className="text-[11px] text-slate-500">Select reserve to inspect bounds</span>
          </div>

          {zones.map((zone) => {
            const isSelected = selectedZone?._id === zone._id;
            const Icon = getCategoryIcon(zone.category);
            const overlapCount = getZoneOverlapCount(zone);

            return (
              <div
                key={zone._id}
                onClick={() => {
                  setSelectedZone(zone);
                  setViewAllReserves(false);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        zone.category === 'FOREST'
                          ? 'bg-emerald-100/80 text-emerald-800'
                          : zone.category === 'WILDLIFE'
                          ? 'bg-amber-100/80 text-amber-800'
                          : 'bg-sky-100/80 text-sky-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {zone.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {zone.source === 'OFFICIAL' ? 'Official Gazette Layer' : 'Ecological Survey Model'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={zone.category} />
                </div>

                <p className="mt-2.5 text-xs text-slate-600 line-clamp-2">
                  {zone.description}
                </p>

                {/* Overlap Warning Indicator if present */}
                {overlapCount > 0 && (
                  <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{overlapCount} Anomaly Intersections Detected</span>
                    </span>
                    <span className="font-bold text-[10px] bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded">
                      High Priority
                    </span>
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">WGS84 Polygon Boundary</span>
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Surveillance
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 7 Cols: Protected Zones Map */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>
                  {viewAllReserves
                    ? 'All Ecological Reserves'
                    : selectedZone
                    ? selectedZone.name
                    : 'Protected Reserves Map'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {viewAllReserves
                  ? `Displaying all ${zones.length} active gazetted reserves`
                  : `Category: ${selectedZone?.category || 'FOREST'} • Strict Zero-Disturbance Buffer`}
              </p>
            </div>

            {/* Map Controls */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                id="btn-toggle-view-reserves"
                onClick={() => setViewAllReserves(!viewAllReserves)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                  viewAllReserves
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {viewAllReserves ? 'Show Selected Only' : 'View All Reserves'}
              </button>

              <button
                type="button"
                id="btn-toggle-anomalies"
                onClick={() => setShowDetectedAnomalies(!showDetectedAnomalies)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                  showDetectedAnomalies
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{showDetectedAnomalies ? 'Anomalies Shown' : 'Anomalies Hidden'}</span>
              </button>
            </div>
          </div>

          {/* Interactive React Leaflet Map */}
          <div className="flex-1 min-h-[480px]">
            <MapView
              center={
                selectedZone?.name?.includes('Pulicat')
                  ? [13.55, 80.20]
                  : [12.50, 75.70]
              }
              zoom={11}
              bounds={mapBounds}
              areas={areas}
              protectedZones={viewAllReserves ? zones : selectedZone ? [selectedZone] : zones}
              detectedRegions={displayedRegions}
              height="480px"
              showLegend={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
