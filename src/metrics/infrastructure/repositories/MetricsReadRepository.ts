import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Polyfill WebSocket for Node < 22 (mirrors ProgressReadRepository).
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Build a Supabase client for the Metrics read models (ADR-017).
 *
 * Metrics tables are RLS-protected. Uses the service/secret key so the
 * server can upsert learner metrics and read cohort rows without being
 * gated by a per-user session. Returns null if env is absent.
 */
export function createMetricsSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const schema = process.env.DATABASE_SCHEMA || 'ruflo_demo';
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const LEARNER_METRICS_TABLE = 'ruflo_demo_learner_metrics_read_model';
const COHORT_TABLE          = 'ruflo_demo_cohort_read_model';

export interface LearnerMetricsRow {
  metrics_id:             string;
  learner_id:             string;
  path_progress_percent:  number;
  lessons_completed:      number;
  lessons_total:          number;
  exercises_completed:    number;
  exercises_total:        number;
  time_invested_hours:    number;
  last_activity_at:       string | null;
  days_inactive:          number;
  engagement_trend:       string; // 'up' | 'neutral' | 'down'
  est_cert_date:          string | null;
  updated_at:             string;
}

export interface CohortRow {
  cohort_id:                 string;
  name:                      string;
  instructor_id:             string | null;
  learner_ids:               string[];
  active_this_week_pct:      number;
  avg_path_progress:         number;
  completion_rate:           number;
  avg_time_per_lesson_hours: number;
  churn_risk_learner_ids:    string[];
  updated_at:                string;
}

export type LearnerMetricsUpsert = Omit<LearnerMetricsRow, 'metrics_id' | 'updated_at'>;

/**
 * Repository for the Metrics Dashboard read models (CQRS — ADR-017).
 *
 * Reads materialized metrics for the dashboard; upserts learner metrics
 * on projector writes. Returns null / [] gracefully when no rows exist.
 */
export class MetricsReadRepository {
  constructor(
    private supabase: SupabaseClient,
    private schema = 'ruflo_demo',
  ) {}

  // ---------------------------------------------------------------- reads

  async getLearnerMetrics(learnerId: string): Promise<LearnerMetricsRow | null> {
    const { data, error } = await this.supabase
      .from(LEARNER_METRICS_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .maybeSingle();
    if (error) throw error;
    return (data as LearnerMetricsRow) ?? null;
  }

  async getCohortMetrics(cohortId: string): Promise<CohortRow | null> {
    const { data, error } = await this.supabase
      .from(COHORT_TABLE)
      .select('*')
      .eq('cohort_id', cohortId)
      .maybeSingle();
    if (error) throw error;
    return (data as CohortRow) ?? null;
  }

  async getAllCohorts(): Promise<CohortRow[]> {
    const { data, error } = await this.supabase
      .from(COHORT_TABLE)
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data as CohortRow[]) ?? [];
  }

  // ---------------------------------------------------------------- writes

  async upsertLearnerMetrics(
    learnerId: string,
    metrics: Partial<LearnerMetricsUpsert>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from(LEARNER_METRICS_TABLE)
      .upsert(
        { ...metrics, learner_id: learnerId, updated_at: new Date().toISOString() },
        { onConflict: 'learner_id' },
      );
    if (error) throw error;
  }
}
