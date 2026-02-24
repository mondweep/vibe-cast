import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  FIAT500_TRACKER_API_KEY: z.string().min(1),
  SENDGRID_API_KEY: z.string().optional().default(''),
  OPENCLAW_WEBHOOK_URL: z.string().optional().default(''),
  OPENCLAW_WEBHOOK_SECRET: z.string().optional().default(''),
  PORT: z.string().optional().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
