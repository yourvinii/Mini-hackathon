import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, EyeOff } from 'lucide-react';

// Fix Leaflet's default marker icon issue in bundlers
const createCustomIcon = (color = '#15803d') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
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
 * Extracts Leaflet [[southLat, westLng], [northLat, eastLng]] bounds
 * from a GeoJSON Polygon or bounds coordinates.
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

  // Leaflet ImageOverlay expects [[southWestLat, southWestLng], [northEastLat, northEastLng]]
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
};

// Helper component to smoothly center/fit bounds when props change
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
      } catch {
        if (center) map.setView(center, zoom || 11);
      }
    } else if (center) {
      map.setView(center, zoom || 11);
    }
  }, [map, center, zoom, bounds]);

  return null;
}

export default function MapView({
  center = [12.50, 75.70],
  zoom = 11,
  bounds,
  areas = [],
  protectedZones = [],
  detectedRegions = [],
  // Chunk 2: Map Image Overlay Props
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

  const activeOverlay = onToggleImageOverlay !== undefined ? showImageOverlay : internalOverlayActive;
  const activeOpacity = internalOverlayOpacity;

  // Convert GeoJSON polygon to Leaflet lat/lng
  const convertGeoJsonToLeaflet = (coords) => {
    if (!coords || !Array.isArray(coords)) return [];
    return coords.map((ring) => {
      if (Array.isArray(ring[0])) {
        return ring.map((pt) => [pt[1], pt[0]]);
      }
      return [ring[1], ring[0]];
    });
  };

  // Derive valid Leaflet bounds for ImageOverlay if available
  const validImageBounds = extractBoundsFromGeoJson(imageOverlayBounds);

  const handleToggleOverlay = () => {
    if (onToggleImageOverlay) {
      onToggleImageOverlay(!activeOverlay);
    } else {
      setInternalOverlayActive(!activeOverlay);
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs ${className}`}
      style={{ height }}
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

        {/* CHUNK 2: Georeferenced Image / Change Mask Overlay if valid bounds available */}
        {activeOverlay && validImageBounds && imageOverlayUrl && (
          <ImageOverlay
            url={imageOverlayUrl}
            bounds={validImageBounds}
            opacity={activeOpacity}
            zIndex={350}
          />
        )}

        {/* 1. Monitoring Areas (Dark Green Outline) */}
        {areas.map((area) => {
          if (!area.boundary?.coordinates) return null;
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
                dashArray: '4, 4'
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold text-slate-800">{area.name}</div>
                  <div className="text-slate-600">{area.region}</div>
                  <div className="mt-1 text-[11px] font-medium text-emerald-800">
                    Monitored Area Buffer
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 2. Protected Zones (Forest Green / Wildlife Blue) */}
        {protectedZones.map((zone) => {
          if (!zone.boundary?.coordinates) return null;
          const leafletPositions = convertGeoJsonToLeaflet(zone.boundary.coordinates);
          const isForest = zone.category === 'FOREST';
          return (
            <Polygon
              key={zone._id || zone.name}
              positions={leafletPositions}
              pathOptions={{
                color: isForest ? '#15803d' : '#0284c7',
                weight: 2,
                fillColor: isForest ? '#22c55e' : '#38bdf8',
                fillOpacity: 0.25
              }}
            >
              <Popup>
                <div className="text-xs">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                    PROTECTED ZONE
                  </span>
                  <div className="font-bold text-slate-800">{zone.name}</div>
                  <div className="text-slate-600 mt-0.5">
                    {zone.category} • {zone.description}
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 3. Detected Regions (Vegetation Loss = Red, Construction = Orange) */}
        {detectedRegions.map((region) => {
          if (!region.geometry?.coordinates) return null;
          const leafletPositions = convertGeoJsonToLeaflet(region.geometry.coordinates);
          const isVegLoss = region.category === 'VEGETATION_LOSS';
          const color = isVegLoss ? '#dc2626' : '#ea580c';

          return (
            <Polygon
              key={region.regionId}
              positions={leafletPositions}
              pathOptions={{
                color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.4
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                      isVegLoss ? 'bg-rose-600' : 'bg-orange-600'
                    }`}
                  >
                    ANOMALY: {region.category?.replace('_', ' ')}
                  </span>
                  <div className="font-bold text-slate-800">Region ID: {region.regionId}</div>
                  <div>
                    Area: {(region.areaSqMeters / 10000).toFixed(2)} ha (
                    {region.areaSqMeters?.toLocaleString()} m²)
                  </div>
                  <div>Confidence: {Math.round((region.confidence || 0.85) * 100)}%</div>
                  {region.protectedZoneOverlap && (
                    <div className="text-rose-600 font-semibold text-[11px] pt-1">
                      ⚠️ Overlaps Protected Zone Boundary
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Area Centroid Markers */}
        {areas.map((area) => {
          if (!area.centroid?.coordinates) return null;
          const [lng, lat] = area.centroid.coordinates;
          return (
            <Marker
              key={`marker-${area._id}`}
              position={[lat, lng]}
              icon={createCustomIcon('#0f766e')}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold text-slate-800">{area.name}</div>
                  <div className="text-slate-500">{area.region}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Overlay Control Badge (Chunk 2) */}
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
            <span>Map Overlay: {activeOverlay ? 'Active' : 'Hidden'}</span>
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

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
            Bounds: [{validImageBounds[0][0].toFixed(2)}, {validImageBounds[0][1].toFixed(2)}] to [
            {validImageBounds[1][0].toFixed(2)}, {validImageBounds[1][1].toFixed(2)}]
          </span>
        </div>
      )}

      {/* Floating Legend */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 max-w-[220px]">
          <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
            Map Legend
          </div>
          {activeOverlay && validImageBounds && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border border-indigo-500 bg-indigo-500/40" />
              <span className="text-slate-700 font-medium">{imageOverlayName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-teal-600 bg-teal-500/20" />
            <span className="text-slate-700">Monitored Area Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-emerald-600 bg-emerald-500/40" />
            <span className="text-slate-700">Protected Nature Reserve</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-rose-600 bg-rose-500/40" />
            <span className="text-slate-700">Vegetation Loss Anomaly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-orange-600 bg-orange-500/40" />
            <span className="text-slate-700">New Built-up Expansion</span>
          </div>
        </div>
      )}
    </div>
  );
}
