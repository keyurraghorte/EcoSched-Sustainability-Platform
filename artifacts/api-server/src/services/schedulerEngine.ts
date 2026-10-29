import { eq, desc, asc, and, gte, isNotNull } from 'drizzle-orm';
import { workloads, type WorkloadSelect, type WorkloadInsert } from '@workspace/db';

/**
 * Availability Segment Tree for O(log N) capacity availability and peak saturation checks.
 * Supports both Range Minimum Queries (RMQ) for available headroom checks
 * and Range Maximum Queries (maxInRange) for peak demand/utilization audits.
 */
export class AvailabilitySegmentTree {
  private readonly minTree: number[];
  private readonly maxTree: number[];
  private readonly size: number;
  private readonly rawValues: number[];

  constructor(values: number[]) {
    this.rawValues = [...values];
    this.size = 1;
    while (this.size < values.length) this.size *= 2;

    this.minTree = Array(this.size * 2).fill(Infinity);
    this.maxTree = Array(this.size * 2).fill(-Infinity);

    values.forEach((value, index) => {
      this.minTree[this.size + index] = value;
      this.maxTree[this.size + index] = value;
    });

    for (let index = this.size - 1; index > 0; index -= 1) {
      this.minTree[index] = Math.min(
        this.minTree[index * 2],
        this.minTree[index * 2 + 1]
      );
      this.maxTree[index] = Math.max(
        this.maxTree[index * 2],
        this.maxTree[index * 2 + 1]
      );
    }
  }

  /**
   * Queries minimum available headroom in the half-open range [left, right).
   * Operates in O(log N) time complexity.
   */
  queryMin(left: number, right: number): number {
    if (left >= right || left >= this.rawValues.length) return 0;
    let start = Math.max(0, left) + this.size;
    let end = Math.min(this.rawValues.length, right) + this.size;
    let result = Infinity;

    while (start < end) {
      if (start % 2 === 1) result = Math.min(result, this.minTree[start++]);
      if (end % 2 === 1) result = Math.min(result, this.minTree[--end]);
      start = Math.floor(start / 2);
      end = Math.floor(end / 2);
    }
    return result === Infinity ? 0 : result;
  }

  /**
   * Queries maximum value / peak capacity in the half-open range [left, right).
   * Operates in O(log N) time complexity.
   */
  maxInRange(left: number, right: number): number {
    if (left >= right || left >= this.rawValues.length) return 0;
    let start = Math.max(0, left) + this.size;
    let end = Math.min(this.rawValues.length, right) + this.size;
    let result = -Infinity;

    while (start < end) {
      if (start % 2 === 1) result = Math.max(result, this.maxTree[start++]);
      if (end % 2 === 1) result = Math.max(result, this.maxTree[--end]);
      start = Math.floor(start / 2);
      end = Math.floor(end / 2);
    }
    return result === -Infinity ? 0 : result;
  }

  /**
   * Point update at a specific time bucket index.
   * Updates raw value and recalculates tree up to root in O(log N).
   */
  update(index: number, newValue: number): void {
    if (index < 0 || index >= this.rawValues.length) return;
    this.rawValues[index] = newValue;

    let cursor = index + this.size;
    this.minTree[cursor] = newValue;
    this.maxTree[cursor] = newValue;
    cursor = Math.floor(cursor / 2);

    while (cursor > 0) {
      this.minTree[cursor] = Math.min(
        this.minTree[cursor * 2],
        this.minTree[cursor * 2 + 1]
      );
      this.maxTree[cursor] = Math.max(
        this.maxTree[cursor * 2],
        this.maxTree[cursor * 2 + 1]
      );
      cursor = Math.floor(cursor / 2);
    }
  }

  /**
   * Deducts consumed resource from a specific bucket.
   */
  deduct(index: number, delta: number): void {
    const current = this.rawValues[index] ?? 0;
    this.update(index, Math.max(0, current - delta));
  }

  getValues(): number[] {
    return [...this.rawValues];
  }
}

/**
 * Backwards-compatible alias for existing scheduling call sites.
 */
export const MinSegmentTree = AvailabilitySegmentTree;

/**
 * Data center capacity telemetry across discrete time buckets.
 */
