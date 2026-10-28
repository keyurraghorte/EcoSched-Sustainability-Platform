import { eq } from 'drizzle-orm';
import { db, workloads, type WorkloadSelect } from '@workspace/db';
import {
  AvailabilitySegmentTree,
  calculateWeightedScore,
  type DataCenterCapacityTelemetry,
  type ScheduledWorkloadItem,
  type UnscheduledWorkloadItem,
} from '../services/schedulerEngine';
import { inMemoryWorkloadStore } from '../routes/workloads';
import { env } from '../config/env';

export interface DataCenterProfile {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zone: string;
  baseCarbonIntensityGPerKwh: number;
  baseCapacity: {
    solarMax: number;
    windMax: number;
    hydroBase: number;
    gridCap: number;
    cpuCores: number;
    ramGb: number;
  };
}

export const ACTIVE_DATA_CENTERS: DataCenterProfile[] = [
  {
    id: 'oslo-fjord-1',
    name: 'Oslo Fjord 01',
    lat: 59.9139,
    lon: 10.7522,
    zone: 'NO-NO1',
    baseCarbonIntensityGPerKwh: 28, // Predominantly hydro & wind
    baseCapacity: {
      solarMax: 240,
      windMax: 360,
      hydroBase: 420,
      gridCap: 90,
      cpuCores: 64,
      ramGb: 256,
    },
  },
  {
    id: 'stockholm-vortex-3',
    name: 'Stockholm Vortex 03',
    lat: 59.3293,
    lon: 18.0686,
    zone: 'SE-SE3',
    baseCarbonIntensityGPerKwh: 34, // Hydro, nuclear, wind
    baseCapacity: {
      solarMax: 210,
      windMax: 440,
      hydroBase: 480,
      gridCap: 80,
      cpuCores: 128,
      ramGb: 512,
    },
  },
  {
    id: 'rotterdam-delta-2',
    name: 'Rotterdam Delta 02',
    lat: 51.9244,
    lon: 4.4777,
    zone: 'NL',
    baseCarbonIntensityGPerKwh: 295, // Gas + solar/wind transition
    baseCapacity: {
      solarMax: 320,
      windMax: 380,
      hydroBase: 50,
      gridCap: 250,
      cpuCores: 96,
      ramGb: 384,
    },
  },
];

export interface LiveTelemetrySnapshot {
  dataCenter: DataCenterProfile;
  carbonIntensityGPerKwh: number;
  weatherSource: 'Open-Meteo' | 'Fallback-Model';
  carbonSource: 'ElectricityMaps' | 'Regional-Baseline';
  telemetry: DataCenterCapacityTelemetry;
}

export interface CronRunResult {
  runId: string;
  timestamp: string;
  durationMs: number;
  telemetrySnapshots: {
    dataCenterId: string;
    dataCenterName: string;
    carbonIntensityGPerKwh: number;
    weatherSource: string;
    carbonSource: string;
    totalCleanHeadroomKwh: number;
  }[];
  totalPendingEvaluated: number;
  totalScheduled: number;
  totalUnscheduled: number;
  scheduledByFacility: Record<string, number>;
  crossRegionRoutings: number;
  estimatedCo2AvoidedKg: number;
  scheduledWorkloads: (ScheduledWorkloadItem & { facilityId: string; facilityName: string })[];
  unscheduledWorkloads: UnscheduledWorkloadItem[];
}

/**
 * 1. Fetch fresh live weather telemetry from Open-Meteo.
 */
export async function fetchLiveWeather(lat: number, lon: number): Promise<{
  windSpeeds: number[];
  solarIrradiances: number[];
  source: 'Open-Meteo' | 'Fallback-Model';
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `${env.OPEN_METEO_BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,direct_normal_irradiance&forecast_days=2`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as {
        hourly?: {
          wind_speed_10m?: number[];
          direct_normal_irradiance?: number[];
        };
      };
      const windSpeeds: number[] = data?.hourly?.wind_speed_10m?.slice(0, 24) || [];
      const solarIrradiances: number[] = data?.hourly?.direct_normal_irradiance?.slice(0, 24) || [];

      if (windSpeeds.length >= 24 && solarIrradiances.length >= 24) {
        return { windSpeeds, solarIrradiances, source: 'Open-Meteo' };
      }
    }
  } catch {
    // Network timeout or offline fallback
  }

  // Resilient fallback model: diurnal solar curve + Nordic wind profile
  const baseDate = new Date();
  const windSpeeds: number[] = [];
  const solarIrradiances: number[] = [];

  for (let i = 0; i < 24; i++) {
    const hour = (baseDate.getHours() + i) % 24;
    const solarFactor = Math.max(0, Math.sin(((hour - 6) / 14) * Math.PI));
    solarIrradiances.push(Math.round(solarFactor * 850));
    windSpeeds.push(Math.round(18 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.2) * 5));
  }

  return { windSpeeds, solarIrradiances, source: 'Fallback-Model' };
}

