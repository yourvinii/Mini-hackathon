import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock
} from 'lucide-react';

// Fix Leaflet's default marker icon issue in bundlers
const createCustomIcon = (color = '#0f766e') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

/**
 * Validates GeoJSON geometry structure to ensure safe rendering in Leaflet.
 * Requirement: "Show detected regions only when their geometry is valid."
 */
export const isValidGeometry = (geometry) => {
  if (!geometry || typeof geometry !== 'object') return false;
  if (geometry.type !== 'Polygon') return false;
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return false;

  const outerRing = geometry.coordinates[0];
  if (!Array.isArray(outerRing) || outerRing.length < 3) return false;

  for (let i = 0; i < outerRing.length; i++) {
    const pt = outerRing[i];
    if (!Array.isArray(pt) || pt.length < 2) return false;
    const [lng, lat] = pt;
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  }
  return true;
};

/**
 * Extracts Leaflet [[southLat, westLng], [northLat, eastLng]] bounds
 * from a GeoJSON Polygon or coordinate pairs.
 */
export const extractBoundsFromGeoJson = (geoJson) => {
  if (!geoJson) return null;

  // If already an array of two coordinate pairs [[lat, lng], [lat, lng]]
  if (
    Array.isArray(geoJson) &&
    geoJson.length === 2 &&
    Array.isArray(geoJson[0]) &&
    typeof geoJson[0][0] === 'number'
  ) {
    return geoJson;
  }

  const coordinates = geoJson.coordinates || (Array.isArray(geoJson) ? geoJson : null);
  if (!coordinates) return null;

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let hasPoints = false;

  const traverse = (item) => {
    if (!Array.isArray(item)) return;
    if (typeof item[0] === 'number' && typeof item[1] === 'number') {
      const [lng, lat] = item;
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        hasPoints = true;
      }
    } else {
      item.forEach(traverse);
    }
  };

  traverse(coordinates);

  if (!hasPoints || minLat >= maxLat || minLng >= maxLng) {
    return null;
  }

  // Leaflet expects [[southWestLat, southWestLng], [northEastLat, northEastLng]]
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
};

/**
 * Convert GeoJSON polygon coordinates [lng, lat] to Leaflet [lat, lng].
 */
export const convertGeoJsonToLeaflet = (coords) => {
  if (!coords || !Array.isArray(coords)) return [];
  return coords.map((ring) => {
    if (Array.isArray(ring[0])) {
      return ring.map((pt) => [pt[1], pt[0]]);
    }
    return [ring[1], ring[0]];
  });
};

/**
 * Helper component to smoothly center/fit bounds when props change
 * and keep the Leaflet canvas properly invalidated on resize.
 */