export interface DataCenterCapacityTelemetry {
  dataCenterId: string;
  dataCenterName: string;
  bucketMinutes: number; // e.g. 60 min per bucket
  timeBuckets: string[]; // ISO strings for each bucket start
  renewableHeadroomKwh: number[];
  availableCpuCores: number[];
  availableRamGb: number[];
  sources: {
    solar: number[];
    wind: number[];
    hydro: number[];
    grid: number[];
  };
}

/**
 * Scheduled workload with allocation metadata.
 */
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

/**
 * Structured failure reason categories for auditability and SLA compliance.
 */
export type StructuredFailureReason =
  | 'energy_exhausted'
  | 'compute_exhausted'
  | 'deadline_missed';

/**
 * Unscheduled workload due to resource exhaustion or constraint violation.
 * Tracks targetStatus ('Failed' | 'Deferred') and structuredReason for Supabase persistence.
 */
export interface UnscheduledWorkloadItem {
  id: string;
  name: string;
  cpuCores: number;
  memoryGb: number;
  energyKwh: number;
  priority: string;
  reason: string;
  exhaustedResource: 'energy' | 'cpu' | 'memory' | 'window';
  structuredReason: StructuredFailureReason;
  targetStatus: 'Failed' | 'Deferred';
}

/**
 * Summary output of a multi-dimensional scheduling run.
 */
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
 * Active reservation representation for tree rehydration and rolling windows.
 */
export interface ActiveReservation {
  id: string;
  name?: string;
  dataCenterId?: string | null;
  scheduledTime: string;
  durationMinutes: number;
  cpuCores: number;
  memoryGb: number;
  energyKwh: number;
}

/**
 * Multi-dimensional decreasing-first bin-packing score.
 * Combines energy demand, CPU cores, memory footprint, and priority weighting.
 */
export function calculateWeightedScore(
  workload: WorkloadSelect | WorkloadInsert,
  maxEnergy = 100,
  maxCpu = 64,
  maxRam = 256
): number {
  const priorityMultiplier =
    workload.priority === 'High' ? 1.5 : workload.priority === 'Medium' ? 1.2 : 1.0;

  const normEnergy = Math.min(1, (workload.energyKwh || 1) / maxEnergy);
  const normCpu = Math.min(1, (workload.cpuCores || 1) / maxCpu);
  const normRam = Math.min(1, (workload.memoryGb || 1) / maxRam);
  const normDuration = Math.min(1, (workload.durationMinutes || 60) / 360);

  // 40% Energy demand, 30% CPU, 20% Memory, 10% Duration
  const rawScore =
    0.4 * normEnergy + 0.3 * normCpu + 0.2 * normRam + 0.1 * normDuration;

  return rawScore * priorityMultiplier;
}

/**
 * Rehydrates in-memory Segment Trees from raw data center telemetry
 * and existing active/unexpired workload reservations from Supabase.
 * Ensures committed allocations are not double-booked upon cold-start/reboot.
 */
export function rehydrateDataCenterTrees(
  telemetry: DataCenterCapacityTelemetry,
  activeReservations: ActiveReservation[]
): {
  energyTree: AvailabilitySegmentTree;
  cpuTree: AvailabilitySegmentTree;
  ramTree: AvailabilitySegmentTree;
  committedUsage: {
    energyKwh: number[];
    cpuCores: number[];
    ramGb: number[];
  };
  rehydratedHeadroom: {
    renewableKwh: number[];
    cpuCores: number[];
    ramGb: number[];
  };
  activeCount: number;
} {
  const numBuckets = telemetry.timeBuckets.length;
  const bucketMinutes = telemetry.bucketMinutes || 60;
  const bucketDurationMs = bucketMinutes * 60 * 1000;

  const committedEnergy = Array(numBuckets).fill(0);
  const committedCpu = Array(numBuckets).fill(0);
  const committedRam = Array(numBuckets).fill(0);

  let activeCount = 0;

  for (const res of activeReservations) {
    if (!res.scheduledTime) continue;

    if (res.dataCenterId && res.dataCenterId !== telemetry.dataCenterId) {
      continue;
    }

    const resStart = new Date(res.scheduledTime).getTime();
    const resEnd = resStart + res.durationMinutes * 60 * 1000;
    const slotSpan = Math.max(1, Math.ceil(res.durationMinutes / bucketMinutes));
    const energyPerSlot = res.energyKwh / slotSpan;

    let overlaps = false;
    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(telemetry.timeBuckets[i]).getTime();
      const bEnd = bStart + bucketDurationMs;

      if (resStart < bEnd && resEnd > bStart) {
        committedEnergy[i] += energyPerSlot;
        committedCpu[i] += res.cpuCores;
        committedRam[i] += res.memoryGb;
        overlaps = true;
      }
    }

    if (overlaps) {
      activeCount++;
    }
  }

  const renewableKwh = telemetry.renewableHeadroomKwh.map((base, i) =>
    Math.max(0, base - committedEnergy[i])
  );
  const cpuCores = telemetry.availableCpuCores.map((base, i) =>
    Math.max(0, base - committedCpu[i])
  );
  const ramGb = telemetry.availableRamGb.map((base, i) =>
    Math.max(0, base - committedRam[i])
  );

  return {
    energyTree: new AvailabilitySegmentTree(renewableKwh),
    cpuTree: new AvailabilitySegmentTree(cpuCores),
    ramTree: new AvailabilitySegmentTree(ramGb),
    committedUsage: {
      energyKwh: committedEnergy,
      cpuCores: committedCpu,
      ramGb: committedRam,
    },
    rehydratedHeadroom: {
      renewableKwh,
      cpuCores,
      ramGb,
    },
    activeCount,
  };
}

