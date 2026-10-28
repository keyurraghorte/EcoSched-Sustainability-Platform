import { z } from 'zod';

/**
 * Strict runtime schema for production environment variables.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z
    .string()
    .url()
    .default('https://zxadswmkubwjfqicdhzc.supabase.co'),
  SUPABASE_ANON_KEY: z
    .string()
    .default('sb_publishable_HO2VuWFuoBAYYACrPh5i-g_zMeIJhyi'),
  ELECTRICITY_MAPS_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CRON_SCHEDULE: z.string().default('0 * * * *'), // Default every hour
  OPEN_METEO_BASE_URL: z
    .string()
    .url()
    .default('https://api.open-meteo.com/v1/forecast'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates process.env against the strict schema with safe fallbacks.
 */
export function getValidatedEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn(
      '⚠️ Environment configuration warning(s):',
      parsed.error.flatten().fieldErrors
    );
    return envSchema.parse({
      ...process.env,
      SUPABASE_URL:
        process.env.SUPABASE_URL || 'https://zxadswmkubwjfqicdhzc.supabase.co',
      SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY ||
        'sb_publishable_HO2VuWFuoBAYYACrPh5i-g_zMeIJhyi',
    });
  }
  return parsed.data;
}

export const env = getValidatedEnv();
