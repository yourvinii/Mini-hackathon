import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Plus,
  Compass,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { getAreas, getProtectedZones, createArea } from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import MapView, { extractBoundsFromGeoJson } from '../components/MapView';

export default function Areas() {
  const [areas, setAreas] = useState([]);
  const [protectedZones, setProtectedZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Quick add area modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    description: '',
    region: '',
    minLng: '75.60',
    minLat: '12.40',
    maxLng: '75.80',
    maxLat: '12.60'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      const [areasRes, zonesRes] = await Promise.all([
        getAreas(),
        getProtectedZones()
      ]);
      const loaded = areasRes.areas || [];
      setAreas(loaded);
      setProtectedZones(zonesRes.protectedZones || []);
      if (loaded.length > 0 && !selectedArea) {
        setSelectedArea(loaded[0]);
      }
    } catch (err) {
      console.error('Failed to load areas:', err);
      setError(err.message || 'Unable to retrieve monitoring areas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const minLng = parseFloat(addForm.minLng);
      const minLat = parseFloat(addForm.minLat);
      const maxLng = parseFloat(addForm.maxLng);
      const maxLat = parseFloat(addForm.maxLat);

      const boundary = {
        type: 'Polygon',
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat]
          ]
        ]
      };

      const centroid = {
        type: 'Point',
        coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
      };

      await createArea({
        name: addForm.name,
        description: addForm.description,
        region: addForm.region || 'General Buffer',
        boundary,
        centroid
      });

      setShowAddModal(false);
      setAddForm({
        name: '',
        description: '',
        region: '',
        minLng: '75.60',
        minLat: '12.40',
        maxLng: '75.80',
        maxLat: '12.60'
      });
      await fetchAreas();
    } catch (err) {
      alert(err.message || 'Failed to create monitoring area');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading configured monitoring areas and spatial boundaries..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAreas} />;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Monitoring Areas of Interest (AOIs)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {areas.length} Configured
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Geographic perimeters monitored periodically for land disturbance, vegetation clearing, and ecological encroachment.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-area"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New AOI</span>
        </button>
      </div>

      {/* Main Grid: Areas List & Spatial Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: List of Areas */}
        <div className="lg:col-span-5 space-y-3">
          {areas.map((area) => {
            const isSelected = selectedArea?._id === area._id;
            return (
              <div
                key={area._id}
                onClick={() => setSelectedArea(area)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      {area.name}
                    </h2>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {area.region}
                    </span>
                  </div>
                  <StatusBadge status={area.status} />
                </div>

                <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                  {area.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{area.scenesCount || 2} Satellite Scenes</span>
                  </div>

                  <Link
                    to={`/analysis?areaId=${area._id}`}
                    id={`btn-open-analysis-${area._id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
                  >
                    <span>Launch Analysis</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 7 Cols: Map View */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {selectedArea ? selectedArea.name : 'Area Geographic Extent'}
              </h2>
              <p className="text-xs text-slate-500">
                Centroid: {selectedArea?.centroid?.coordinates ? `${selectedArea.centroid.coordinates[1].toFixed(4)}° N, ${selectedArea.centroid.coordinates[0].toFixed(4)}° E` : '—'}
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              EPSG:4326 GeoJSON
            </span>
          </div>

          <div className="flex-1 min-h-[460px]">
            <MapView
              center={selectedArea?.centroid?.coordinates ? [selectedArea.centroid.coordinates[1], selectedArea.centroid.coordinates[0]] : [12.50, 75.70]}
              zoom={11}
              bounds={selectedArea?.boundary ? extractBoundsFromGeoJson(selectedArea.boundary) : null}
              areas={selectedArea ? [selectedArea] : areas}
              protectedZones={protectedZones}
              height="460px"
            />
          </div>
        </div>
      </div>

      {/* Register Area Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Register New Monitoring AOI
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eastern Ghats Forest Corridor - Sector 2"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Geographic Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tamil Nadu Buffer"
                  value={addForm.region}
                  onChange={(e) => setAddForm({ ...addForm, region: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Ecological characteristics and monitoring reason..."
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Min Longitude / Latitude
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={addForm.minLng}
                      onChange={(e) => setAddForm({ ...addForm, minLng: e.target.value })}
                      className="w-1/2 text-xs rounded border border-slate-300 px-2 py-1 font-mono text-slate-800"
                    />
                    <input
                      type="text"
                      value={addForm.minLat}
                      onChange={(e) => setAddForm({ ...addForm, minLat: e.target.value })}
                      className="w-1/2 text-xs rounded border border-slate-300 px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Max Longitude / Latitude
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={addForm.maxLng}
                      onChange={(e) => setAddForm({ ...addForm, maxLng: e.target.value })}
                      className="w-1/2 text-xs rounded border border-slate-300 px-2 py-1 font-mono text-slate-800"
                    />
                    <input
                      type="text"
                      value={addForm.maxLat}
                      onChange={(e) => setAddForm({ ...addForm, maxLat: e.target.value })}
                      className="w-1/2 text-xs rounded border border-slate-300 px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Registering...' : 'Save Monitoring AOI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
