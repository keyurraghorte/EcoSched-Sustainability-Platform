import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Leaf,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  fetchWorkloads,
  createWorkload,
  runScheduler,
  type MultiDimensionalSchedulingOutput,
} from '../api/workloads';
import type { WorkloadInsert, WorkloadSelect } from '@workspace/db';

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Pending' | 'Scheduled' | 'Completed' | 'Failed';

interface WorkloadFormData {
  name: string;
  cpuCores: string;
  memoryGb: string;
  durationMinutes: string;
  energyKwh: string;
  arrival: string;
  deadline: string;
  priority: Priority;
  dataSizeGb: string;
  status: Status;
}

const defaultFormData: WorkloadFormData = {
  name: '',
  cpuCores: '4',
  memoryGb: '16',
  durationMinutes: '60',
  energyKwh: '5.5',
  arrival: new Date().toISOString().slice(0, 16),
  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  priority: 'Medium',
  dataSizeGb: '10',
  status: 'Pending',
};

export function Workloads(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<WorkloadFormData>(defaultFormData);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [schedulingResult, setSchedulingResult] = useState<MultiDimensionalSchedulingOutput | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // 1. Fetch workloads from database via TanStack Query
  const {
    data: workloads = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<WorkloadSelect[], Error>({
    queryKey: ['workloads'],
    queryFn: fetchWorkloads,
  });

  // 2. Mutation for inserting new workload with automatic query invalidation
  const createMutation = useMutation({
    mutationFn: (newWorkload: WorkloadInsert) => createWorkload(newWorkload),
    onSuccess: () => {
      // Automatically invalidate and refetch ['workloads'] to update the UI instantly
      queryClient.invalidateQueries({ queryKey: ['workloads'] });
      setModalOpen(false);
      setForm(defaultFormData);
      setValidationError(null);
    },
    onError: (err: Error) => {
      setValidationError(err.message || 'Failed to persist workload to database');
    },
  });

  // 3. Mutation for triggering the multi-dimensional scheduling pipeline
  const runSchedulerMutation = useMutation({
    mutationFn: (dataCenterId?: string) => runScheduler(dataCenterId || 'oslo-fjord-1'),
    onSuccess: (result) => {
      setSchedulingResult(result);
      setScheduleError(null);
      // Automatically invalidate and refetch ['workloads'] to reflect 'Scheduled' statuses in real time
      queryClient.invalidateQueries({ queryKey: ['workloads'] });
    },
    onError: (err: Error) => {
      setScheduleError(err.message || 'Scheduling pipeline execution failed');
    },
  });

  const handleOpenModal = () => {
    setForm({
      ...defaultFormData,
      arrival: new Date().toISOString().slice(0, 16),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
    setValidationError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic form validation before dispatching to API
    if (!form.name.trim()) {
      setValidationError('Workload name is required');
      return;
    }

    const cpuCores = parseInt(form.cpuCores, 10);
    const memoryGb = parseFloat(form.memoryGb);
    const durationMinutes = parseInt(form.durationMinutes, 10);
    const energyKwh = parseFloat(form.energyKwh);
    const dataSizeGb = parseFloat(form.dataSizeGb) || 0;

    if (isNaN(cpuCores) || cpuCores <= 0) {
      setValidationError('CPU cores must be a positive integer');
      return;
    }
    if (isNaN(memoryGb) || memoryGb <= 0) {
      setValidationError('Memory (GB) must be a positive number');
      return;
    }
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      setValidationError('Duration (minutes) must be a positive integer');
      return;
    }
    if (isNaN(energyKwh) || energyKwh < 0) {
      setValidationError('Energy consumption must be non-negative');
      return;
    }
    if (!form.arrival || !form.deadline) {
      setValidationError('Both arrival and deadline timestamps are required');
      return;
    }

    const payload: WorkloadInsert = {
      name: form.name.trim(),
      cpuCores,
      memoryGb,
      durationMinutes,
      energyKwh,
      arrival: new Date(form.arrival).toISOString(),
      deadline: new Date(form.deadline).toISOString(),
      priority: form.priority,
      dataSizeGb,
      status: form.status,
    };

    createMutation.mutate(payload);
  };

  // Metrics calculations
  const totalEnergy = workloads.reduce((sum, w) => sum + (w.energyKwh || 0), 0);
  const totalCores = workloads.reduce((sum, w) => sum + (w.cpuCores || 0), 0);
  const totalMemory = workloads.reduce((sum, w) => sum + (w.memoryGb || 0), 0);
  const pendingCount = workloads.filter((w) => w.status === 'Pending').length;
  const scheduledCount = workloads.filter((w) => w.status === 'Scheduled').length;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'border-rose-300 bg-rose-50 text-rose-700';
      case 'Medium':
        return 'border-sky-300 bg-sky-50 text-sky-700';
      case 'Low':
      default:
        return 'border-slate-300 bg-slate-100 text-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'border-emerald-300 bg-emerald-100 text-emerald-800';
      case 'Completed':
        return 'border-sky-300 bg-sky-100 text-sky-800';
      case 'Failed':
        return 'border-red-300 bg-red-100 text-red-800';
      case 'Pending':
      default:
        return 'border-amber-300 bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#1683ac]">
            03 / Workload Queue & Scheduling Pipeline
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Workload Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Workloads persisted in Supabase via Drizzle ORM and scheduled across clean energy windows
            using multi-dimensional Segment Trees.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh workloads from Supabase"
            data-testid="button-refresh-workloads"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-sky-600' : ''} />
            {isFetching ? 'Syncing...' : 'Refresh'}
          </button>
          <button
            onClick={() => runSchedulerMutation.mutate('oslo-fjord-1')}
            disabled={runSchedulerMutation.isPending || pendingCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            title={pendingCount === 0 ? 'No pending workloads to schedule' : `Schedule ${pendingCount} pending job(s)`}
            data-testid="button-run-scheduler"
          >
            {runSchedulerMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {runSchedulerMutation.isPending ? 'Optimizing...' : `Run Scheduler (${pendingCount})`}
          </button>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1683ac] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#126b8d]"
            data-testid="button-add-workload"
          >
            <Plus size={16} /> Add Workload
          </button>
        </div>
      </div>

      {/* Scheduling Error Alert */}
      {scheduleError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-rose-600" size={18} />
            <div className="flex-1">
              <h4 className="font-semibold text-rose-900 text-sm">Scheduling Pipeline Error</h4>
              <p className="text-xs text-rose-700 mt-0.5">{scheduleError}</p>
            </div>
            <button
              onClick={() => setScheduleError(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Scheduling Result Output Card */}
      {schedulingResult && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check size={14} />
                </span>
                <h3 className="text-lg font-bold text-emerald-950">
                  Scheduling Pipeline Executed: {schedulingResult.dataCenterName}
                </h3>
              </div>
              <p className="mt-1 font-mono text-xs text-emerald-800">
                Run ID: {schedulingResult.runId} · Evaluated: {schedulingResult.metrics.totalEvaluated} jobs
              </p>
            </div>
            <button
              onClick={() => setSchedulingResult(null)}
              className="self-start rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Dismiss Report
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
              <span className="text-[11px] font-semibold text-emerald-700">Scheduled Jobs</span>
              <p className="mt-1 text-xl font-bold text-emerald-900">
                {schedulingResult.metrics.totalScheduled} / {schedulingResult.metrics.totalEvaluated}
              </p>
              <span className="text-[10px] text-emerald-600">
                {schedulingResult.metrics.successRatePct}% Success Rate
              </span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
              <span className="text-[11px] font-semibold text-emerald-700">Clean Energy Allocated</span>
              <p className="mt-1 text-xl font-bold text-emerald-900">
                {schedulingResult.metrics.totalScheduledEnergyKwh} kWh
              </p>
              <span className="text-[10px] text-emerald-600">Displaced fossil baseline</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
              <span className="text-[11px] font-semibold text-emerald-700">Renewable Utilization</span>
              <p className="mt-1 text-xl font-bold text-emerald-900">
                {schedulingResult.metrics.renewableUtilizationPct}%
              </p>
              <span className="text-[10px] text-emerald-600">Headroom absorbed</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
              <span className="text-[11px] font-semibold text-emerald-700">CO₂ Avoided</span>
              <p className="mt-1 text-xl font-bold text-emerald-900">
                {schedulingResult.metrics.estimatedCo2AvoidedKg} kg
              </p>
              <span className="text-[10px] text-emerald-600">Carbon reduction</span>
            </div>
          </div>

          {/* Unscheduled Workloads Warnings */}
          {schedulingResult.unscheduledWorkloads.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle size={14} className="text-amber-700" />
                Unscheduled Jobs Due to Resource Exhaustion ({schedulingResult.unscheduledWorkloads.length}):
              </p>
              <ul className="mt-1.5 list-disc pl-5 space-y-1">
                {schedulingResult.unscheduledWorkloads.map((un) => (
                  <li key={un.id}>
                    <strong>{un.name}</strong> ({un.cpuCores} cores, {un.memoryGb} GB): {un.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Active Workloads</span>
            <Layers size={16} className="text-[#1683ac]" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{workloads.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            {pendingCount} Pending · {scheduledCount} Scheduled
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Energy</span>
            <Zap size={16} className="text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalEnergy.toFixed(1)} kWh</div>
          <div className="mt-1 text-xs text-slate-500">Estimated power draw</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">CPU Cores</span>
            <Cpu size={16} className="text-indigo-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalCores}</div>
          <div className="mt-1 text-xs text-slate-500">Compute demand</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Memory</span>
            <HardDrive size={16} className="text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalMemory.toFixed(0)} GB</div>
          <div className="mt-1 text-xs text-slate-500">Allocated memory</div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center">
          <Loader2 size={32} className="animate-spin text-[#1683ac]" />
          <p className="mt-4 text-sm font-semibold text-slate-700">Connecting to database...</p>
          <p className="mt-1 text-xs text-slate-400">Loading persisted workloads from Supabase via Drizzle</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-rose-600" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-rose-950">Database Synchronization Failed</h3>
              <p className="mt-1 text-sm text-rose-700">
                {error?.message || 'Could not fetch workloads from the backend API.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-800"
              >
                <RefreshCw size={14} /> Retry Query
              </button>
            </div>
          </div>
        </div>
      ) : workloads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#1683ac]">
            <Database size={26} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">No Workloads in Queue</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            The Supabase workload queue is currently empty. Add your first workload to calculate carbon-aware scheduling windows.
          </p>
          <button
            onClick={handleOpenModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1683ac] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#126b8d]"
          >
            <Plus size={16} /> Add First Workload
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.8fr_0.8fr_0.8fr_0.9fr_1fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50/75 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
            <span>Workload</span>
            <span>Compute</span>
            <span>Duration</span>
            <span>Energy & Data</span>
            <span>Deadline & Window</span>
            <span className="text-right">Status</span>
          </div>

          <div className="divide-y divide-slate-100">
            {workloads.map((w) => (
              <div
                key={w.id}
                className="grid gap-3 p-5 transition hover:bg-slate-50/50 md:grid-cols-[1.8fr_0.8fr_0.8fr_0.9fr_1fr_0.8fr] md:items-center md:gap-4 md:px-6 md:py-4"
                data-testid={`workload-row-${w.id}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{w.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadge(
                        w.priority
                      )}`}
                    >
                      {w.priority}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-400 truncate max-w-[240px]">
                    {w.id}
                  </p>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{w.cpuCores}</span> Cores ·{' '}
                  <span className="font-semibold text-slate-900">{w.memoryGb}</span> GB
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span>{w.durationMinutes} min</span>
                </div>

                <div className="text-xs text-slate-600">
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <Zap size={13} className="text-amber-500" />
                    <span>{w.energyKwh} kWh</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{w.dataSizeGb} GB input</div>
                </div>

                <div className="text-xs text-slate-600">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Due: {w.deadline ? new Date(w.deadline).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {w.deadline ? new Date(w.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                  {w.scheduledTime && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 border border-emerald-200">
                      <Clock size={10} />
                      <span>Slot: {new Date(w.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {w.energySource && (
                        <span className="ml-1 rounded bg-emerald-200/60 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                          {w.energySource}
                        </span>
                      )}
                    </div>
                  )}
                  {w.sourceAllocationMix && (
                    <div className="mt-0.5 text-[9px] text-slate-400 truncate max-w-[200px]" title={w.sourceAllocationMix}>
                      🌱 {w.sourceAllocationMix}
                    </div>
                  )}
                </div>

                <div className="flex justify-start md:justify-end">
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusBadge(
                      w.status
                    )}`}
                  >
                    {w.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialog for Creating Workload */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#1683ac]">
                  Database Insertion
                </p>
                <h2 className="text-xl font-bold text-slate-900">Add New Workload</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {validationError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Workload Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. LLM Fine-Tuning Run"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                  data-testid="input-workload-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">CPU Cores</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.cpuCores}
                    onChange={(e) => setForm({ ...form, cpuCores: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-cpu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Memory (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={form.memoryGb}
                    onChange={(e) => setForm({ ...form, memoryGb: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-memory"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-duration"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Estimated Energy (kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={form.energyKwh}
                    onChange={(e) => setForm({ ...form, energyKwh: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-energy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Arrival Window</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.arrival}
                    onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-arrival"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac] focus:ring-2 focus:ring-[#1683ac]/20"
                    data-testid="input-workload-deadline"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac]"
                    data-testid="select-workload-priority"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac]"
                    data-testid="select-workload-status"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Input Data (GB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.dataSizeGb}
                    onChange={(e) => setForm({ ...form, dataSizeGb: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1683ac]"
                    data-testid="input-workload-datasize"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  data-testid="button-cancel-workload"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1683ac] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#126b8d] disabled:opacity-60"
                  data-testid="button-submit-workload"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Persisting...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save to Supabase
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workloads;