/**
 * 2. Fetch live carbon intensity from ElectricityMaps API (with regional baseline fallback).
 */
export async function fetchLiveCarbonIntensity(zone: string, fallbackBaseline: number): Promise<{
  carbonIntensity: number;
  source: 'ElectricityMaps' | 'Regional-Baseline';
}> {
  if (env.ELECTRICITY_MAPS_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`, {
        headers: { 'auth-token': env.ELECTRICITY_MAPS_API_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as { carbonIntensity?: number };
        if (typeof data?.carbonIntensity === 'number') {
          return { carbonIntensity: data.carbonIntensity, source: 'ElectricityMaps' };
        }
      }
    } catch {
      // Graceful fallback on network/rate-limit error
    }
  }

  // Slight diurnal variation on regional baseline
  const jitter = Math.sin(new Date().getHours()) * 3;
  return {
    carbonIntensity: Math.max(10, Math.round(fallbackBaseline + jitter)),
    source: 'Regional-Baseline',
  };
}

/**
 * Builds real-time 24-hour capacity telemetry for a given data center.
 */
export async function buildDataCenterTelemetry(
  dc: DataCenterProfile
): Promise<LiveTelemetrySnapshot> {
  const [weather, carbon] = await Promise.all([
    fetchLiveWeather(dc.lat, dc.lon),
    fetchLiveCarbonIntensity(dc.zone, dc.baseCarbonIntensityGPerKwh),
  ]);

  const baseDate = new Date();
  baseDate.setMinutes(0, 0, 0);

  const timeBuckets: string[] = [];
  const solar: number[] = [];
  const wind: number[] = [];
  const hydro: number[] = [];
  const grid: number[] = [];
  const renewableHeadroomKwh: number[] = [];
  const availableCpuCores: number[] = [];
  const availableRamGb: number[] = [];

  for (let i = 0; i < 24; i++) {
    timeBuckets.push(new Date(baseDate.getTime() + i * 3600 * 1000).toISOString());

    // Compute solar output scaled by Open-Meteo irradiance (0-1000 W/m2)
    const irr = weather.solarIrradiances[i] || 0;
    const s = Math.round((irr / 1000) * dc.baseCapacity.solarMax);

    // Compute wind output scaled by Open-Meteo wind speed (0-40 km/h)
    const ws = weather.windSpeeds[i] || 15;
    const windFactor = Math.min(1.2, Math.max(0.2, ws / 25));
    const w = Math.round(dc.baseCapacity.windMax * windFactor);

    // Baseload hydro
    const h = Math.round(dc.baseCapacity.hydroBase + Math.cos(i * 0.4) * 20);

    // Grid reserve
    const g = dc.baseCapacity.gridCap;

    solar.push(s);
    wind.push(w);
    hydro.push(h);
    grid.push(g);
    renewableHeadroomKwh.push(s + w + h);

    // Available CPU cores & RAM after background cluster utilization
    const backgroundPct = 0.15 + Math.sin(i * 0.5) * 0.08;
    const availableCores = Math.max(8, Math.round(dc.baseCapacity.cpuCores * (1 - backgroundPct)));
    const availableMemory = Math.max(32, Math.round(dc.baseCapacity.ramGb * (1 - backgroundPct)));

    availableCpuCores.push(availableCores);
    availableRamGb.push(availableMemory);
  }

  const telemetry: DataCenterCapacityTelemetry = {
    dataCenterId: dc.id,
    dataCenterName: dc.name,
    bucketMinutes: 60,
    timeBuckets,
    renewableHeadroomKwh,
    availableCpuCores,
    availableRamGb,
    sources: { solar, wind, hydro, grid },
  };

  return {
    dataCenter: dc,
    carbonIntensityGPerKwh: carbon.carbonIntensity,
    weatherSource: weather.source,
    carbonSource: carbon.source,
    telemetry,
  };
}

/**
 * Automated 4-Step Production Cron Scheduling Pipeline.
 * 1. Fetch fresh live telemetry for all data centers.
 * 2. Query all 'Pending' workloads from Supabase.
 * 3. Execute multi-dimensional interval scheduler & cross-region routing.
 * 4. Batch-update workload statuses in Supabase to 'Scheduled'.
 */
export async function executeCronPipelineNow(): Promise<CronRunResult> {
  const startTime = Date.now();
  const runId = `cron-run-${startTime}`;

  console.log(`[EcoSched Cron] 🚀 Executing automated scheduling pipeline (${runId})...`);

  // Step 1: Fetch fresh live telemetry across all active facilities in parallel
  const snapshots = await Promise.all(
    ACTIVE_DATA_CENTERS.map((dc) => buildDataCenterTelemetry(dc))
  );

  // Step 2: Query all 'Pending' workloads from Supabase (with resilient queue fallback)
  let pendingWorkloads: WorkloadSelect[] = [];
  try {
    pendingWorkloads = await db
      .select()
      .from(workloads)
      .where(eq(workloads.status, 'Pending'));
  } catch (err: any) {
    console.warn('[EcoSched Cron] Database query failed; using in-memory store:', err?.message);
    pendingWorkloads = inMemoryWorkloadStore.filter((w) => w.status === 'Pending');
  }

  if (pendingWorkloads.length === 0) {
    console.log('[EcoSched Cron] ℹ️ Zero pending workloads in queue. Telemetry refreshed.');
    return {
      runId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      telemetrySnapshots: snapshots.map((s) => ({
        dataCenterId: s.dataCenter.id,
        dataCenterName: s.dataCenter.name,
        carbonIntensityGPerKwh: s.carbonIntensityGPerKwh,
        weatherSource: s.weatherSource,
        carbonSource: s.carbonSource,
        totalCleanHeadroomKwh: s.telemetry.renewableHeadroomKwh.reduce((a, b) => a + b, 0),
      })),
      totalPendingEvaluated: 0,
      totalScheduled: 0,
      totalUnscheduled: 0,
      scheduledByFacility: {},
      crossRegionRoutings: 0,
      estimatedCo2AvoidedKg: 0,
      scheduledWorkloads: [],
      unscheduledWorkloads: [],
    };
  }

  // Step 3: Execute cross-region routing with multi-dimensional interval scheduling
  // Sort data centers by lowest carbon intensity first (greenest destination)
  const rankedFacilities = [...snapshots].sort(
    (a, b) => a.carbonIntensityGPerKwh - b.carbonIntensityGPerKwh
  );

  // Initialize Segment Trees for each facility to support simultaneous deduction
  const facilityTrees = new Map<
    string,
    {
      snapshot: LiveTelemetrySnapshot;
      energyTree: AvailabilitySegmentTree;
      cpuTree: AvailabilitySegmentTree;
      ramTree: AvailabilitySegmentTree;
    }
  >();

  for (const snap of rankedFacilities) {
    facilityTrees.set(snap.dataCenter.id, {
      snapshot: snap,
      energyTree: new AvailabilitySegmentTree(snap.telemetry.renewableHeadroomKwh),
      cpuTree: new AvailabilitySegmentTree(snap.telemetry.availableCpuCores),
      ramTree: new AvailabilitySegmentTree(snap.telemetry.availableRamGb),
    });
  }

  // Sort pending workloads by multi-dimensional score (decreasing order)
  const sortedJobs = [...pendingWorkloads].sort((a, b) => {
    const scoreA = calculateWeightedScore(a);
    const scoreB = calculateWeightedScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const scheduledWorkloads: (ScheduledWorkloadItem & {
    facilityId: string;
    facilityName: string;
  })[] = [];
  const unscheduledWorkloads: UnscheduledWorkloadItem[] = [];
  const scheduledByFacility: Record<string, number> = {};
  let crossRegionRoutings = 0;
  let totalEnergyScheduled = 0;

  for (const job of sortedJobs) {
    let placed = false;
    let failureReason: 'energy' | 'cpu' | 'memory' | 'window' = 'window';

    // Evaluate ranked clean facilities
    for (let fIdx = 0; fIdx < rankedFacilities.length; fIdx++) {
      const snap = rankedFacilities[fIdx];
      const trees = facilityTrees.get(snap.dataCenter.id)!;
      const bucketMinutes = snap.telemetry.bucketMinutes || 60;
      const numBuckets = snap.telemetry.timeBuckets.length;
      const slotSpan = Math.max(1, Math.ceil(job.durationMinutes / bucketMinutes));
      const energyPerSlot = job.energyKwh / slotSpan;

      const arrivalTime = new Date(job.arrival).getTime();
      const deadlineTime = new Date(job.deadline).getTime();

      let earliestSlot = 0;
      let latestSlot = numBuckets;

      snap.telemetry.timeBuckets.forEach((bucketIso, idx) => {
        const bucketTime = new Date(bucketIso).getTime();
        if (bucketTime < arrivalTime) earliestSlot = idx + 1;
        if (bucketTime >= deadlineTime && latestSlot === numBuckets) latestSlot = idx;
      });

      earliestSlot = Math.max(0, Math.min(earliestSlot, numBuckets - 1));
      latestSlot = Math.max(earliestSlot + slotSpan, Math.min(latestSlot, numBuckets));

      let bestSlot = -1;
      let bestHeadroom = -1;

      for (let slot = earliestSlot; slot <= latestSlot - slotSpan; slot++) {
        const endSlot = slot + slotSpan;
        const minEnergy = trees.energyTree.queryMin(slot, endSlot);
        const minCpu = trees.cpuTree.queryMin(slot, endSlot);
        const minRam = trees.ramTree.queryMin(slot, endSlot);

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

        if (minEnergy > bestHeadroom) {
          bestHeadroom = minEnergy;
          bestSlot = slot;
        }
      }

      if (bestSlot !== -1) {
        // Allocate contiguous slot and deduct from trees
        for (let s = bestSlot; s < bestSlot + slotSpan; s++) {
          trees.energyTree.deduct(s, energyPerSlot);
          trees.cpuTree.deduct(s, job.cpuCores);
          trees.ramTree.deduct(s, job.memoryGb);
        }

        // Calculate clean source mix
        let sumSolar = 0;
        let sumWind = 0;
        let sumHydro = 0;
        let sumGrid = 0;

        for (let s = bestSlot; s < bestSlot + slotSpan; s++) {
          sumSolar += snap.telemetry.sources.solar[s] ?? 0;
          sumWind += snap.telemetry.sources.wind[s] ?? 0;
          sumHydro += snap.telemetry.sources.hydro[s] ?? 0;
          sumGrid += snap.telemetry.sources.grid[s] ?? 0;
        }

        const totalSource = sumSolar + sumWind + sumHydro + sumGrid || 1;
        const solarPct = Math.round((sumSolar / totalSource) * 100);
        const windPct = Math.round((sumWind / totalSource) * 100);
        const hydroPct = Math.round((sumHydro / totalSource) * 100);
        const gridPct = Math.max(0, 100 - (solarPct + windPct + hydroPct));

        const dominant =
          hydroPct >= windPct && hydroPct >= solarPct
            ? 'Hydro'
            : windPct >= solarPct
            ? 'Wind'
            : 'Solar';

        const sourceAllocationMix = `Hydro ${hydroPct}%, Wind ${windPct}%, Solar ${solarPct}%, Grid ${gridPct}%`;
        const startTimeIso = snap.telemetry.timeBuckets[bestSlot];
        const endTimeIso =
          bestSlot + slotSpan < numBuckets
            ? snap.telemetry.timeBuckets[bestSlot + slotSpan]
            : new Date(new Date(startTimeIso).getTime() + job.durationMinutes * 60000).toISOString();

        scheduledWorkloads.push({
          id: job.id,
          name: job.name,
          cpuCores: job.cpuCores,
          memoryGb: job.memoryGb,
          durationMinutes: job.durationMinutes,
          energyKwh: job.energyKwh,
          priority: job.priority,
          scheduledTime: startTimeIso,
          completionTime: endTimeIso,
          allocatedSlotIndex: bestSlot,
          slotSpan,
          energySource: dominant,
          sourceAllocationMix,
          carbonScore: Math.round(100 - gridPct),
          facilityId: snap.dataCenter.id,
          facilityName: snap.dataCenter.name,
        });

        scheduledByFacility[snap.dataCenter.id] = (scheduledByFacility[snap.dataCenter.id] || 0) + 1;
        if (fIdx > 0) crossRegionRoutings++;
        totalEnergyScheduled += job.energyKwh;
        placed = true;
        break;
      }
    }

    if (!placed) {
      unscheduledWorkloads.push({
        id: job.id,
        name: job.name,
        cpuCores: job.cpuCores,
        memoryGb: job.memoryGb,
        energyKwh: job.energyKwh,
        priority: job.priority,
        reason: `Resource exhaustion across all regions: constraint failed on ${failureReason}`,
        exhaustedResource: failureReason,
      });
    }
  }

  // Step 4: Batch-update workload statuses in Supabase from 'Pending' to 'Scheduled'
  const updatePromises = scheduledWorkloads.map(async (job) => {
    // In-memory update
    const inMem = inMemoryWorkloadStore.find((w) => w.id === job.id);
    if (inMem) {
      inMem.status = 'Scheduled';
      inMem.scheduledTime = job.scheduledTime;
      inMem.energySource = job.energySource;
      inMem.sourceAllocationMix = job.sourceAllocationMix;
    }

    // Supabase update via Drizzle
    try {
      await db
        .update(workloads)
        .set({
          status: 'Scheduled',
          scheduledTime: job.scheduledTime,
          energySource: job.energySource,
          sourceAllocationMix: job.sourceAllocationMix,
        })
        .where(eq(workloads.id, job.id));
    } catch {
      try {
        await db
          .update(workloads)
          .set({ status: 'Scheduled' })
          .where(eq(workloads.id, job.id));
      } catch {
        // Safe fallback if DB is unconfigured
      }
    }
  });

  await Promise.all(updatePromises);

  const durationMs = Date.now() - startTime;
  const estimatedCo2AvoidedKg = Math.round(totalEnergyScheduled * 0.42 * 10) / 10;

  console.log(
    `[EcoSched Cron] ✅ Pipeline completed in ${durationMs}ms. Scheduled: ${scheduledWorkloads.length}, Unscheduled: ${unscheduledWorkloads.length}`
  );

  return {
    runId,
    timestamp: new Date().toISOString(),
    durationMs,
    telemetrySnapshots: snapshots.map((s) => ({
      dataCenterId: s.dataCenter.id,
      dataCenterName: s.dataCenter.name,
      carbonIntensityGPerKwh: s.carbonIntensityGPerKwh,
      weatherSource: s.weatherSource,
      carbonSource: s.carbonSource,
      totalCleanHeadroomKwh: s.telemetry.renewableHeadroomKwh.reduce((a, b) => a + b, 0),
    })),
    totalPendingEvaluated: sortedJobs.length,
    totalScheduled: scheduledWorkloads.length,
    totalUnscheduled: unscheduledWorkloads.length,
    scheduledByFacility,
    crossRegionRoutings,
    estimatedCo2AvoidedKg,
    scheduledWorkloads,
    unscheduledWorkloads,
  };
}

let cronIntervalHandle: NodeJS.Timeout | null = null;

/**
 * Starts the automated background cron scheduler on a recurring interval.
 * @param intervalMs Interval in milliseconds (default 3600000ms = 1 hour)
 */
export function startSchedulerCron(intervalMs = 3600000): void {
  if (cronIntervalHandle) {
    console.log('[EcoSched Cron] ℹ️ Background cron scheduler is already active.');
    return;
  }

  console.log(
    `[EcoSched Cron] ⏰ Starting automated recurring scheduler (interval: ${intervalMs / 1000}s)...`
  );

  cronIntervalHandle = setInterval(() => {
    executeCronPipelineNow().catch((err) => {
      console.error('[EcoSched Cron] ❌ Recurring scheduling cycle error:', err);
    });
  }, intervalMs);

  // Unref timer so it does not block clean Node process shutdown
  if (cronIntervalHandle.unref) {
    cronIntervalHandle.unref();
  }
}

/**
 * Stops the automated background cron scheduler.
 */
export function stopSchedulerCron(): void {
  if (cronIntervalHandle) {
    clearInterval(cronIntervalHandle);
    cronIntervalHandle = null;
    console.log('[EcoSched Cron] ⏹️ Background cron scheduler stopped.');
  }
}
