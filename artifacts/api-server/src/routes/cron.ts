import { Router, type Request, type Response } from 'express';
import { executeCronPipelineNow } from '../cron/schedulerCron';
import { env } from '../config/env';

const router = Router();

/**
 * GET & POST /api/cron/schedule
 * Serverless cron endpoint compatible with Vercel Cron Jobs and external scheduler hooks.
 * Validates CRON_SECRET if configured.
 */
async function handleCronTrigger(req: Request, res: Response) {
  try {
    // Verify Vercel / external cron secret if configured
    if (env.CRON_SECRET) {
      const authHeader = req.headers.authorization;
      const expectedBearer = `Bearer ${env.CRON_SECRET}`;
      if (authHeader !== expectedBearer) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing CRON_SECRET authorization header.',
        });
      }
    }

    const result = await executeCronPipelineNow();
    return res.status(200).json({
      success: true,
      message: 'Automated scheduling cron pipeline executed successfully.',
      result,
    });
  } catch (error: any) {
    console.error('[EcoSched Cron Route] Execution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Cron pipeline failure',
      message: error?.message || 'Failed to execute automated cron pipeline.',
    });
  }
}

router.get('/schedule', handleCronTrigger);
router.post('/schedule', handleCronTrigger);
router.get('/', handleCronTrigger);
router.post('/', handleCronTrigger);

export default router;
