import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Row shapes for the certification + badge read models (migration 009).
 * snake_case as stored in Postgres; controllers map to the camelCase API shape.
 */
export interface CertificationRow {
  certification_id: string;
  name: string;
  description: string;
  domain: string;
  difficulty: string;
  duration_hours: number;
  exam_count: number;
  badge_id: string | null;
  status: string;
  created_at: string | null;
}

export interface BadgeRow {
  badge_id: string;
  learner_id: string;
  certification_id: string;
  name: string;
  description: string;
  image_url: string;
  difficulty: string;
  earned_at: string | null;
}

export interface CertificationFilters {
  difficulty?: string;
  domain?: string;
  limit?: number;
  skip?: number;
}

const CERT_TABLE = 'ruflo_demo_certification_read_model';
const BADGE_TABLE = 'ruflo_demo_badge_read_model';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Read-only repository for the certification catalog and per-learner badges.
 * Queries the ruflo_demo read models seeded in migration 009 (ADR-011).
 */
export class CertificationCatalogRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAllCertifications(
    filters: CertificationFilters = {},
  ): Promise<CertificationRow[]> {
    const limit = clampLimit(filters.limit);
    const skip = Math.max(0, filters.skip ?? 0);

    let query = this.supabase
      .from(CERT_TABLE)
      .select('*')
      .eq('status', 'PUBLISHED');

    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
    if (filters.domain) query = query.eq('domain', filters.domain);

    const { data, error } = await query
      .order('duration_hours', { ascending: true })
      .range(skip, skip + limit - 1);
    if (error) throw error;
    return (data as CertificationRow[]) ?? [];
  }

  async findCertificationById(
    certificationId: string,
  ): Promise<CertificationRow | null> {
    const { data, error } = await this.supabase
      .from(CERT_TABLE)
      .select('*')
      .eq('certification_id', certificationId)
      .maybeSingle();
    if (error) throw error;
    return (data as CertificationRow) ?? null;
  }

  async findBadgesByLearner(learnerId: string): Promise<BadgeRow[]> {
    const { data, error } = await this.supabase
      .from(BADGE_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return (data as BadgeRow[]) ?? [];
  }
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
