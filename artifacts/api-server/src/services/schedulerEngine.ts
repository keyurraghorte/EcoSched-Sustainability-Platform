import type { WorkloadSelect } from '@workspace/db';

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
 * Unscheduled workload due to resource exhaustion or constraint violation.
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
 * Multi-dimensional decreasing-first bin-packing score.
 * Combines energy demand, CPU cores, memory footprint, and priority weighting.
 */
export function calculateWeightedScore(
  workload: WorkloadSelect,
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
 * Multi-Dimensional Bin-Packing Scheduler Engine.
 * Concurrently verifies energy headroom, CPU saturation, and RAM capacity using Segment Trees.
 */
export function runMultiDimensionalScheduler(
  pendingWorkloads: WorkloadSelect[],
  telemetry: DataCenterCapacityTelemetry
): MultiDimensionalSchedulingOutput {
  const numBuckets = telemetry.timeBuckets.length;
  const bucketMinutes = telemetry.bucketMinutes || 60;

  // Initialize Segment Trees for each constraint dimension
  const energyTree = new MinSegmentTree(telemetry.renewableHeadroomKwh);
  const cpuTree = new MinSegmentTree(telemetry.availableCpuCores);
  const ramTree = new MinSegmentTree(telemetry.availableRamGb);

  // Sort pending workloads by multi-dimensional weighted score (decreasing order)
  const sortedWorkloads = [...pendingWorkloads].sort((a, b) => {
    const scoreA = calculateWeightedScore(a);
    const scoreB = calculateWeightedScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Tie-break with earliest deadline
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const scheduledWorkloads: ScheduledWorkloadItem[] = [];
  const unscheduledWorkloads: UnscheduledWorkloadItem[] = [];

  let totalScheduledEnergy = 0;
  let totalRenewableHeadroomInitial = telemetry.renewableHeadroomKwh.reduce(
    (a, b) => a + b,
    0
  );

  // Scheduling loop for each job
  for (const job of sortedWorkloads) {
    const slotSpan = Math.max(1, Math.ceil(job.durationMinutes / bucketMinutes));
    const energyPerSlot = job.energyKwh / slotSpan;

    // Determine arrival and deadline slot boundaries
    const arrivalTime = new Date(job.arrival).getTime();
    const deadlineTime = new Date(job.deadline).getTime();

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

    // Find the best contiguous slot window that satisfies all 3 constraints simultaneously
    let bestSlot = -1;
    let bestCleanScore = -1;
    let failureReason: 'energy' | 'cpu' | 'memory' | 'window' = 'window';

    for (let slot = earliestSlot; slot <= latestSlot - slotSpan; slot += 1) {
      const endSlot = slot + slotSpan;

      const minEnergy = energyTree.queryMin(slot, endSlot);
      const minCpu = cpuTree.queryMin(slot, endSlot);
      const minRam = ramTree.queryMin(slot, endSlot);

      // Verify all 3 constraints simultaneously
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

      // Carbon-aware placement: pick the window with the highest renewable energy headroom
      const candidateHeadroom = minEnergy;
      if (candidateHeadroom > bestCleanScore) {
        bestCleanScore = candidateHeadroom;
        bestSlot = slot;
      }
    }

    if (bestSlot !== -1) {
      // Allocate contiguous window and deduct resources
      for (let s = bestSlot; s < bestSlot + slotSpan; s += 1) {
        energyTree.deduct(s, energyPerSlot);
        cpuTree.deduct(s, job.cpuCores);
        ramTree.deduct(s, job.memoryGb);
      }

      // Compute source allocation mix for this window
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

      scheduledWorkloads.push({
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
      });

      totalScheduledEnergy += job.energyKwh;
    } else {
      let message = 'Resource exhaustion: Insufficient contiguous capacity before deadline';
      if (failureReason === 'energy') {
        message = 'Resource exhaustion: Insufficient renewable energy headroom in available window';
      } else if (failureReason === 'cpu') {
        message = `Resource exhaustion: CPU saturation exceeded (${job.cpuCores} cores requested)`;
      } else if (failureReason === 'memory') {
        message = `Resource exhaustion: RAM capacity exceeded (${job.memoryGb} GB requested)`;
      }

      unscheduledWorkloads.push({
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        energyKwh: job.energyKwh,
        priority: job.priority,
        reason: message,
        exhaustedResource: failureReason,
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

  // Emission factor calculation: ~0.42 kg CO2 per kWh grid baseline
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