function MapController({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size to prevent gray blank tiles on container resize or tab switch
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Safe fallback
      }
    }, 150);

    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      } catch {
        if (center) map.setView(center, zoom || 11);
      }
    } else if (center) {
      map.setView(center, zoom || 11);
    }

    return () => clearTimeout(timer);
  }, [map, center, zoom, bounds]);

  // Window resize handler to maintain responsiveness
  useEffect(() => {
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {
        // Safe fallback
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return null;
}

/**
 * MapView Component
 *
 * Implements Chunk 4: Map Visualization and Protected Zones
 * - Displays monitoring areas on an interactive React Leaflet map
 * - Renders protected-zone boundaries with category colors and a clear legend
 * - Shows detected regions ONLY when their geometry is valid
 * - Highlights supported intersections between detected regions and protected zones
 * - Provides rich popups with finding category, area, date, and review status
 * - Keeps map responsive and ensures Leaflet CSS and container height are configured correctly
 */
export default function MapView({
  center = [12.50, 75.70],
  zoom = 11,
  bounds,
  areas = [],
  protectedZones = [],
  detectedRegions = [],
  detectionDate = null,
  // Map Image Overlay Props (Chunk 2 & 3)
  imageOverlayUrl,
  imageOverlayBounds,
  imageOverlayOpacity = 0.75,
  imageOverlayName = 'Satellite / Mask Overlay',
  showImageOverlay = true,
  onToggleImageOverlay,
  height = '420px',
  showLegend = true,
  className = ''
}) {
  const [internalOverlayActive, setInternalOverlayActive] = useState(showImageOverlay);
  const [internalOverlayOpacity, setInternalOverlayOpacity] = useState(imageOverlayOpacity);
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const activeOverlay = onToggleImageOverlay !== undefined ? showImageOverlay : internalOverlayActive;
  const activeOpacity = internalOverlayOpacity;

  // Derive valid Leaflet bounds for ImageOverlay if available
  const validImageBounds = extractBoundsFromGeoJson(imageOverlayBounds);

  const handleToggleOverlay = () => {
    if (onToggleImageOverlay) {
      onToggleImageOverlay(!activeOverlay);
    } else {
      setInternalOverlayActive(!activeOverlay);
    }
  };

  // Helper to format finding category for user display
  const formatCategory = (cat) => {
    switch (cat) {
      case 'VEGETATION_LOSS':
        return 'Vegetation Clearing';
      case 'NEW_CONSTRUCTION':
        return 'New Built-up Expansion';
      case 'WATER_CHANGE':
        return 'Water Body Change';
      default:
        return (cat || 'Unclassified Anomaly').replace(/_/g, ' ');
    }
  };

  // Helper to style review status badges in popups
  const getReviewStatusPill = (status = 'PENDING') => {
    switch (status) {
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          label: 'Verified Encroachment'
        };
      case 'DISMISSED':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          label: 'Dismissed / Benign'
        };
      default:
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          label: 'Pending Field Review'
        };
    }
  };

  // Filter detected regions to only those with valid GeoJSON geometry
  const validDetectedRegions = detectedRegions.filter((region) => isValidGeometry(region.geometry));

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs ${className}`}
      style={{ height, minHeight: height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={center} zoom={zoom} bounds={bounds || validImageBounds} />

        {/* Georeferenced Satellite / Change Mask Overlay */}
        {activeOverlay && validImageBounds && imageOverlayUrl && (
          <ImageOverlay
            url={imageOverlayUrl}
            bounds={validImageBounds}
            opacity={activeOpacity}
            zIndex={350}
          />
        )}

        {/* 1. Monitoring Areas (Teal Dashed Outline) */}
        {areas.map((area) => {
          if (!isValidGeometry(area.boundary)) return null;
          const leafletPositions = convertGeoJsonToLeaflet(area.boundary.coordinates);
          return (
            <Polygon
              key={area._id || area.name}
              positions={leafletPositions}
              pathOptions={{
                color: '#0f766e',
                weight: 2,
                fillColor: '#14b8a6',
                fillOpacity: 0.08,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1.5 min-w-[190px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-900 text-xs">{area.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                      AOI BUFFER
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-700">Region:</span> {area.region || 'Standard Sector'}
                  </div>
                  {area.description && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2">
                      {area.description}
                    </p>
                  )}
                  <div className="pt-1 text-[10px] text-teal-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                    <span>Monitored perimeter under active surveillance</span>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 2. Protected Zones (Forest Green / Wildlife Amber / Wetland Azure) */}
        {protectedZones.map((zone) => {
          if (!isValidGeometry(zone.boundary)) return null;
          const leafletPositions = convertGeoJsonToLeaflet(zone.boundary.coordinates);
          const isWildlife = zone.category === 'WILDLIFE';
          const isWaterbody = zone.category === 'WATERBODY';

          // Color palette per reserve category
          let strokeColor = '#15803d'; // Forest
          let fillColor = '#22c55e';
          if (isWildlife) {
            strokeColor = '#b45309';
            fillColor = '#f59e0b';
          } else if (isWaterbody) {
            strokeColor = '#0284c7';
            fillColor = '#38bdf8';
          }

          // Count intersecting anomalies if any
          const intersectingCount = validDetectedRegions.filter((r) => r.protectedZoneOverlap).length;

          return (
            <Polygon
              key={zone._id || zone.name}
              positions={leafletPositions}
              pathOptions={{
                color: strokeColor,
                weight: 2.5,
                fillColor: fillColor,
                fillOpacity: 0.22
              }}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1.5 min-w-[210px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-900 text-xs">{zone.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {zone.category}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    <span className="font-semibold text-slate-700">Source:</span> {zone.source === 'OFFICIAL' ? 'Gazetted Legal Reserve' : 'Ecological Layer'}
                  </div>
                  {zone.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {zone.description}
                    </p>
                  )}
                  <div className="p-1.5 rounded bg-emerald-50 text-emerald-900 text-[10px] font-medium flex items-center gap-1.5 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Strict Zero-Disturbance Buffer Enforced</span>
                  </div>
                  {intersectingCount > 0 && (
                    <div className="p-1.5 rounded bg-rose-50 text-rose-800 text-[10px] font-semibold flex items-center gap-1 border border-rose-200">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>{intersectingCount} detected anomaly intersects reserve perimeter</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 3. Detected Regions (Validated Geometry Only + Highlighted Protected Zone Intersections) */}
        {validDetectedRegions.map((region) => {
          const leafletPositions = convertGeoJsonToLeaflet(region.geometry.coordinates);
          const isVegLoss = region.category === 'VEGETATION_LOSS';
          const isConstruction = region.category === 'NEW_CONSTRUCTION';
          const isWaterChange = region.category === 'WATER_CHANGE';
          const isIntersecting = Boolean(region.protectedZoneOverlap);

          // Requirements: "Highlight supported intersections between detected regions and protected zones"
          // Intersection styling: high-visibility dashed rose outline + glowing warning fill
          let color = isVegLoss ? '#dc2626' : isConstruction ? '#ea580c' : isWaterChange ? '#0284c7' : '#7c3aed';
          let fillColor = color;
          let weight = 2;
          let fillOpacity = 0.35;
          let dashArray = null;

          if (isIntersecting) {
            color = '#e11d48'; // Rose-600
            fillColor = '#f43f5e';
            weight = 3.5;
            fillOpacity = 0.52;
            dashArray = '5, 5'; // Distinct dashed border highlighting intersection
          }

          // Format Date for Popup
          const dateToDisplay =
            region.detectionDate ||
            region.date ||
            detectionDate ||
            'Multi-temporal scene interval';

          const formattedDate =
            dateToDisplay && !isNaN(new Date(dateToDisplay).getTime())
              ? new Date(dateToDisplay).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : dateToDisplay;

          const statusPill = getReviewStatusPill(region.reviewStatus);

          return (
            <Polygon
              key={region.regionId}
              positions={leafletPositions}
              pathOptions={{
                color,
                weight,
                fillColor,
                fillOpacity,
                dashArray
              }}
            >
              {/* Requirement: "Provide popups with the finding category, area, date and review status" */}
              <Popup>
                <div className="p-1 text-xs space-y-2 min-w-[220px]">
                  {/* Finding Category Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                        isIntersecting
                          ? 'bg-rose-600'
                          : isVegLoss
                          ? 'bg-red-600'
                          : isConstruction
                          ? 'bg-orange-600'
                          : 'bg-teal-600'
                      }`}
                    >
                      {formatCategory(region.category)}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      {region.regionId}
                    </span>
                  </div>

                  {/* Finding Metrics: Area, Date, Confidence */}
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Changed Area:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {(region.areaSqMeters / 10000).toFixed(2)} ha
                        <span className="text-slate-500 font-normal font-sans ml-1">
                          ({region.areaSqMeters?.toLocaleString()} m²)
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Detection Date:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Confidence:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {Math.round((region.confidence || 0.85) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Review Status Pill */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Review Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPill.bg}`}
                    >
                      {statusPill.label}
                    </span>
                  </div>

                  {/* Protected Zone Overlap Alert / Notice */}
                  {isIntersecting ? (
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-semibold flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold text-rose-800">
                          ⚠️ Protected Reserve Overlap!
                        </span>
                        <span className="text-[10px] font-normal text-rose-700 leading-tight block mt-0.5">
                          Intersecting gazetted ecological boundary. Priority field inspection mandated.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Located outside gazetted protected reserve core</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 4. Area Centroid Markers */}
        {areas.map((area) => {
          if (!area.centroid?.coordinates) return null;
          const [lng, lat] = area.centroid.coordinates;
          return (
            <Marker
              key={`marker-${area._id || area.name}`}
              position={[lat, lng]}
              icon={createCustomIcon('#0f766e')}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-slate-900">{area.name}</div>
                  <div className="text-slate-500">{area.region || 'Surveillance Center'}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Overlay Control Badge */}
      {imageOverlayUrl && validImageBounds && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200 shadow-md flex flex-wrap items-center gap-2.5 text-xs">
          <button
            type="button"
            id="btn-toggle-map-overlay"
            onClick={handleToggleOverlay}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-semibold transition-colors ${
              activeOverlay
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {activeOverlay ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Overlay: {activeOverlay ? 'Active' : 'Hidden'}</span>
          </button>

          {activeOverlay && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pl-2 border-l border-slate-200">
              <span>Opacity</span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={activeOpacity}
                onChange={(e) => setInternalOverlayOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="font-mono text-[10px] w-6">{Math.round(activeOpacity * 100)}%</span>
            </div>
          )}

          <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
            Bounds: [{validImageBounds[0][0].toFixed(2)}, {validImageBounds[0][1].toFixed(2)}] → [
            {validImageBounds[1][0].toFixed(2)}, {validImageBounds[1][1].toFixed(2)}]
          </span>
        </div>
      )}

      {/* Clear & Responsive Floating Map Legend */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-xs max-w-[240px] transition-all">
          <div
            onClick={() => setLegendCollapsed(!legendCollapsed)}
            className="flex items-center justify-between p-2.5 cursor-pointer font-bold text-slate-800 text-[11px] uppercase tracking-wider hover:bg-slate-50 rounded-t-lg"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Map Legend</span>
            </span>
            {legendCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          {!legendCollapsed && (
            <div className="p-3 pt-1 border-t border-slate-100 space-y-2">
              {activeOverlay && validImageBounds && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-indigo-500 bg-indigo-500/40 shrink-0" />
                  <span className="text-slate-700 font-medium truncate">{imageOverlayName}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-teal-600 bg-teal-500/20 shrink-0" />
                <span className="text-slate-700">Monitored Area Buffer</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-emerald-600 bg-emerald-500/40 shrink-0" />
                <span className="text-slate-700">Protected Forest Reserve</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-amber-600 bg-amber-500/40 shrink-0" />
                <span className="text-slate-700">Wildlife Sanctuary / Wetland</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-rose-600 bg-rose-500/40 shrink-0" />
                <span className="text-slate-700">Vegetation Loss Anomaly</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-orange-600 bg-orange-500/40 shrink-0" />
                <span className="text-slate-700">New Built-up Expansion</span>
              </div>

              {/* Requirement: "Highlight supported intersections between detected regions and protected zones" */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-rose-600 bg-rose-600/50 shrink-0" />
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <span>⚠️ Reserve Overlap Highlight</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