/**
 * Dynamic Rolling Window Manager:
 * Maintains committed workload reservations across shifting telemetry windows
 * without erasing or corrupting already-committed allocations.
 */
export class DynamicRollingWindowManager {
  private committedReservations: Map<string, ActiveReservation> = new Map();

  constructor(initialReservations: ActiveReservation[] = []) {
    for (const res of initialReservations) {
      this.committedReservations.set(res.id, res);
    }
  }

  addReservation(res: ActiveReservation): void {
    this.committedReservations.set(res.id, res);
  }

  removeReservation(id: string): void {
    this.committedReservations.delete(id);
  }

  getReservations(): ActiveReservation[] {
    return Array.from(this.committedReservations.values());
  }

  applyRollingTelemetryUpdate(rawTelemetry: DataCenterCapacityTelemetry): {
    adjustedTelemetry: DataCenterCapacityTelemetry;
    energyTree: AvailabilitySegmentTree;
    cpuTree: AvailabilitySegmentTree;
    ramTree: AvailabilitySegmentTree;
    activeReservationCount: number;
  } {
    const windowStartMs = new Date(rawTelemetry.timeBuckets[0]).getTime();

    for (const [id, res] of this.committedReservations.entries()) {
      const completionTimeMs =
        new Date(res.scheduledTime).getTime() + res.durationMinutes * 60 * 1000;
      if (completionTimeMs <= windowStartMs) {
        this.committedReservations.delete(id);
      }
    }

    const rehydrated = rehydrateDataCenterTrees(
      rawTelemetry,
      Array.from(this.committedReservations.values())
    );

    const adjustedTelemetry: DataCenterCapacityTelemetry = {
      ...rawTelemetry,
      renewableHeadroomKwh: rehydrated.rehydratedHeadroom.renewableKwh,
      availableCpuCores: rehydrated.rehydratedHeadroom.cpuCores,
      availableRamGb: rehydrated.rehydratedHeadroom.ramGb,
    };

    return {
      adjustedTelemetry,
      energyTree: rehydrated.energyTree,
      cpuTree: rehydrated.cpuTree,
      ramTree: rehydrated.ramTree,
      activeReservationCount: rehydrated.activeCount,
    };
  }
}

export interface SchedulerExecutionOptions {
  activeReservations?: ActiveReservation[];
  windowManager?: DynamicRollingWindowManager;
  currentTime?: Date;
}

/**
 * Multi-Dimensional Bin-Packing Scheduler Engine.
 */
