import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  FileText,
  Search,
  ChevronRight,
  Send
} from 'lucide-react';
import { getInspections, updateInspection } from '../api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

export default function Inspections() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task drawer/modal
  const [activeTask, setActiveTask] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const res = await getInspections(params);
      setTasks(res.tasks || []);
      if (res.tasks?.length > 0 && !activeTask) {
        setActiveTask(res.tasks[0]);
        setNotesDraft(res.tasks[0].inspectionNotes || '');
      }
    } catch (err) {
      console.error('Failed to load inspection tasks:', err);
      setError(err.message || 'Unable to retrieve inspection tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const handleSelectTask = (task) => {
    setActiveTask(task);
    setNotesDraft(task.inspectionNotes || '');
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!activeTask) return;
    try {
      setUpdating(true);
      const res = await updateInspection(activeTask._id, {
        status: newStatus,
        inspectionNotes: notesDraft,
        reviewedBy: 'Officer P. Deshmukh'
      });

      // Update in state
      const updated = res.task;
      setActiveTask(updated);
      setTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
    } catch (err) {
      alert(err.message || 'Failed to update inspection task');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeTask) return;
    try {
      setUpdating(true);
      const res = await updateInspection(activeTask._id, {
        inspectionNotes: notesDraft
      });
      const updated = res.task;
      setActiveTask(updated);
      setTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
    } catch (err) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  // Filter tasks locally by search query
  const filteredTasks = tasks.filter(t => {
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ground Inspection & Verification Tasks
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {tasks.length} Total Tasks
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Field investigation queue for anomalies identified via satellite change detection. Verifications update official status.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, region ID, officer..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="VERIFIED">Verified</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching inspection assignments..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTasks} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Tasks List */}
          <div className="lg:col-span-5 space-y-3">
            {filteredTasks.length === 0 ? (
              <EmptyState
                title="No inspection tasks found"
                description="No tasks match the selected status or priority filter."
              />
            ) : (
              filteredTasks.map((task) => {
                const isSelected = activeTask?._id === task._id;
                return (
                  <div
                    key={task._id}
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
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {task.regionId}
                          </span>
                          <StatusBadge status={task.priority} />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {task.title}
                        </h3>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>

                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {task.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {task.monitoringArea?.name || 'Monitoring Area'}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        {task.assignedTo || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 7 Cols: Task Details & Ground Action Workbench */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            {activeTask ? (
              <div className="space-y-5">
                {/* Header & Status Actions */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                      REGION: {activeTask.regionId}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={activeTask.priority} />
                      <StatusBadge status={activeTask.status} />
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-slate-900">
                    {activeTask.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {activeTask.description}
                  </p>
                </div>

                {/* Spatial Context Details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Target Area
                    </span>
                    <span className="font-bold text-slate-800">
                      {activeTask.monitoringArea?.name || 'Western Ghats Sector 4'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Assigned Inspector
                    </span>
                    <span className="font-bold text-slate-800">
                      {activeTask.assignedTo || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Detection Analysis
                    </span>
                    <span className="font-medium text-slate-700">
                      {activeTask.analysis?.method || 'PREPARED_RESULT'} (Verified)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Created At
                    </span>
                    <span className="font-medium text-slate-700">
                      {new Date(activeTask.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Field Notes & Ground Evidence */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Officer Ground Inspection Notes</span>
                  </label>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Enter GPS coordinates, survey findings, evidence notes or drone observation logs..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
                    >
                      {updating ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Transition Inspection Status:
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      id="btn-status-in-progress"
                      disabled={updating || activeTask.status === 'IN_PROGRESS'}
                      onClick={() => handleUpdateStatus('IN_PROGRESS')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark In Progress</span>
                    </button>

                    <button
                      type="button"
                      id="btn-status-verified"
                      disabled={updating || activeTask.status === 'VERIFIED'}
                      onClick={() => handleUpdateStatus('VERIFIED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verify Finding</span>
                    </button>

                    <button
                      type="button"
                      id="btn-status-dismissed"
                      disabled={updating || activeTask.status === 'DISMISSED'}
                      onClick={() => handleUpdateStatus('DISMISSED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Dismiss (False Anomaly)</span>
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
    </div>
  );
}
