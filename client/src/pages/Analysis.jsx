import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  ClipboardPlus,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Sliders,
  Satellite,
  Compass,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Check,
  Zap,
  Activity
} from 'lucide-react';
import {
  getAreas,
  getAreaScenes,
  getAnalyses,
  getAnalysis,
  createAnalysis,
  getProtectedZones,
  createInspection
} from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import MapView, { extractBoundsFromGeoJson } from '../components/MapView';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [scenes, setScenes] = useState([]);
  const [earlierSceneId, setEarlierSceneId] = useState('');
  const [laterSceneId, setLaterSceneId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [protectedZones, setProtectedZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);

  // Chunk 2 & 3: View & Pipeline States
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(0.85);
  const [activeTab, setActiveTab] = useState('slider'); // 'slider' | 'map' | 'scenes'
  const [showQualityDetails, setShowQualityDetails] = useState(true);

  // Chunk 3: Pipeline Configuration
  const [pipelineEngine, setPipelineEngine] = useState('PIXEL_DIFFERENCE'); // 'PIXEL_DIFFERENCE' | 'PREPARED_RESULT'
  const [sensitivityThreshold, setSensitivityThreshold] = useState(28);

  // Map Overlay controls
  const [showMapOverlay, setShowMapOverlay] = useState(true);
  const [mapOverlayType, setMapOverlayType] = useState('mask'); // 'mask' | 'scene'
  const [mapOverlayOpacity, setMapOverlayOpacity] = useState(0.75);

  // Inspection Task Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH',
    assignedTo: 'Officer P. Deshmukh'
  });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState('');

  const loadAreaScenesAndAnalysis = useCallback(async (areaId, existingAnalyses = []) => {
    try {
      // 1. Fetch scenes for this specific monitoring area
      const scenesRes = await getAreaScenes(areaId);
      const loadedScenes = scenesRes.scenes || [];
      setScenes(loadedScenes);

      let initialEarlierId = '';
      let initialLaterId = '';

      if (loadedScenes.length >= 2) {
        initialEarlierId = loadedScenes[0]._id;
        initialLaterId = loadedScenes[loadedScenes.length - 1]._id;
      } else if (loadedScenes.length === 1) {
        initialEarlierId = loadedScenes[0]._id;
      }

      setEarlierSceneId(initialEarlierId);
      setLaterSceneId(initialLaterId);

      // 2. Find matching analysis for this area
      const matchingAnalysis = existingAnalyses.find(
        (a) => (a.monitoringArea?._id || a.monitoringArea) === areaId
      );

      if (matchingAnalysis) {
        const fullAnalysisRes = await getAnalysis(matchingAnalysis._id);
        setAnalysis(fullAnalysisRes.analysis);
      } else {
        const analysesForArea = await getAnalyses({ areaId });
        if (analysesForArea.analyses?.length > 0) {
          const fullAnalysisRes = await getAnalysis(analysesForArea.analyses[0]._id);
          setAnalysis(fullAnalysisRes.analysis);
        } else {
          setAnalysis(null);
        }
      }
    } catch (err) {
      console.error('Failed to load area scenes/analysis:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const [areasRes, zonesRes, analysesRes] = await Promise.all([
          getAreas(),
          getProtectedZones(),
          getAnalyses()
        ]);

        const loadedAreas = areasRes.areas || [];
        setAreas(loadedAreas);
        setProtectedZones(zonesRes.protectedZones || []);

        // Pick requested area from URL or first available
        const queryAreaId = searchParams.get('areaId');
        const defaultArea =
          (queryAreaId && loadedAreas.find((a) => a._id === queryAreaId)) || loadedAreas[0];

        if (defaultArea) {
          setSelectedAreaId(defaultArea._id);
          await loadAreaScenesAndAnalysis(defaultArea._id, analysesRes.analyses || []);
        }
      } catch (err) {
        console.error('Error initializing analysis:', err);
        setError(err.message || 'Failed to initialize change analysis.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchParams, loadAreaScenesAndAnalysis]);

  const handleAreaChange = async (e) => {
    const newAreaId = e.target.value;
    setSelectedAreaId(newAreaId);
    setSearchParams({ areaId: newAreaId });
    setLoading(true);
    await loadAreaScenesAndAnalysis(newAreaId);
    setLoading(false);
  };

  // Swap earlier and later scenes
  const handleSwapDates = () => {
    const temp = earlierSceneId;
    setEarlierSceneId(laterSceneId);
    setLaterSceneId(temp);
  };

  // Run or refresh image comparison via Chunk 3 live pipeline or prepared fallback
  const handleRunComparison = async (forceRerun = true) => {
    if (!selectedAreaId || !earlierSceneId || !laterSceneId) return;
    if (earlierSceneId === laterSceneId) {
      alert('T1 Baseline and T2 Comparison must be distinct acquisition dates.');
      return;
    }

    try {
      setComparing(true);
      setError(null);
      const res = await createAnalysis({
        areaId: selectedAreaId,
        earlierSceneId,
        laterSceneId,
        method: pipelineEngine,
        threshold: sensitivityThreshold,
        forceRerun
      });

      if (res.analysis) {
        setAnalysis(res.analysis);
      }
    } catch (err) {
      console.error('Comparison execution failed:', err);
      setError(err.message || 'Failed to execute change detection pipeline.');
    } finally {
      setComparing(false);
    }
  };

  const handleOpenTaskModal = (region) => {
    setSelectedRegion(region);
    setTaskForm({
      title: `Field Inspection: ${region.category.replace('_', ' ')} (${region.regionId})`,
      description: `Spectral anomaly detected ${(region.areaSqMeters / 10000).toFixed(
        2
      )} ha area. Overlaps protected reserve: ${
        region.protectedZoneOverlap ? 'YES' : 'NO'
      }. On-site boundary verification requested.`,
      priority: region.protectedZoneOverlap ? 'HIGH' : 'MEDIUM',
      assignedTo: 'Officer P. Deshmukh'
    });
    setTaskSuccessMessage('');
    setInspectModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!analysis || !selectedRegion) return;

    try {
      setTaskSubmitting(true);
      await createInspection({
        analysisId: analysis._id,
        regionId: selectedRegion.regionId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo
      });

      setTaskSuccessMessage('Inspection task successfully dispatched and saved to database!');
      setTimeout(() => {
        setInspectModalOpen(false);
        setTaskSuccessMessage('');
      }, 1800);
    } catch (err) {
      alert(err.message || 'Failed to create inspection task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const currentArea = areas.find((a) => a._id === selectedAreaId);
  const earlierScene = scenes.find((s) => s._id === earlierSceneId);
  const laterScene = scenes.find((s) => s._id === laterSceneId);

  // Validation checks for scenes
  const hasScenes = scenes.length > 0;
  const isSameSceneSelected = earlierSceneId && laterSceneId && earlierSceneId === laterSceneId;
  const hasEnoughScenes = scenes.length >= 2;

  // Geographic bounds for map overlay
  const geographicBounds = useMemo(() => {
    return earlierScene?.bounds || currentArea?.boundary || null;
  }, [earlierScene, currentArea]);

  const leafletBounds = useMemo(() => {
    return extractBoundsFromGeoJson(geographicBounds);
  }, [geographicBounds]);

  // Elapsed time calculation
  const elapsedDays = useMemo(() => {
    if (!earlierScene?.acquisitionDate || !laterScene?.acquisitionDate) return null;
    const d1 = new Date(earlierScene.acquisitionDate).getTime();
    const d2 = new Date(laterScene.acquisitionDate).getTime();
    const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [earlierScene, laterScene]);

  if (loading) return <LoadingState message="Cataloging satellite passes and multi-temporal scenes..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      {/* 1. Header & Monitoring Area Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Satellite Scene Catalog & Change Analysis
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Chunk 3: Change-Detection Pipeline
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Automated image-difference processing using NumPy, spatial cluster detection, and reserve intersection verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AOI Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="area-selector" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Monitoring Area:
              </label>
              <select
                id="area-selector"
                value={selectedAreaId}
                onChange={handleAreaChange}
                className="text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.scenesCount || 0} scenes)
                  </option>
                ))}
              </select>
            </div>

            {/* View Tab Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                id="tab-view-slider"
                onClick={() => setActiveTab('slider')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'slider'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Comparison Studio
              </button>
              <button
                type="button"
                id="tab-view-map"
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'map'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Geospatial Vector Map
              </button>
              <button
                type="button"
                id="tab-view-catalog"
                onClick={() => setActiveTab('scenes')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'scenes'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Scene Catalog ({scenes.length})
              </button>
            </div>
          </div>
        </div>

        {/* 2. Date Selectors & Comparison Action Controls */}
        {hasScenes ? (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Earlier Date (T1) */}
              <div className="md:col-span-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <label
                  htmlFor="earlier-scene-select"
                  className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between"
                >
                  <span>Earlier Scene (T1 Baseline)</span>
                  {earlierScene && <StatusBadge status={earlierScene.source} />}
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                  <select
                    id="earlier-scene-select"
                    value={earlierSceneId}
                    onChange={(e) => setEarlierSceneId(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {scenes.map((s) => (
                      <option key={`earlier-${s._id}`} value={s._id}>
                        {new Date(s.acquisitionDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}{' '}
                        • {s.source === 'SENTINEL_2' ? 'Sentinel-2' : 'Prepared Demo'} ({s.cloudCoverPercent || 0}% cloud)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Dates & Action Button */}
              <div className="md:col-span-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  id="btn-swap-dates"
                  onClick={handleSwapDates}
                  title="Swap T1 and T2 acquisition dates"
                  disabled={!earlierSceneId || !laterSceneId}
                  className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs hover:border-emerald-300 disabled:opacity-40 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="btn-run-comparison"
                  onClick={() => handleRunComparison(true)}
                  disabled={comparing || isSameSceneSelected || !earlierSceneId || !laterSceneId}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-50 transition-all"
                >
                  {comparing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Computing Pixel Differences...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-emerald-200" />
                      <span>Run Change Pipeline</span>
                    </>
                  )}
                </button>
              </div>

              {/* Later Date (T2) */}
              <div className="md:col-span-4 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
                <label
                  htmlFor="later-scene-select"
                  className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-between"
                >
                  <span>Later Scene (T2 Current)</span>
                  {laterScene && <StatusBadge status={laterScene.source} />}
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
                  <select
                    id="later-scene-select"
                    value={laterSceneId}
                    onChange={(e) => setLaterSceneId(e.target.value)}
                    className="w-full text-xs font-semibold text-emerald-950 bg-white border border-emerald-300 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {scenes.map((s) => (
                      <option key={`later-${s._id}`} value={s._id}>
                        {new Date(s.acquisitionDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}{' '}
                        • {s.source === 'SENTINEL_2' ? 'Sentinel-2' : 'Prepared Demo'} ({s.cloudCoverPercent || 0}% cloud)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Chunk 3: Pipeline Options Bar (Method, Sensitivity, Fallback status) */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Method Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Pipeline Method:
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      id="opt-method-pixel-diff"
                      onClick={() => setPipelineEngine('PIXEL_DIFFERENCE')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        pipelineEngine === 'PIXEL_DIFFERENCE'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚡ NumPy Pixel Difference
                    </button>
                    <button
                      type="button"
                      id="opt-method-prepared"
                      onClick={() => setPipelineEngine('PREPARED_RESULT')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        pipelineEngine === 'PREPARED_RESULT'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📁 Prepared Demo Result
                    </button>
                  </div>
                </div>

                {/* Sensitivity Threshold (Active when PIXEL_DIFFERENCE selected) */}
                {pipelineEngine === 'PIXEL_DIFFERENCE' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Sensitivity:
                    </span>
                    <select
                      value={sensitivityThreshold}
                      onChange={(e) => setSensitivityThreshold(Number(e.target.value))}
                      className="text-[11px] font-semibold rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value={20}>High Sensitivity (Threshold 20)</option>
                      <option value={28}>Standard Balanced (Threshold 28)</option>
                      <option value={38}>Conservative / Low (Threshold 38)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                {comparing ? (
                  <span className="text-emerald-700 font-semibold animate-pulse flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    Executing NumPy differential pipeline...
                  </span>
                ) : analysis?.method === 'PIXEL_DIFFERENCE' ? (
                  <span className="text-teal-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    Active: Live differential calculation
                  </span>
                ) : (
                  <span className="text-slate-500 italic">
                    Active: Prepared demonstration analysis
                  </span>
                )}
              </div>
            </div>

            {/* Validation Notice for Same Scene Selection */}
            {isSameSceneSelected && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Identical Scene Selected:</strong> T1 and T2 must be distinct acquisition dates. Please choose different dates to identify temporal changes.
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 3. MISSING IMAGERY EMPTY STATE */}
      {!hasScenes ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 shadow-xs">
          <EmptyState
            title="No Satellite Scenes Available for this Area"
            description={`No satellite scenes are currently registered for "${currentArea?.name}". Multi-temporal change analysis requires at least two distinct satellite scenes.`}
            icon={Satellite}
            actionLabel="Switch to Western Ghats Sector 4 (Active)"
            onAction={() => {
              const defaultA = areas.find((a) => a.name.includes('Western Ghats')) || areas[0];
              if (defaultA) {
                setSelectedAreaId(defaultA._id);
                setSearchParams({ areaId: defaultA._id });
                loadAreaScenesAndAnalysis(defaultA._id);
              }
            }}
          />
        </div>
      ) : !hasEnoughScenes ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Single Scene Available</h4>
              <p className="mt-1 text-slate-700">
                Only 1 satellite scene has been ingested for this monitoring area. Multi-temporal change detection requires at least two scenes acquired on different dates.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 4. MAIN COMPARISON STAGE */}
          {activeTab === 'scenes' ? (
            /* Scene Catalog Table */
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Multi-Temporal Scene Catalog for {currentArea?.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological satellite acquisitions available for multi-temporal alignment and change verification.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  {scenes.length} Scenes Total
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Preview</th>
                      <th className="py-3 px-4">Acquisition Date</th>
                      <th className="py-3 px-4">Data Source</th>
                      <th className="py-3 px-4">Cloud Cover</th>
                      <th className="py-3 px-4">Resolution</th>
                      <th className="py-3 px-4 text-right">Assign Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {scenes.map((scene) => (
                      <tr key={scene._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-4">
                          <img
                            src={scene.imageUrl}
                            alt=""
                            className="w-16 h-10 object-cover rounded border border-slate-200"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {new Date(scene.acquisitionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={scene.source} />
                        </td>
                        <td className="py-2.5 px-4 font-mono">{scene.cloudCoverPercent}%</td>
                        <td className="py-2.5 px-4">{scene.resolutionMeters}m</td>
                        <td className="py-2.5 px-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEarlierSceneId(scene._id);
                              setActiveTab('slider');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              earlierSceneId === scene._id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Set T1 Baseline
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLaterSceneId(scene._id);
                              setActiveTab('slider');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              laterSceneId === scene._id
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Set T2 Current
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'map' ? (
            /* GEOSPATIAL VECTOR & RASTER OVERLAY MAP VIEW */
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-700" />
                    Georeferenced Map & Satellite Raster Overlay
                  </h2>
                  <p className="text-xs text-slate-500">
                    Interactive OpenStreetMap vector boundaries with real-world georeferenced satellite imagery and change mask projection.
                  </p>
                </div>

                {/* Map Overlay Controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setMapOverlayType('mask')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        mapOverlayType === 'mask'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Change Mask Layer
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapOverlayType('scene')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        mapOverlayType === 'scene'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      T2 Satellite Scene
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                    <span>Opacity:</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.05"
                      value={mapOverlayOpacity}
                      onChange={(e) => setMapOverlayOpacity(parseFloat(e.target.value))}
                      className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <span className="font-mono text-[10px] w-6">{Math.round(mapOverlayOpacity * 100)}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMapOverlay(!showMapOverlay)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-semibold transition-colors ${
                      showMapOverlay
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {showMapOverlay ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showMapOverlay ? 'Overlay Visible' : 'Overlay Hidden'}</span>
                  </button>
                </div>
              </div>

              {/* Geographic Bounds Status Pill */}
              <div className="flex flex-wrap items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span className="font-semibold">Geographic Raster Projection:</span>
                  {leafletBounds ? (
                    <span className="font-mono text-[11px] text-slate-600">
                      SW [{leafletBounds[0][0].toFixed(3)}°N, {leafletBounds[0][1].toFixed(3)}°E] → NE [
                      {leafletBounds[1][0].toFixed(3)}°N, {leafletBounds[1][1].toFixed(3)}°E]
                    </span>
                  ) : (
                    <span className="text-amber-700 italic">No geographic bounding polygon registered</span>
                  )}
                </div>

                {leafletBounds && (
                  <span className="text-[11px] font-medium text-emerald-800">
                    ✓ Valid Geographic Bounds Available
                  </span>
                )}
              </div>

              {/* Leaflet Map with ImageOverlay */}
              <div className="flex-1 min-h-[480px]">
                <MapView
                  center={
                    currentArea?.centroid?.coordinates
                      ? [currentArea.centroid.coordinates[1], currentArea.centroid.coordinates[0]]
                      : [12.5, 75.7]
                  }
                  zoom={12}
                  bounds={leafletBounds}
                  areas={currentArea ? [currentArea] : []}
                  protectedZones={protectedZones}
                  detectedRegions={analysis?.regions || []}
                  detectionDate={laterScene?.acquisitionDate || analysis?.completedAt}
                  imageOverlayUrl={
                    mapOverlayType === 'mask'
                      ? analysis?.changeMaskUrl || 'http://localhost:5000/assets/scenes/wg_mask.svg'
                      : laterScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2024.png'
                  }
                  imageOverlayBounds={geographicBounds}
                  imageOverlayOpacity={mapOverlayOpacity}
                  imageOverlayName={
                    mapOverlayType === 'mask'
                      ? 'Change Mask Anomaly Overlay'
                      : 'Sentinel-2 Scene Overlay'
                  }
                  showImageOverlay={showMapOverlay}
                  onToggleImageOverlay={setShowMapOverlay}
                  height="480px"
                />
              </div>
            </div>
          ) : (
            /* COMPARISON STUDIO: INTERACTIVE BEFORE/AFTER SLIDER */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Before/After Slider */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-700" />
                      Multi-Temporal Visual Comparison Studio
                    </h2>
                    <p className="text-xs text-slate-500">
                      Drag divider between T1 baseline and T2 post-event passes. Toggle change-mask to highlight detected anomalies.
                    </p>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Touch & Drag Enabled
                  </span>
                </div>

                {/* Interactive Slider Component */}
                <BeforeAfterSlider
                  beforeImage={
                    earlierScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2023.png'
                  }
                  afterImage={
                    laterScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2024.png'
                  }
                  beforeDate={earlierScene?.acquisitionDate}
                  afterDate={laterScene?.acquisitionDate}
                  beforeBadge={
                    earlierScene?.source === 'SENTINEL_2'
                      ? 'Verified Sentinel-2 RGB'
                      : 'Prepared Demo Baseline'
                  }
                  afterBadge={
                    laterScene?.source === 'SENTINEL_2'
                      ? 'Verified Sentinel-2 RGB'
                      : 'Prepared Demo Pass'
                  }
                  maskImage={
                    analysis?.changeMaskUrl || 'http://localhost:5000/assets/scenes/wg_mask.svg'
                  }
                  showMask={showMask}
                  onToggleMask={setShowMask}
                  maskOpacity={maskOpacity}
                  onMaskOpacityChange={setMaskOpacity}
                />

                {/* Provenance & Analysis Details Drawer (Chunk 3 Enhanced) */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div
                    onClick={() => setShowQualityDetails(!showQualityDetails)}
                    className="flex items-center justify-between cursor-pointer py-1 text-xs font-bold text-slate-800 hover:text-emerald-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Analysis Provenance, Multi-Temporal Dates & Pipeline Limitations
                    </span>
                    {showQualityDetails ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  {showQualityDetails && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in duration-150 text-xs">
                      {/* Grid 1: Method & Elapsed Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Analysis Methodology
                          </span>
                          <span className="font-bold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                            {analysis?.method === 'PIXEL_DIFFERENCE' ? (
                              <>
                                <Zap className="w-3.5 h-3.5 text-teal-600" />
                                <span>NumPy Differential Pipeline</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Prepared Demo Dataset</span>
                              </>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            {analysis?.method === 'PIXEL_DIFFERENCE'
                              ? 'Computed live via Euclidean RGB difference & noise clustering.'
                              : 'Pre-computed multi-band index from verified Sentinel-2 passes.'}
                          </span>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Acquisition Interval
                          </span>
                          <span className="font-bold text-slate-900 mt-0.5 block">
                            {elapsedDays !== null ? `${elapsedDays} Days Elapsed` : 'Baseline Interval'}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            {earlierScene?.acquisitionDate ? new Date(earlierScene.acquisitionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'T1'} → {laterScene?.acquisitionDate ? new Date(laterScene.acquisitionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'T2'}
                          </span>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Ground Resolution (GSD)
                          </span>
                          <span className="font-bold text-slate-900 mt-0.5 block">
                            {earlierScene?.resolutionMeters || 10}m per ground pixel
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Spatial scale: 1 pixel represents {((earlierScene?.resolutionMeters || 10) ** 2)} m² on the surface.
                          </span>
                        </div>
                      </div>

                      {/* Grid 2: Quality Notes Checklist */}
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Quality Assurance Notes & Pipeline Execution Parameters
                        </span>
                        <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                          {analysis?.qualityNotes && analysis.qualityNotes.length > 0 ? (
                            analysis.qualityNotes.map((note, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{note}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic">
                              Orthorectified Sentinel-2 multi-temporal alignment with cloud cover &lt; 5%.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Regulatory Notice Banner */}
                      <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <strong>Verification Advisory:</strong> Multi-temporal imagery comparisons identify potential land disturbance. They do not prove illegal activity or conclusive boundary encroachment without authorized field officer verification.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Detected Regions & Inspection Tasks */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Flagged Anomalies & Regions
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {analysis?.regions?.length || 0} Flagged
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Multi-temporal anomalies requiring field perimeter check.
                </p>

                {/* Analysis Summary Metric Box */}
                {analysis ? (
                  <div className="p-3.5 mb-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Methodology:</span>
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-800 text-[11px]">
                        {analysis.method}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Changed Area:</span>
                      <span className="font-bold text-slate-900">
                        {analysis.changedAreaHectares} ha ({analysis.changedAreaSqMeters?.toLocaleString()} m²)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Protected Reserve Status:</span>
                      <span
                        className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                          analysis.regions?.some((r) => r.protectedZoneOverlap)
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {analysis.regions?.some((r) => r.protectedZoneOverlap)
                          ? '⚠️ Core Reserve Overlap'
                          : '✓ Outside Core Reserve'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 mb-4 rounded-lg bg-slate-50 text-slate-500 text-xs text-center">
                    Click "Run Change Pipeline" above to run or retrieve analysis.
                  </div>
                )}

                {/* Region Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                  {analysis?.regions && analysis.regions.length > 0 ? (
                    analysis.regions.map((region) => (
                      <div
                        key={region.regionId}
                        className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between bg-white"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {region.regionId}
                            </span>
                            <StatusBadge status={region.category} />
                          </div>

                          <div className="mt-2 text-xs text-slate-600 space-y-1">
                            <div>
                              Estimated Extent:{' '}
                              <span className="font-semibold text-slate-800">
                                {(region.areaSqMeters / 10000).toFixed(2)} ha
                              </span>{' '}
                              ({region.areaSqMeters?.toLocaleString()} m²)
                            </div>
                            <div>
                              Confidence:{' '}
                              <span className="font-semibold text-slate-800">
                                {Math.round((region.confidence || 0.85) * 100)}%
                              </span>
                            </div>
                          </div>

                          {region.protectedZoneOverlap && (
                            <div className="mt-2.5 p-2 rounded bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-[11px] text-rose-800 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <span>Intersecting nature reserve buffer. Field verification priority.</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Review: {region.reviewStatus}
                          </span>
                          <button
                            type="button"
                            id={`btn-create-task-${region.regionId.toLowerCase()}`}
                            onClick={() => handleOpenTaskModal(region)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors"
                          >
                            <ClipboardPlus className="w-3.5 h-3.5" />
                            <span>Create Task</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No anomaly regions identified for this scene pair.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Inspection Task Modal */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Dispatch Ground Inspection Task
              </h3>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {taskSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Task Dispatched</h4>
                <p className="text-xs text-slate-600">{taskSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inspection Description & Directives
                  </label>
                  <textarea
                    rows={3}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="HIGH">HIGH (Protected Zone)</option>
                      <option value="MEDIUM">MEDIUM (Standard)</option>
                      <option value="LOW">LOW (Informational)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Officer
                    </label>
                    <input
                      type="text"
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInspectModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={taskSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {taskSubmitting ? 'Dispatching...' : 'Confirm & Dispatch Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