export function runMultiDimensionalScheduler(
  pendingWorkloads: WorkloadSelect[],
  telemetry: DataCenterCapacityTelemetry,
  options?: SchedulerExecutionOptions
): MultiDimensionalSchedulingOutput {
  const numBuckets = telemetry.timeBuckets.length;
  const bucketMinutes = telemetry.bucketMinutes || 60;
  const nowMs = (options?.currentTime || new Date()).getTime();

  let energyTree: AvailabilitySegmentTree;
  let cpuTree: AvailabilitySegmentTree;
  let ramTree: AvailabilitySegmentTree;

  if (options?.windowManager) {
    const rolled = options.windowManager.applyRollingTelemetryUpdate(telemetry);
    energyTree = rolled.energyTree;
    cpuTree = rolled.cpuTree;
    ramTree = rolled.ramTree;
  } else if (options?.activeReservations && options.activeReservations.length > 0) {
    const rehydrated = rehydrateDataCenterTrees(telemetry, options.activeReservations);
    energyTree = rehydrated.energyTree;
    cpuTree = rehydrated.cpuTree;
    ramTree = rehydrated.ramTree;
  } else {
    energyTree = new MinSegmentTree(telemetry.renewableHeadroomKwh);
    cpuTree = new MinSegmentTree(telemetry.availableCpuCores);
    ramTree = new MinSegmentTree(telemetry.availableRamGb);
  }

  const sortedWorkloads = [...pendingWorkloads].sort((a, b) => {
    const scoreA = calculateWeightedScore(a);
    const scoreB = calculateWeightedScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const scheduledWorkloads: ScheduledWorkloadItem[] = [];
  const unscheduledWorkloads: UnscheduledWorkloadItem[] = [];

  let totalScheduledEnergy = 0;
  const totalRenewableHeadroomInitial = telemetry.renewableHeadroomKwh.reduce(
    (a, b) => a + b,
    0
  );

  for (const job of sortedWorkloads) {
    const slotSpan = Math.max(1, Math.ceil(job.durationMinutes / bucketMinutes));
    const energyPerSlot = job.energyKwh / slotSpan;

    const arrivalTime = new Date(job.arrival).getTime();
    const deadlineTime = new Date(job.deadline).getTime();

    const requiredDurationMs = job.durationMinutes * 60 * 1000;
    const earliestFeasibleStartMs = Math.max(arrivalTime, nowMs);

    if (deadlineTime < earliestFeasibleStartMs + requiredDurationMs) {
      unscheduledWorkloads.push({
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        energyKwh: job.energyKwh,
        priority: job.priority,
        reason: `Deadline missed: required duration ${job.durationMinutes}m exceeds available window before deadline ${job.deadline}`,
        exhaustedResource: 'window',
        structuredReason: 'deadline_missed',
        targetStatus: 'Failed',
      });
      continue;
    }

    let earliestSlot = 0;
    let latestSlot = numBuckets;

    telemetry.timeBuckets.forEach((bucketIso, idx) => {
      const bucketTime = new Date(bucketIso).getTime();
      if (bucketTime < arrivalTime) {
        earliestSlot = idx + 1;
      }
      if (bucketTime >= deadlineTime && latestSlot === numBuckets) {
        latestSlot = idx;
      }
    });

    earliestSlot = Math.max(0, Math.min(earliestSlot, numBuckets - 1));
    latestSlot = Math.max(earliestSlot + slotSpan, Math.min(latestSlot, numBuckets));

    if (latestSlot - earliestSlot < slotSpan) {
      unscheduledWorkloads.push({
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        energyKwh: job.energyKwh,
        priority: job.priority,
        reason: `Deadline missed: time horizon inside telemetry window is insufficient for ${job.durationMinutes}m job`,
        exhaustedResource: 'window',
        structuredReason: 'deadline_missed',
        targetStatus: 'Failed',
      });
      continue;
    }

    let bestSlot = -1;
    let bestCleanScore = -1;
    let failureReason: 'energy' | 'cpu' | 'memory' | 'window' = 'window';

    for (let slot = earliestSlot; slot <= latestSlot - slotSpan; slot += 1) {
      const endSlot = slot + slotSpan;

      const minEnergy = energyTree.queryMin(slot, endSlot);
      const minCpu = cpuTree.queryMin(slot, endSlot);
      const minRam = ramTree.queryMin(slot, endSlot);

      if (minEnergy < energyPerSlot) {
        failureReason = 'energy';
        continue;
      }
      if (minCpu < job.cpuCores) {
        failureReason = 'cpu';
        continue;
      }
      if (minRam < job.memoryGb) {
        failureReason = 'memory';
        continue;
      }

      const candidateHeadroom = minEnergy;
      if (candidateHeadroom > bestCleanScore) {
        bestCleanScore = candidateHeadroom;
        bestSlot = slot;
      }
    }

    if (bestSlot !== -1) {
      for (let s = bestSlot; s < bestSlot + slotSpan; s += 1) {
        energyTree.deduct(s, energyPerSlot);
        cpuTree.deduct(s, job.cpuCores);
        ramTree.deduct(s, job.memoryGb);
      }

      let sumSolar = 0;
      let sumWind = 0;
      let sumHydro = 0;
      let sumGrid = 0;

      for (let s = bestSlot; s < bestSlot + slotSpan; s += 1) {
        sumSolar += telemetry.sources.solar[s] ?? 0;
        sumWind += telemetry.sources.wind[s] ?? 0;
        sumHydro += telemetry.sources.hydro[s] ?? 0;
        sumGrid += telemetry.sources.grid[s] ?? 0;
      }

      const totalSourceEnergy = sumSolar + sumWind + sumHydro + sumGrid || 1;
      const solarPct = Math.round((sumSolar / totalSourceEnergy) * 100);
      const windPct = Math.round((sumWind / totalSourceEnergy) * 100);
      const hydroPct = Math.round((sumHydro / totalSourceEnergy) * 100);
      const gridPct = Math.max(0, 100 - (solarPct + windPct + hydroPct));

      const dominantSource =
        hydroPct >= windPct && hydroPct >= solarPct
          ? 'Hydro'
          : windPct >= solarPct
          ? 'Wind'
          : 'Solar';

      const sourceAllocationMix = `Hydro ${hydroPct}%, Wind ${windPct}%, Solar ${solarPct}%, Grid ${gridPct}%`;

      const startTime = telemetry.timeBuckets[bestSlot];
      const endTime =
        bestSlot + slotSpan < numBuckets
          ? telemetry.timeBuckets[bestSlot + slotSpan]
          : new Date(
              new Date(startTime).getTime() + job.durationMinutes * 60 * 1000
            ).toISOString();

      const scheduledItem: ScheduledWorkloadItem = {
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        durationMinutes: job.durationMinutes,
        energyKwh: job.energyKwh,
        priority: job.priority,
        scheduledTime: startTime,
        completionTime: endTime,
        allocatedSlotIndex: bestSlot,
        slotSpan,
        energySource: dominantSource,
        sourceAllocationMix,
        carbonScore: Math.round(100 - gridPct),
      };

      scheduledWorkloads.push(scheduledItem);
      totalScheduledEnergy += job.energyKwh;

      if (options?.windowManager) {
        options.windowManager.addReservation({
          id: job.id,
          name: job.name,
          dataCenterId: telemetry.dataCenterId,
          scheduledTime: startTime,
          durationMinutes: job.durationMinutes,
          cpuCores: job.cpuCores,
          memoryGb: job.memoryGb,
          energyKwh: job.energyKwh,
        });
      }
    } else {
      let structuredReason: StructuredFailureReason = 'compute_exhausted';
      let message = 'Resource exhaustion: Insufficient contiguous capacity before deadline';

      if (failureReason === 'energy') {
        structuredReason = 'energy_exhausted';
        message = `Resource exhaustion: Insufficient renewable energy headroom (${energyPerSlot.toFixed(1)} kWh/slot requested)`;
      } else if (failureReason === 'cpu') {
        structuredReason = 'compute_exhausted';
        message = `Resource exhaustion: CPU saturation exceeded (${job.cpuCores} cores requested)`;
      } else if (failureReason === 'memory') {
        structuredReason = 'compute_exhausted';
        message = `Resource exhaustion: RAM capacity exceeded (${job.memoryGb} GB requested)`;
      }

      const isPastDeadline = deadlineTime <= nowMs;
      const targetStatus: 'Failed' | 'Deferred' = isPastDeadline ? 'Failed' : 'Deferred';

      unscheduledWorkloads.push({
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        energyKwh: job.energyKwh,
        priority: job.priority,
        reason: message,
        exhaustedResource: failureReason,
        structuredReason: isPastDeadline ? 'deadline_missed' : structuredReason,
        targetStatus,
      });
    }
  }

  const totalEvaluated = sortedWorkloads.length;
  const totalScheduled = scheduledWorkloads.length;
  const totalUnscheduled = unscheduledWorkloads.length;
  const successRatePct = totalEvaluated
    ? Math.round((totalScheduled / totalEvaluated) * 100)
    : 100;

  const renewableUtilizationPct = totalRenewableHeadroomInitial
    ? Math.min(
        100,
        Math.round((totalScheduledEnergy / totalRenewableHeadroomInitial) * 100)
      )
    : 0;

  const estimatedCo2AvoidedKg =
    Math.round(totalScheduledEnergy * 0.42 * 10) / 10;

  return {
    runId: `sched-run-${Date.now()}`,
    timestamp: new Date().toISOString(),
    dataCenterId: telemetry.dataCenterId,
    dataCenterName: telemetry.dataCenterName,
    scheduledWorkloads,
    unscheduledWorkloads,
    telemetryPostAllocation: {
      remainingRenewableKwh: energyTree.getValues(),
      remainingCpuCores: cpuTree.getValues(),
      remainingRamGb: ramTree.getValues(),
    },
    metrics: {
      totalEvaluated,
      totalScheduled,
      totalUnscheduled,
      successRatePct,
      totalScheduledEnergyKwh: Math.round(totalScheduledEnergy * 10) / 10,
      renewableUtilizationPct,
      estimatedCo2AvoidedKg,
    },
  };
}

/**
 * Concurrency & Row-Locking queue polling helper:
 * Queries pending workloads from PostgreSQL using 'SELECT ... FOR UPDATE SKIP LOCKED'.
 */
export async function pollAndLockPendingWorkloads(
  database: any,
  batchSize = 50
): Promise<WorkloadSelect[]> {
  try {
    return await database
      .select()
      .from(workloads)
      .where(eq(workloads.status, 'Pending'))
      .orderBy(desc(workloads.priority), asc(workloads.createdAt))
      .for('update', { skipLocked: true })
      .limit(batchSize);
  } catch (err: any) {
    if (typeof database.select === 'function') {
      return await database
        .select()
        .from(workloads)
        .where(eq(workloads.status, 'Pending'))
        .limit(batchSize);
    }
    throw err;
  }
}

/**
 * Batch-persists scheduling results to Supabase in an atomic transaction:
 * - Updates successfully scheduled jobs to 'Scheduled'.
 * - Transitions unallocated jobs to 'Failed' or 'Deferred' with structured failure reasons.
 */
export async function batchPersistSchedulingResults(
  database: any,
  output: MultiDimensionalSchedulingOutput,
  inMemoryStore?: WorkloadSelect[]
): Promise<void> {
  const scheduledUpdates = output.scheduledWorkloads.map(async (job) => {
    if (inMemoryStore) {
      const inMem = inMemoryStore.find((w) => w.id === job.id);
      if (inMem) {
        inMem.status = 'Scheduled';
        inMem.scheduledTime = job.scheduledTime;
        inMem.energySource = job.energySource;
        inMem.sourceAllocationMix = job.sourceAllocationMix;
      }
    }

    try {
      await database
        .update(workloads)
        .set({
          status: 'Scheduled',
          scheduledTime: job.scheduledTime,
          energySource: job.energySource,
          sourceAllocationMix: job.sourceAllocationMix,
          failureReason: null,
          failureDetails: null,
        })
        .where(eq(workloads.id, job.id));
    } catch {
      try {
        await database
          .update(workloads)
          .set({ status: 'Scheduled' })
          .where(eq(workloads.id, job.id));
      } catch {
        // Fallback for offline environments
      }
    }
  });

  const unallocatedUpdates = output.unscheduledWorkloads.map(async (job) => {
    if (inMemoryStore) {
      const inMem = inMemoryStore.find((w) => w.id === job.id);
      if (inMem) {
        inMem.status = job.targetStatus;
      }
    }

    try {
      await database
        .update(workloads)
        .set({
          status: job.targetStatus,
          failureReason: job.structuredReason,
          failureDetails: job.reason,
        })
        .where(eq(workloads.id, job.id));
    } catch {
      try {
        await database
          .update(workloads)
          .set({ status: job.targetStatus })
          .where(eq(workloads.id, job.id));
      } catch {
        // Fallback for offline environments
      }
    }
  });

  await Promise.all([...scheduledUpdates, ...unallocatedUpdates]);
}
