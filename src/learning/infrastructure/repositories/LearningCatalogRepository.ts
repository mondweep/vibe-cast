import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// supabase-js wires a realtime client (needs a global WebSocket) even when only
// REST/DB queries are used. Node < 22 has no global WebSocket, so polyfill with
// the `ws` package. Without this, createClient() throws on Node 20 (incl. the
// node:20-alpine Docker image).
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Build a Supabase client for the public, read-only curriculum catalog.
 *
 * Uses the PUBLISHABLE key (catalog tables are public-read by RLS, so no secret
 * key is needed). Returns null if env is absent, letting the server boot without
 * the catalog rather than crashing.
 *
 * NOTE: the legacy SupabaseReadModelRepository queried table names without a
 * schema, so it hit the default `public` schema and could never find the
 * `ruflo_demo` tables. This client sets `db.schema` correctly (ADR-013, Phase 3).
 */
export function createCatalogSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const schema = process.env.DATABASE_SCHEMA || 'ruflo_demo';
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface LearningPathRow {
  path_id: string;
  level: string;
  title: string;
  description: string;
  estimated_hours: number;
  lesson_count: number;
  ordered_lesson_ids: string[];
  prerequisite_path_id: string | null;
  status: string;
}

export interface LessonRow {
  lesson_id: string;
  path_id: string;
  lesson_order: number;
  title: string;
  topics: string[];
  estimated_hours: number;
  capstone: string;
  prerequisite_lesson_id: string | null;
  content: unknown[];
  status: string;
}

/**
 * Read-only repository for the Learning curriculum catalog (paths + lessons).
 * Queries the ruflo_demo read models seeded in migrations 002/003.
 */
export class LearningCatalogRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAllPaths(): Promise<LearningPathRow[]> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_learning_path_read_model')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('estimated_hours', { ascending: true });
    if (error) throw error;
    return (data as LearningPathRow[]) ?? [];
  }

  async findPathById(pathId: string): Promise<LearningPathRow | null> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_learning_path_read_model')
      .select('*')
      .eq('path_id', pathId)
      .maybeSingle();
    if (error) throw error;
    return (data as LearningPathRow) ?? null;
  }

  async findLessonsByPath(pathId: string): Promise<LessonRow[]> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_lesson_read_model')
      .select('*')
      .eq('path_id', pathId)
      .eq('status', 'PUBLISHED')
      .order('lesson_order', { ascending: true });
    if (error) throw error;
    return (data as LessonRow[]) ?? [];
  }

  async findLessonById(lessonId: string): Promise<LessonRow | null> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_lesson_read_model')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) throw error;
    return (data as LessonRow) ?? null;
  }

  // ---- Learner reads (repairs the broken legacy endpoints; ADR-013) ----

  async findLearnerProfile(learnerId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_learner_profile_read_model')
      .select('*')
      .eq('learner_id', learnerId)
      .maybeSingle();
    if (error) throw error;
    return (data as Record<string, unknown>) ?? null;
  }

  async findLearnerEnrollments(learnerId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('ruflo_demo_certification_progress_read_model')
      .select('*')
      .eq('learner_id', learnerId);
    if (error) throw error;
    return (data as Record<string, unknown>[]) ?? [];
  }
}
