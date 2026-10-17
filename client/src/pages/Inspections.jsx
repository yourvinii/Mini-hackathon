import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  FileText,
  Search,
  Plus,
  Camera,
  Image,
  ShieldCheck,
  Scale,
  Eye,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  getInspections,
  updateInspection,
  createInspection,
  addInspectionEvidence,
  getAreas,
  getAnalyses
} from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

// Pre-configured ground evidence presets for demo & field inspections
const EVIDENCE_PRESETS = [
  {
    title: 'Timber Clearing & Stacks Photograph',
    url: 'http://localhost:5000/assets/evidence/timber_clearing.svg',
    caption: 'Ground photo showing cleared canopy timber stacks and machinery tracks in sector buffer'
  },
  {
    title: 'Handheld GNSS GPS Reading',
    url: 'http://localhost:5000/assets/evidence/gps_reading.svg',
    caption: 'Field GPS terminal coordinate verification (12° 29\' 31.6" N, 75° 42\' 15.1" E)'
  },
  {
    title: 'Boundary Pillar #42 Inspection Photo',
    url: 'http://localhost:5000/assets/evidence/boundary_pillar.svg',
    caption: 'Physical concrete forest department boundary pillar #42 survey inspection'
  }
];

export default function Inspections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (sync with URL if provided)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task & local state
  const [activeTask, setActiveTask] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [assignedToDraft, setAssignedToDraft] = useState('');
  const [updating, setUpdating] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Modal 1: Create Inspection Task Form
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [areas, setAreas] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [createForm, setCreateForm] = useState({
    areaId: '',
    analysisId: '',
    regionId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    assignedTo: 'Officer P. Deshmukh',
    inspectionNotes: ''
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Modal 2: Authorized Review Mandate Confirmation (Verify or Dismiss)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [pendingReviewStatus, setPendingReviewStatus] = useState(null); // 'VERIFIED' | 'DISMISSED'
  const [reviewForm, setReviewForm] = useState({
    reviewerName: 'Officer P. Deshmukh',
    reviewerBadge: 'Forest Range Officer (Division #4)',
    justification: ''
  });

  // Modal 3: Field-Photo Evidence Attachment
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customEvidenceUrl, setCustomEvidenceUrl] = useState('');
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  // Modal 4: Full-Screen Evidence Photo Viewer
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const res = await getInspections(params);
      const loadedTasks = res.tasks || [];
      setTasks(loadedTasks);

      // Keep active task selection or pick first
      if (loadedTasks.length > 0) {
        const stillSelected = activeTask ? loadedTasks.find((t) => t._id === activeTask._id) : null;
        const taskToSelect = stillSelected || loadedTasks[0];
        setActiveTask(taskToSelect);
        setNotesDraft(taskToSelect.inspectionNotes || '');
        setAssignedToDraft(taskToSelect.assignedTo || 'Unassigned');
      } else {
        setActiveTask(null);
        setNotesDraft('');
        setAssignedToDraft('');
      }
    } catch (err) {
      console.error('Failed to load inspection tasks:', err);
      setError(err.message || 'Unable to retrieve inspection tasks.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, activeTask]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Load auxiliary data for task creation modal
  useEffect(() => {
    const loadAux = async () => {
      try {
        const [areasRes, analysesRes] = await Promise.all([getAreas(), getAnalyses()]);
        setAreas(areasRes.areas || []);
        setAnalyses(analysesRes.analyses || []);
        if (areasRes.areas?.length > 0 && !createForm.areaId) {
          setCreateForm((prev) => ({
            ...prev,
            areaId: areasRes.areas[0]._id
          }));
        }
      } catch (e) {
        console.error('Failed to load aux data for task creation:', e);
      }
    };
    loadAux();
  }, [createForm.areaId]);

  const handleSelectTask = (task) => {
    setActiveTask(task);
    setNotesDraft(task.inspectionNotes || '');
    setAssignedToDraft(task.assignedTo || 'Unassigned');
    setSaveSuccessMsg('');
  };

  // Direct status transition or open authorized review confirmation
  const handleInitiateStatusChange = (newStatus) => {
    if (!activeTask) return;
    if (newStatus === 'VERIFIED' || newStatus === 'DISMISSED') {
      setPendingReviewStatus(newStatus);
      setReviewForm({
        reviewerName: activeTask.assignedTo?.startsWith('Officer')
          ? activeTask.assignedTo
          : 'Officer P. Deshmukh',
        reviewerBadge: 'Authorized Forest Review Officer (#FO-2024-8841)',
        justification:
          newStatus === 'VERIFIED'
            ? 'Ground GPS survey and visual inspection confirm unauthorized land disturbance intersecting buffer perimeter.'
            : 'Ground inspection confirms seasonal agricultural preparation compliant with zoning regulations. False positive dismissed.'
      });
      setReviewModalOpen(true);
    } else {
      executeStatusUpdate(newStatus);
    }
  };

  const executeStatusUpdate = async (newStatus, reviewerName = null) => {
    if (!activeTask) return;
    try {
      setUpdating(true);
      const payload = {
        status: newStatus,
        inspectionNotes: notesDraft,
        assignedTo: assignedToDraft
      };
      if (reviewerName) {
        payload.reviewedBy = reviewerName;
      }

      const res = await updateInspection(activeTask._id, payload);
      const updated = res.task;
      setActiveTask(updated);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setSaveSuccessMsg(`Task successfully transitioned to ${newStatus}`);
      setTimeout(() => setSaveSuccessMsg(''), 2500);
    } catch (err) {
      alert(err.message || 'Failed to update inspection task');
    } finally {
      setUpdating(false);
      setReviewModalOpen(false);
    }
  };

  const handleConfirmReview = (e) => {
    e.preventDefault();
    if (!pendingReviewStatus) return;
    const reviewerSignOff = `${reviewForm.reviewerName} (${reviewForm.reviewerBadge})`;
    const fullNotes = notesDraft
      ? `${notesDraft}\n[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${pendingReviewStatus} Decision: ${reviewForm.justification}`
      : `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${pendingReviewStatus} Decision: ${reviewForm.justification}`;

    setNotesDraft(fullNotes);
    executeStatusUpdate(pendingReviewStatus, reviewerSignOff);
  };

  const handleSaveNotesAndInspector = async () => {
    if (!activeTask) return;
    try {
      setUpdating(true);
      const res = await updateInspection(activeTask._id, {
        inspectionNotes: notesDraft,
        assignedTo: assignedToDraft
      });
      const updated = res.task;
      setActiveTask(updated);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setSaveSuccessMsg('Inspection notes and officer assignment saved!');
      setTimeout(() => setSaveSuccessMsg(''), 2500);
    } catch (err) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  // Attach field-photo evidence
  const handleAttachEvidence = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    const targetUrl = customEvidenceUrl.trim() || EVIDENCE_PRESETS[selectedPresetIndex]?.url;
    const caption = evidenceCaption.trim() || EVIDENCE_PRESETS[selectedPresetIndex]?.caption;

    if (!targetUrl) {
      alert('Please select a photo evidence preset or provide a valid URL.');
      return;
    }

    try {
      setEvidenceSubmitting(true);
      const res = await addInspectionEvidence(activeTask._id, {
        evidenceUrl: targetUrl,
        caption
      });

      const updated = res.task;
      setActiveTask(updated);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setNotesDraft(updated.inspectionNotes || '');
      setEvidenceModalOpen(false);
      setCustomEvidenceUrl('');
      setEvidenceCaption('');
      setSaveSuccessMsg('Field photo evidence successfully attached to task!');
      setTimeout(() => setSaveSuccessMsg(''), 2500);
    } catch (err) {
      alert(err.message || 'Failed to attach evidence');
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  // Create new task form submission
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      const matchingAnalysis = analyses.find(
        (a) => (a.monitoringArea?._id || a.monitoringArea) === createForm.areaId
      ) || analyses[0];

      if (!matchingAnalysis) {
        alert('No registered change analysis available for this area. Please run change analysis first.');
        return;
      }

      const res = await createInspection({
        analysisId: matchingAnalysis._id,
        regionId: createForm.regionId || `REG-${Date.now().toString().slice(-4)}`,
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        assignedTo: createForm.assignedTo,
        inspectionNotes: createForm.inspectionNotes
      });

      setCreateModalOpen(false);
      setCreateForm({
        areaId: areas[0]?._id || '',
        analysisId: '',
        regionId: '',
        title: '',
        description: '',
        priority: 'HIGH',
        assignedTo: 'Officer P. Deshmukh',
        inspectionNotes: ''
      });

      await fetchTasks();
      if (res.task) {
        setActiveTask(res.task);
      }
    } catch (err) {
      alert(err.message || 'Failed to create inspection task');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filter tasks locally by search query
  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(query) ||
      t.regionId?.toLowerCase().includes(query) ||
      t.monitoringArea?.name?.toLowerCase().includes(query) ||
      t.assignedTo?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ground Inspection & Verification Workflow
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Chunk 5: Inspection Workflow
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Dispatch, track, and officially verify ground field inspections for detected land change anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-create-inspection"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Inspection Task</span>
          </button>
        </div>
      </div>

      {/* 2. Legal Reviewer Mandate Advisory Banner */}
      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-amber-900 block mb-0.5">
            Authorized Review Mandate & Evidentiary Standard:
          </span>
          Satellite change detection flags candidate land anomalies. Legal verification of illegal encroachment or formal dismissal of a benign finding must be conducted by an authorized Forest Review Officer after physical on-site GPS perimeter survey and evidence logging.
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-tasks"
              placeholder="Search by title, region ID, officer, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              id="select-filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSearchParams({ status: e.target.value, priority: priorityFilter });
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN (Dispatched)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Underway)</option>
              <option value="VERIFIED">VERIFIED (Encroachment)</option>
              <option value="DISMISSED">DISMISSED (False Alarm)</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              id="select-filter-priority"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setSearchParams({ status: statusFilter, priority: e.target.value });
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">HIGH (Buffer Overlap)</option>
              <option value="MEDIUM">MEDIUM (Standard)</option>
              <option value="LOW">LOW (Informational)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching inspection assignments and ground evidence..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTasks} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 4. Left 5 Cols: Tasks Queue List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-1 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Inspection Queue ({filteredTasks.length})
              </span>
              <span className="text-slate-500 text-[11px]">Select task to review evidence</span>
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyState
                title="No inspection tasks match criteria"
                description="Try clearing your status or priority filter, or create a new inspection task."
                actionLabel="Reset Filters"
                onAction={() => {
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchQuery('');
                  setSearchParams({});
                }}
              />
            ) : (
              filteredTasks.map((task) => {
                const isSelected = activeTask?._id === task._id;
                const hasEvidence = task.evidenceUrls && task.evidenceUrls.length > 0;

                return (
                  <div
                    key={task._id}
                    id={`task-card-${task.regionId?.toLowerCase() || task._id}`}
                    onClick={() => handleSelectTask(task)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {task.regionId}
                          </span>
                          <StatusBadge status={task.priority} />
                        </div>
                        <h2 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {task.title}
                        </h2>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>

                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {task.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.monitoringArea?.name || 'Monitoring Area'}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {hasEvidence && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold border border-indigo-200">
                            <Camera className="w-3 h-3" />
                            <span>{task.evidenceUrls.length}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{task.assignedTo || 'Unassigned'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 5. Right 7 Cols: Task Details, Ground Evidence & Review Workbench */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            {activeTask ? (
              <div className="space-y-5">
                {/* Save feedback banner */}
                {saveSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Header & Status Badges */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                      REGION: {activeTask.regionId}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={activeTask.priority} />
                      <StatusBadge status={activeTask.status} />
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {activeTask.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {activeTask.description}
                  </p>
                </div>

                {/* Spatial Context & Assignment Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Target Monitoring Area
                    </span>
                    <span className="font-bold text-slate-800">
                      {activeTask.monitoringArea?.name || 'Monitoring Sector'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {activeTask.monitoringArea?.region || 'Protected Perimeter'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Assigned Field Inspector
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        value={assignedToDraft}
                        onChange={(e) => setAssignedToDraft(e.target.value)}
                        placeholder="Officer name..."
                        className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Change Detection Method
                    </span>
                    <span className="font-medium text-slate-700">
                      {activeTask.analysis?.method === 'PIXEL_DIFFERENCE'
                        ? 'NumPy Differential Pipeline'
                        : 'Verified Prepared Dataset'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Creation Timestamp
                    </span>
                    <span className="font-medium text-slate-700">
                      {new Date(activeTask.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Authorized Review Seal (When Verified or Dismissed) */}
                {(activeTask.status === 'VERIFIED' || activeTask.status === 'DISMISSED') && (
                  <div
                    className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                      activeTask.status === 'VERIFIED'
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        activeTask.status === 'VERIFIED' ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold block">
                        {activeTask.status === 'VERIFIED'
                          ? 'Official Legal Verification Enforced'
                          : 'Official Finding Dismissal Certified'}
                      </span>
                      <p className="text-[11px] text-slate-700">
                        Reviewed & signed by:{' '}
                        <span className="font-semibold">{activeTask.reviewedBy || 'Authorized Forest Officer'}</span>{' '}
                        {activeTask.reviewedAt && (
                          <span>on {new Date(activeTask.reviewedAt).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Field-Photo Evidence Gallery (Chunk 5 Highlight) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Field-Photo Evidence & Ground Artifacts</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({activeTask.evidenceUrls?.length || 0} attached)
                      </span>
                    </label>

                    <button
                      type="button"
                      id="btn-open-attach-evidence"
                      onClick={() => setEvidenceModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach Photo</span>
                    </button>
                  </div>

                  {activeTask.evidenceUrls && activeTask.evidenceUrls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {activeTask.evidenceUrls.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhotoUrl(url)}
                          className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer aspect-video shadow-xs hover:border-emerald-400 transition-all"
                        >
                          <img
                            src={url}
                            alt={`Field Evidence #${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </div>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px]">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50 flex flex-col items-center justify-center gap-1.5">
                      <Image className="w-5 h-5 text-slate-400" />
                      <span>No ground evidence photos attached yet.</span>
                      <button
                        type="button"
                        onClick={() => setEvidenceModalOpen(true)}
                        className="text-emerald-700 font-semibold hover:underline text-[11px]"
                      >
                        Attach GNSS survey or site photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Officer Ground Inspection Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Officer Ground Inspection Notes & Survey Log</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Timestamped upon save</span>
                  </div>

                  <textarea
                    rows={4}
                    id="textarea-inspection-notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Enter GPS coordinates, survey findings, evidence notes or drone observation logs..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
                  />

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      id="btn-save-notes"
                      disabled={updating}
                      onClick={handleSaveNotesAndInspector}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
                    >
                      {updating ? 'Saving...' : 'Save Notes & Assignment'}
                    </button>
                  </div>
                </div>

                {/* Status Transitions Bar */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-800">
                      Transition Task Workflow Status:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Current: <strong className="text-slate-800">{activeTask.status}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Re-open / Reset to OPEN */}
                    <button
                      type="button"
                      id="btn-status-open"
                      disabled={updating || activeTask.status === 'OPEN'}
                      onClick={() => handleInitiateStatusChange('OPEN')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-open (OPEN)</span>
                    </button>

                    {/* Mark IN_PROGRESS */}
                    <button
                      type="button"
                      id="btn-status-in-progress"
                      disabled={updating || activeTask.status === 'IN_PROGRESS'}
                      onClick={() => handleInitiateStatusChange('IN_PROGRESS')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark IN_PROGRESS</span>
                    </button>

                    {/* Verify Finding (Authorized Review) */}
                    <button
                      type="button"
                      id="btn-status-verified"
                      disabled={updating || activeTask.status === 'VERIFIED'}
                      onClick={() => handleInitiateStatusChange('VERIFIED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verify Finding (Authorized)</span>
                    </button>

                    {/* Dismiss Anomaly (Authorized Review) */}
                    <button
                      type="button"
                      id="btn-status-dismissed"
                      disabled={updating || activeTask.status === 'DISMISSED'}
                      onClick={() => handleInitiateStatusChange('DISMISSED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 border border-slate-300 text-slate-700 hover:bg-slate-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Dismiss Finding</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Select a task to review"
                description="Choose an inspection task from the queue to review ground evidence and update status."
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Inspection Task Dialog */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                <span>Create Ground Inspection Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Area
                  </label>
                  <select
                    value={createForm.areaId}
                    onChange={(e) => setCreateForm({ ...createForm, areaId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {areas.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Region ID / Tag
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REG-2024-001"
                    value={createForm.regionId}
                    onChange={(e) => setCreateForm({ ...createForm, regionId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field perimeter check on suspected forest clearing"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspection Directives & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline field coordinates to verify, access routes, and boundary markers..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="HIGH">HIGH (Protected Reserve Overlap)</option>
                    <option value="MEDIUM">MEDIUM (Standard Surrounding)</option>
                    <option value="LOW">LOW (Informational)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Officer
                  </label>
                  <input
                    type="text"
                    value={createForm.assignedTo}
                    onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create & Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Authorized Review Mandate Confirmation (Verify or Dismiss) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Authorized Review Mandate Sign-Off</span>
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Mandate Enforcement:</strong> Only an authorized reviewer may{' '}
              <span className="font-bold underline">
                {pendingReviewStatus === 'VERIFIED' ? 'VERIFY' : 'DISMISS'}
              </span>{' '}
              a change finding. This decision updates the official record.
            </div>

            <form onSubmit={handleConfirmReview} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorizing Reviewer Name
                </label>
                <input
                  type="text"
                  required
                  value={reviewForm.reviewerName}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewerName: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Designation / Badge ID
                </label>
                <input
                  type="text"
                  required
                  value={reviewForm.reviewerBadge}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewerBadge: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ground Finding Justification Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewForm.justification}
                  onChange={(e) => setReviewForm({ ...reviewForm, justification: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs disabled:opacity-50 ${
                    pendingReviewStatus === 'VERIFIED'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {updating
                    ? 'Signing...'
                    : pendingReviewStatus === 'VERIFIED'
                    ? 'Confirm Legal Verification'
                    : 'Confirm Dismissal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Attach Field Photo Evidence Dialog */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Attach Ground Photo Evidence</span>
              </h3>
              <button
                type="button"
                onClick={() => setEvidenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttachEvidence} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Field Photo Preset:
                </label>
                <div className="space-y-2">
                  {EVIDENCE_PRESETS.map((preset, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedPresetIndex === idx && !customEvidenceUrl
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="evidence-preset"
                        checked={selectedPresetIndex === idx && !customEvidenceUrl}
                        onChange={() => {
                          setSelectedPresetIndex(idx);
                          setCustomEvidenceUrl('');
                        }}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">{preset.title}</span>
                        <span className="text-[11px] text-slate-500">{preset.caption}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Custom Photo URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or /assets/evidence/..."
                  value={customEvidenceUrl}
                  onChange={(e) => setCustomEvidenceUrl(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evidence Caption & Ground Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground survey check on boundary coordinates"
                  value={evidenceCaption}
                  onChange={(e) => setEvidenceCaption(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evidenceSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {evidenceSubmitting ? 'Attaching...' : 'Attach Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Full-Screen Evidence Photo Viewer */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Field Evidence Inspection Artifact</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded"
              >
                ✕ Close
              </button>
            </div>
            <div className="bg-slate-950 p-2 flex items-center justify-center max-h-[500px]">
              <img
                src={previewPhotoUrl}
                alt="Enlarged field evidence"
                className="max-h-[460px] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
