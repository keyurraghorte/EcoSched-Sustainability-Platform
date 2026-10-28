import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, workloads, type WorkloadSelect } from '@workspace/db';
import {
  runMultiDimensionalScheduler,
  type DataCenterCapacityTelemetry,
  type MultiDimensionalSchedulingOutput,
} from '../services/schedulerEngine';
import { inMemoryWorkloadStore } from './workloads';

const router = Router();

/**
 * Generates telemetry profile for the active data center across 24 hourly buckets.
 */
export function getActiveDataCenterTelemetry(dataCenterId = 'oslo-fjord-1'): DataCenterCapacityTelemetry {
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
    dataCenterName: dataCenterId === 'rotterdam-delta-2' ? 'Rotterdam Delta 02' : 'Oslo Fjord 01',
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
 * Fetches all 'Pending' workloads from Supabase, verifies constraints via Segment Trees,
 * batch-updates database statuses to 'Scheduled', and returns the scheduling report.
 */
async function handleSchedulingRun(req: Request, res: Response) {
  try {
    const dataCenterId = (req.body?.dataCenterId as string) || 'oslo-fjord-1';

    // 1. Fetch all pending workloads from the database (with resilient fallback)
    let pendingWorkloads: WorkloadSelect[] = [];
    try {
      pendingWorkloads = await db
        .select()
        .from(workloads)
        .where(eq(workloads.status, 'Pending'));
    } catch (dbErr: any) {
      console.warn('Database query failed; querying in-memory store:', dbErr?.message);
      pendingWorkloads = inMemoryWorkloadStore.filter((w) => w.status === 'Pending');
    }

    if (!pendingWorkloads || pendingWorkloads.length === 0) {
      return res.status(200).json({
        message: 'No pending workloads found in database.',
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

    // 2. Fetch current capacity telemetry for active data center
    const telemetry = getActiveDataCenterTelemetry(dataCenterId);

    // 3. Execute multi-dimensional bin-packing with Segment Trees
    const schedulingOutput: MultiDimensionalSchedulingOutput =
      runMultiDimensionalScheduler(pendingWorkloads, telemetry);

    // 4. Batch-update database state in Supabase from 'Pending' to 'Scheduled'
    const updatePromises = schedulingOutput.scheduledWorkloads.map(async (job) => {
      const inMem = inMemoryWorkloadStore.find((w) => w.id === job.id);
      if (inMem) {
        inMem.status = 'Scheduled';
        inMem.scheduledTime = job.scheduledTime;
        inMem.energySource = job.energySource;
        inMem.sourceAllocationMix = job.sourceAllocationMix;
      }

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
      } catch (colErr) {
        try {
          await db
            .update(workloads)
            .set({ status: 'Scheduled' })
            .where(eq(workloads.id, job.id));
        } catch {
          // Ignored if database is offline
        }
      }
    });

    await Promise.all(updatePromises);

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
