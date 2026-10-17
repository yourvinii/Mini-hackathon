import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  ClipboardPlus,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  Sliders,
  Maximize2,
  Cloud,
  Satellite,
  Compass,
  ArrowLeftRight,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import {
  getAreas,
  getArea,
  getAreaScenes,
  getAnalyses,
  getAnalysis,
  getProtectedZones,
  createInspection
} from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import MapView from '../components/MapView';

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
  const [error, setError] = useState(null);

  // UI view toggles
  const [showMask, setShowMask] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50); // percentage for before/after comparison
  const [activeTab, setActiveTab] = useState('slider'); // 'slider' | 'map' | 'scenes'

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

        // Pick requested area or first available
        const queryAreaId = searchParams.get('areaId');
        const defaultArea = (queryAreaId && loadedAreas.find(a => a._id === queryAreaId)) || loadedAreas[0];

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
  }, [searchParams]);

  const loadAreaScenesAndAnalysis = async (areaId, existingAnalyses = []) => {
    try {
      // 1. Fetch scenes for this specific monitoring area
      const scenesRes = await getAreaScenes(areaId);
      const loadedScenes = scenesRes.scenes || [];
      setScenes(loadedScenes);

      // 2. Select initial earlier and later scenes if available
      if (loadedScenes.length >= 2) {
        setEarlierSceneId(loadedScenes[0]._id);
        setLaterSceneId(loadedScenes[loadedScenes.length - 1]._id);
      } else if (loadedScenes.length === 1) {
        setEarlierSceneId(loadedScenes[0]._id);
        setLaterSceneId('');
      } else {
        setEarlierSceneId('');
        setLaterSceneId('');
      }

      // 3. Find matching analysis for this area
      const matchingAnalysis = existingAnalyses.find(
        a => (a.monitoringArea?._id || a.monitoringArea) === areaId
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
  };

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

  const handleOpenTaskModal = (region) => {
    setSelectedRegion(region);
    setTaskForm({
      title: `Field Inspection: ${region.category.replace('_', ' ')} (${region.regionId})`,
      description: `Automated detection detected ${(region.areaSqMeters / 10000).toFixed(2)} ha anomaly. Overlaps protected reserve: ${region.protectedZoneOverlap ? 'YES' : 'NO'}. Field perimeter verification requested.`,
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

  if (loading) return <LoadingState message="Cataloging satellite passes and multi-temporal scenes..." />;
  if (error) return <ErrorMessage message={error} />;

  const currentArea = areas.find(a => a._id === selectedAreaId);
  const earlierScene = scenes.find(s => s._id === earlierSceneId);
  const laterScene = scenes.find(s => s._id === laterSceneId);

  // Validation checks for scenes
  const hasScenes = scenes.length > 0;
  const isSameSceneSelected = earlierSceneId && laterSceneId && earlierSceneId === laterSceneId;
  const hasEnoughScenes = scenes.length >= 2;

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
                Chunk 1: Scene Ingestion & Alignment
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Select an area of interest, choose acquisition dates from the multi-temporal scene catalog, and inspect aligned imagery.
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
                {areas.map(a => (
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

        {/* 2. Date Selectors & Validation Controls */}
        {hasScenes ? (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Earlier Date (T1) */}
              <div className="md:col-span-5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <label htmlFor="earlier-scene-select" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
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
                        {new Date(s.acquisitionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} • {s.source === 'SENTINEL_2' ? 'Sentinel-2' : 'Prepared Demo'} ({s.cloudCoverPercent || 0}% cloud)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Dates Button */}
              <div className="md:col-span-2 flex justify-center">
                <button
                  type="button"
                  id="btn-swap-dates"
                  onClick={handleSwapDates}
                  title="Swap T1 and T2 acquisition dates"
                  disabled={!earlierSceneId || !laterSceneId}
                  className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs hover:border-emerald-300 disabled:opacity-40 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Later Date (T2) */}
              <div className="md:col-span-5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
                <label htmlFor="later-scene-select" className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-between">
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
                        {new Date(s.acquisitionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} • {s.source === 'SENTINEL_2' ? 'Sentinel-2' : 'Prepared Demo'} ({s.cloudCoverPercent || 0}% cloud)
                      </option>
                    ))}
                  </select>
                </div>
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
              const defaultA = areas.find(a => a.name.includes('Western Ghats')) || areas[0];
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
          {/* 4. Side-by-Side Scene Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earlier Scene (T1) Preview Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                    T1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Earlier Scene (Baseline)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {earlierScene?.acquisitionDate ? new Date(earlierScene.acquisitionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date'}
                    </p>
                  </div>
                </div>

                {/* Visible Source Badge */}
                {earlierScene && (
                  <div className="flex items-center gap-1.5">
                    {earlierScene.source === 'SENTINEL_2' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <Satellite className="w-3.5 h-3.5 text-teal-600" />
                        Verified Sentinel-2 RGB
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Prepared Demo Dataset
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Image Thumbnail Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-900 mb-3 group">
                <img
                  src={earlierScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2023.svg'}
                  alt="Earlier satellite scene preview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono">
                  {earlierScene?.resolutionMeters || 10}m Ground Sample Distance
                </div>
              </div>

              {/* Scene Metadata Bar */}
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 block">Cloud Cover</span>
                  <span className="font-semibold text-slate-800 flex items-center justify-center gap-1">
                    <Cloud className="w-3 h-3 text-slate-400" />
                    {earlierScene?.cloudCoverPercent ?? 0}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Resolution</span>
                  <span className="font-semibold text-slate-800">{earlierScene?.resolutionMeters || 10}m / px</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Status</span>
                  <span className="font-semibold text-emerald-800">{earlierScene?.processingStatus || 'READY'}</span>
                </div>
              </div>
            </div>

            {/* Later Scene (T2) Preview Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs">
                    T2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Later Scene (Current)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {laterScene?.acquisitionDate ? new Date(laterScene.acquisitionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date'}
                    </p>
                  </div>
                </div>

                {/* Visible Source Badge */}
                {laterScene && (
                  <div className="flex items-center gap-1.5">
                    {laterScene.source === 'SENTINEL_2' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <Satellite className="w-3.5 h-3.5 text-teal-600" />
                        Verified Sentinel-2 RGB
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Prepared Demo Dataset
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Image Thumbnail Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-900 mb-3 group">
                <img
                  src={laterScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2024.svg'}
                  alt="Later satellite scene preview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono">
                  {laterScene?.resolutionMeters || 10}m Ground Sample Distance
                </div>
              </div>

              {/* Scene Metadata Bar */}
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 block">Cloud Cover</span>
                  <span className="font-semibold text-slate-800 flex items-center justify-center gap-1">
                    <Cloud className="w-3 h-3 text-slate-400" />
                    {laterScene?.cloudCoverPercent ?? 0}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Resolution</span>
                  <span className="font-semibold text-slate-800">{laterScene?.resolutionMeters || 10}m / px</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Status</span>
                  <span className="font-semibold text-emerald-800">{laterScene?.processingStatus || 'READY'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Main Comparison Stage */}
          {activeTab === 'scenes' ? (
            /* Scene Catalog Table */
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Scene Catalog for {currentArea?.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological satellite acquisitions available for multi-temporal alignment.
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
                      <th className="py-3 px-4 text-right">Set As</th>
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
                          {new Date(scene.acquisitionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={scene.source} />
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {scene.cloudCoverPercent}%
                        </td>
                        <td className="py-2.5 px-4">
                          {scene.resolutionMeters}m
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => { setEarlierSceneId(scene._id); setActiveTab('slider'); }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                              earlierSceneId === scene._id
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Set T1
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLaterSceneId(scene._id); setActiveTab('slider'); }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                              laterSceneId === scene._id
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Set T2
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Before / After Split Slider or Vector Map */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      {activeTab === 'slider' ? 'Multi-Temporal Visual Comparison' : 'Geospatial Anomaly Overlay Map'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeTab === 'slider'
                        ? 'Drag slider divider to inspect ground surface changes across time steps.'
                        : 'Interactive vector rendering of monitoring boundary, protected reserves, and detected anomalies.'}
                    </p>
                  </div>

                  {activeTab === 'slider' && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        id="toggle-change-mask"
                        checked={showMask}
                        onChange={(e) => setShowMask(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>Overlay Change Mask</span>
                    </label>
                  )}
                </div>

                {activeTab === 'slider' ? (
                  <div className="flex-1 flex flex-col">
                    {/* Interactive Before/After Split Viewer */}
                    <div
                      id="interactive-comparison-viewer"
                      className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-900 select-none"
                    >
                      {/* Background Image: Post-Event Scene (Later Scene) */}
                      <img
                        src={laterScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2024.svg'}
                        alt="Post-Event Satellite Scene"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Change Mask Highlight (if toggled) */}
                      {showMask && analysis?.changeMaskUrl && (
                        <img
                          src={analysis.changeMaskUrl}
                          alt="Change Detection Mask Overlay"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none"
                        />
                      )}

                      {/* Foreground Image: Baseline Scene (Clipped by sliderPosition) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${sliderPosition}%` }}
                      >
                        <img
                          src={earlierScene?.imageUrl || 'http://localhost:5000/assets/scenes/wg_2023.svg'}
                          alt="Baseline Satellite Scene"
                          className="absolute inset-0 w-full h-full object-cover max-w-none"
                          style={{ width: '100%', minWidth: '100%', height: '100%' }}
                        />
                        {/* Earlier Scene Badge */}
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded">
                          T1 BASELINE ({earlierScene?.acquisitionDate ? new Date(earlierScene.acquisitionDate).toISOString().slice(0, 10) : 'T1'})
                        </div>
                      </div>

                      {/* Later Scene Badge */}
                      <div className="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 text-[10px] font-bold px-2 py-1 rounded">
                        T2 CURRENT ({laterScene?.acquisitionDate ? new Date(laterScene.acquisitionDate).toISOString().slice(0, 10) : 'T2'})
                      </div>

                      {/* Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800">
                          <Sliders className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Slider Range Control */}
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">T1 Baseline</span>
                      <input
                        type="range"
                        id="slider-control"
                        min="0"
                        max="100"
                        value={sliderPosition}
                        onChange={(e) => setSliderPosition(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-emerald-600"
                      />
                      <span className="text-[11px] font-bold text-emerald-800 uppercase">T2 Post-Event</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[420px]">
                    <MapView
                      center={currentArea?.centroid?.coordinates ? [currentArea.centroid.coordinates[1], currentArea.centroid.coordinates[0]] : [12.50, 75.70]}
                      zoom={12}
                      areas={currentArea ? [currentArea] : []}
                      protectedZones={protectedZones}
                      detectedRegions={analysis?.regions || []}
                      height="420px"
                    />
                  </div>
                )}
              </div>

              {/* Right Col: Detected Regions & Inspection Tasks */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Detected Anomalies & Findings
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {analysis?.regions?.length || 0} Flagged
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Ground verification required prior to enforcement action.
                </p>

                {/* Analysis Summary Metric Box */}
                {analysis ? (
                  <div className="p-3.5 mb-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Methodology:</span>
                      <span className="font-semibold text-slate-800">{analysis.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Changed Area:</span>
                      <span className="font-bold text-slate-900">{analysis.changedAreaHectares || 14.8} ha</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Protected Overlap:</span>
                      <span className="font-bold text-rose-600">
                        {analysis.regions?.some(r => r.protectedZoneOverlap) ? 'Confirmed Overlap' : 'None Detected'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 mb-4 rounded-lg bg-slate-50 text-slate-500 text-xs">
                    No change analysis pre-calculated for this scene pair.
                  </div>
                )}

                {/* Region Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {analysis?.regions && analysis.regions.length > 0 ? (
                    analysis.regions.map((region) => (
                      <div
                        key={region.regionId}
                        className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
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
                              Estimated Area: <span className="font-semibold text-slate-800">{(region.areaSqMeters / 10000).toFixed(2)} ha</span> ({region.areaSqMeters?.toLocaleString()} m²)
                            </div>
                            <div>
                              Confidence: <span className="font-semibold text-slate-800">{Math.round((region.confidence || 0.85) * 100)}%</span>
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors"
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

                {/* Quality Notes list */}
                {analysis?.qualityNotes && analysis.qualityNotes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <span className="font-bold text-slate-700 block">Quality Notes & Provenance:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {analysis.qualityNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
