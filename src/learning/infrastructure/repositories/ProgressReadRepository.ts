import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// supabase-js wires a realtime client (needs a global WebSocket) even when only
// REST/DB queries are used. Node < 22 has no global WebSocket, so polyfill with
// the `ws` package (mirrors LearningCatalogRepository).
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Build a Supabase client for the Progress Dashboard read models (ADR-011).
 *
 * Progress tables are RLS-protected (owner + service_role). The write path
 * (start path / complete lesson) UPSERTs read models, which requires the
 * service_role key. Prefers a service/secret key; falls back to the
 * publishable key for read-only operation. Returns null if env is absent so
 * the server can boot without progress rather than crashing.
 *
 * NEVER reads .env directly and never logs the key.
 */
export function createProgressSupabaseClient(): SupabaseClient | null {
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

const ENROLLMENT_TABLE = 'ruflo_demo_path_enrollment_read_model';
const COMPLETION_TABLE = 'ruflo_demo_lesson_completion_read_model';
const PROGRESS_TABLE = 'ruflo_demo_path_progress_read_model';

export interface PathEnrollmentRow {
  enrollment_id: string;
  learner_id: string;
  path_id: string;
  total_lessons: number;
  status: string;
  enrolled_at: string;
}

export interface LessonCompletionRow {
  completion_id: string;
  learner_id: string;
  path_id: string;
  lesson_id: string;
  progress_percent: number;
  completed_at: string;
}

export interface PathProgressRow {
  progress_id: string;
  learner_id: string;
  path_id: string;
  completed_lesson_ids: string[];
  progress_percent: number;
  status: string;
  current_lesson_id: string | null;
  started_at: string;
  completed_at: string | null;
}

/**
 * Repository for the Progress Dashboard read models (CQRS — ADR-011).
 *
 * Reads materialized progress for the dashboard; writes (UPSERT) the read
 * models on start-path / complete-lesson commands. Returns [] / null gracefully
 * when no rows exist so the SPA renders empty states rather than erroring.
 */
export class ProgressReadRepository {
  constructor(private supabase: SupabaseClient) {}

  // ---------------------------------------------------------------- reads

  async findEnrollmentsByLearner(learnerId: string): Promise<PathEnrollmentRow[]> {
    const { data, error } = await this.supabase
      .from(ENROLLMENT_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .order('enrolled_at', { ascending: true });
    if (error) throw error;
    return (data as PathEnrollmentRow[]) ?? [];
  }

  async findProgressByLearner(learnerId: string): Promise<PathProgressRow[]> {
    const { data, error } = await this.supabase
      .from(PROGRESS_TABLE)
      .select('*')
      .eq('learner_id', learnerId);
    if (error) throw error;
    return (data as PathProgressRow[]) ?? [];
  }

  async findProgress(learnerId: string, pathId: string): Promise<PathProgressRow | null> {
    const { data, error } = await this.supabase
      .from(PROGRESS_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .eq('path_id', pathId)
      .maybeSingle();
    if (error) throw error;
    return (data as PathProgressRow) ?? null;
  }

  async findCompletedLessons(learnerId: string): Promise<LessonCompletionRow[]> {
    const { data, error } = await this.supabase
      .from(COMPLETION_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .order('completed_at', { ascending: true });
    if (error) throw error;
    return (data as LessonCompletionRow[]) ?? [];
  }

  // ---------------------------------------------------------------- writes

  async upsertEnrollment(row: PathEnrollmentRow & { last_synced_event_id?: string }): Promise<void> {
    const { error } = await this.supabase
      .from(ENROLLMENT_TABLE)
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'learner_id,path_id' },
      );
    if (error) throw error;
  }

  async upsertCompletion(
    row: LessonCompletionRow & { last_synced_event_id?: string },
  ): Promise<void> {
    const { error } = await this.supabase
      .from(COMPLETION_TABLE)
      .upsert(row, { onConflict: 'learner_id,lesson_id' });
    if (error) throw error;
  }

  async upsertProgress(
    row: PathProgressRow & { last_synced_event_id?: string },
  ): Promise<void> {
    const { error } = await this.supabase
      .from(PROGRESS_TABLE)
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'learner_id,path_id' },
      );
    if (error) throw error;
  }
}
