import { Router, type Request, type Response } from 'express';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db, workloads, type WorkloadSelect } from '@workspace/db';
import {
  runMultiDimensionalScheduler,
  pollAndLockPendingWorkloads,
  batchPersistSchedulingResults,
  type DataCenterCapacityTelemetry,
  type MultiDimensionalSchedulingOutput,
  type ActiveReservation,
} from '../services/schedulerEngine';
import { inMemoryWorkloadStore } from './workloads';

const router = Router();

/**
 * Generates telemetry profile for the active data center across 24 hourly buckets.
 */
const DC_NAME_MAP: Record<string, string> = {
  'oslo-fjord-1': 'Oslo Fjord 01',
  'rotterdam-delta-2': 'Rotterdam Delta 02',
  'stockholm-north-3': 'Stockholm North 03',
  'dublin-green-1': 'Dublin Green 01',
  'frankfurt-clean-2': 'Frankfurt Clean 02',
  'frankfurt-main-4': 'Frankfurt Main 04',
  'reykjavik-geo-1': 'Reykjavik Geothermal 01',
  'helsinki-wind-1': 'Helsinki Wind 01',
};

function formatDataCenterName(id: string): string {
  if (DC_NAME_MAP[id]) return DC_NAME_MAP[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function getActiveDataCenterTelemetry(dataCenterId = 'oslo-fjord-1', customName?: string): DataCenterCapacityTelemetry {
  const baseDate = new Date();
  baseDate.setMinutes(0, 0, 0);

  const hours = 24;
  const timeBuckets: string[] = [];
  const solar: number[] = [];
  const wind: number[] = [];
  const hydro: number[] = [];
  const grid: number[] = [];
  const renewableHeadroomKwh: number[] = [];
  const availableCpuCores: number[] = [];
  const availableRamGb: number[] = [];

  for (let i = 0; i < hours; i++) {
    const bucketTime = new Date(baseDate.getTime() + i * 60 * 60 * 1000).toISOString();
    timeBuckets.push(bucketTime);

    // Diurnal solar curve (peak ~11:00-15:00)
    const hourOfDay = (baseDate.getHours() + i) % 24;
    const solarFactor = Math.max(0, Math.sin(((hourOfDay - 6) / 14) * Math.PI));
    const s = Math.round(25 + solarFactor * 190);

    // Wind generation variability
    const w = Math.round(130 + Math.sin(i * 0.7) * 45 + Math.cos(i * 1.3) * 20);

    // Hydro baseload dispatch
    const h = Math.round(175 + Math.cos(i * 0.4) * 30);

    // Grid reserve
    const g = Math.max(15, Math.round(45 - solarFactor * 25));

    solar.push(s);
    wind.push(w);
    hydro.push(h);
    grid.push(g);

    // Total clean power headroom available
    renewableHeadroomKwh.push(s + w + h);

    // Compute saturation headroom (e.g., 64 CPU core cluster minus background load)
    const cpuHeadroom = Math.max(12, Math.round(64 - (14 + Math.sin(i * 0.5) * 8)));
    availableCpuCores.push(cpuHeadroom);

    // RAM capacity headroom (e.g., 256 GB cluster minus background memory)
    const ramHeadroom = Math.max(48, Math.round(256 - (50 + Math.cos(i * 0.6) * 20)));
    availableRamGb.push(ramHeadroom);
  }

  return {
    dataCenterId,
    dataCenterName: customName || formatDataCenterName(dataCenterId),
    bucketMinutes: 60,
    timeBuckets,
    renewableHeadroomKwh,
    availableCpuCores,
    availableRamGb,
    sources: { solar, wind, hydro, grid },
  };
}

/**
 * POST /api/schedule/run (and POST /run / POST /)
 * Fetches pending workloads with SELECT ... FOR UPDATE SKIP LOCKED,
 * rehydrates in-memory Segment Trees with unexpired committed reservations,
 * and atomically persists both scheduled and unallocated jobs to Supabase.
 */
async function handleSchedulingRun(req: Request, res: Response) {
  try {
    const dataCenterId = (req.body?.dataCenterId as string) || 'oslo-fjord-1';
    const dataCenterName = (req.body?.dataCenterName as string) || undefined;

    let pendingWorkloads: WorkloadSelect[] = [];
    try {
      pendingWorkloads = await pollAndLockPendingWorkloads(db, 50);
    } catch (dbErr: any) {
      console.warn('Database locking query failed; querying in-memory store:', dbErr?.message);
      pendingWorkloads = inMemoryWorkloadStore.filter((w) => w.status === 'Pending');
    }

    if (!pendingWorkloads || pendingWorkloads.length === 0) {
      return res.status(200).json({
        message: 'No pending workloads found in queue.',
        dataCenterId,
        dataCenterName: dataCenterName || formatDataCenterName(dataCenterId),
        scheduledWorkloads: [],
        unscheduledWorkloads: [],
        metrics: {
          totalEvaluated: 0,
          totalScheduled: 0,
          totalUnscheduled: 0,
          successRatePct: 100,
          totalScheduledEnergyKwh: 0,
          renewableUtilizationPct: 0,
          estimatedCo2AvoidedKg: 0,
        },
      });
    }

    const telemetry = getActiveDataCenterTelemetry(dataCenterId, dataCenterName);

    let activeReservations: ActiveReservation[] = [];
    try {
      const existingScheduled = await db
        .select()
        .from(workloads)
        .where(
          and(
            eq(workloads.status, 'Scheduled'),
            isNotNull(workloads.scheduledTime)
          )
        );

      activeReservations = existingScheduled.map((w) => ({
        id: w.id,
        name: w.name,
        scheduledTime: w.scheduledTime!,
        durationMinutes: w.durationMinutes,
        cpuCores: w.cpuCores,
        memoryGb: w.memoryGb,
        energyKwh: w.energyKwh,
      }));
    } catch {
      // Offline fallback
    }

    const schedulingOutput: MultiDimensionalSchedulingOutput =
      runMultiDimensionalScheduler(pendingWorkloads, telemetry, {
        activeReservations,
      });

    await batchPersistSchedulingResults(
      db,
      schedulingOutput,
      inMemoryWorkloadStore
    );

    return res.status(200).json(schedulingOutput);
  } catch (error: any) {
    console.error('Scheduling pipeline execution failed:', error);
    return res.status(500).json({
      error: 'Scheduling pipeline error',
      message: error?.message ?? 'Failed to execute scheduling pipeline',
    });
  }
}

router.post('/run', handleSchedulingRun);
router.post('/', handleSchedulingRun);

export default router;
