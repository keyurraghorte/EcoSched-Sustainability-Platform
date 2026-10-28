import type { WorkloadInsert, WorkloadSelect } from '@workspace/db/schema/workloads';

/**
 * Endpoint for workloads API.
 * Uses relative path '/api/workloads' to leverage the Vite proxy or serverless routing.
 */
const API_BASE_URL = '/api/workloads';

/**
 * Fetches all persisted workloads from the Supabase PostgreSQL database via Express.
 * @returns Promise<WorkloadSelect[]>
 */
export async function fetchWorkloads(): Promise<WorkloadSelect[]> {
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch workloads (${response.status} ${response.statusText})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Submits a new workload to the Express API to be validated and inserted into Supabase.
 * @param workload The workload insertion payload
 * @returns Promise<WorkloadSelect> The newly inserted workload record with generated UUID and timestamps
 */
export async function createWorkload(
  workload: WorkloadInsert
): Promise<WorkloadSelect> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(workload),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create workload (${response.status} ${response.statusText})`;
    try {
      const errorData = await response.json();
      if (errorData?.message || errorData?.error) {
        errorMessage = errorData.message || errorData.error;
      }
      if (errorData?.issues?.fieldErrors) {
        const fieldErrors = Object.entries(errorData.issues.fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join('; ');
        errorMessage += ` (${fieldErrors})`;
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface ScheduledWorkloadItem {
  id: string;
  name: string;
  cpuCores: number;
  memoryGb: number;
  durationMinutes: number;
  energyKwh: number;
  priority: string;
  scheduledTime: string;
  completionTime: string;
  allocatedSlotIndex: number;
  slotSpan: number;
  energySource: string;
  sourceAllocationMix: string;
  carbonScore: number;
}

export interface UnscheduledWorkloadItem {
  id: string;
  name: string;
  cpuCores: number;
  memoryGb: number;
  energyKwh: number;
  priority: string;
  reason: string;
  exhaustedResource: 'energy' | 'cpu' | 'memory' | 'window';
}

export interface MultiDimensionalSchedulingOutput {
  runId: string;
  timestamp: string;
  dataCenterId: string;
  dataCenterName: string;
  scheduledWorkloads: ScheduledWorkloadItem[];
  unscheduledWorkloads: UnscheduledWorkloadItem[];
  telemetryPostAllocation: {
    remainingRenewableKwh: number[];
    remainingCpuCores: number[];
    remainingRamGb: number[];
  };
  metrics: {
    totalEvaluated: number;
    totalScheduled: number;
    totalUnscheduled: number;
    successRatePct: number;
    totalScheduledEnergyKwh: number;
    renewableUtilizationPct: number;
    estimatedCo2AvoidedKg: number;
  };
}

/**
 * Triggers the carbon-aware multi-dimensional scheduling pipeline via Express 5.
 * Fetches all 'Pending' workloads from Supabase, checks capacity across renewable headroom,
 * CPU saturation, and RAM capacity, allocates optimal contiguous clean time slots,
 * and batch-updates workloads in Supabase to 'Scheduled'.
 *
 * @param dataCenterId Target facility ID (defaults to 'oslo-fjord-1')
 * @returns MultiDimensionalSchedulingOutput with scheduled/unscheduled items and telemetry
 */
export async function runScheduler(
  dataCenterId = 'oslo-fjord-1'
): Promise<MultiDimensionalSchedulingOutput> {
  const response = await fetch('/api/schedule/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ dataCenterId }),
  });

  if (!response.ok) {
    let errorMessage = `Scheduling run failed (${response.status} ${response.statusText})`;
    try {
      const errorData = await response.json();
      if (errorData?.message || errorData?.error) {
        errorMessage = errorData.message || errorData.error;
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
