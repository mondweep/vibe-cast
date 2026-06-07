import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Row shape for the community profile read model (migration: ruflo_demo_schema).
 */
export interface CommunityProfileRow {
  learner_id: string;
  display_name: string | null;
  badge_count: number;
  skill_count: number;
  reputation_score: number;
}

const COMMUNITY_TABLE = 'ruflo_demo_community_profile_read_model';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Read-only repository for community profiles — backs member search and the
 * leaderboard rank lookup. Queries ruflo_demo_community_profile_read_model
 * with the correct schema (the legacy generic readModelRepository never could).
 */
export class CommunityReadRepository {
  constructor(private supabase: SupabaseClient) {}

  /** Case-insensitive prefix/substring search on display_name. */
  async searchMembers(query: string, limit?: number): Promise<CommunityProfileRow[]> {
    const sanitized = sanitizeQuery(query);
    if (!sanitized) return [];
    const { data, error } = await this.supabase
      .from(COMMUNITY_TABLE)
      .select('*')
      .ilike('display_name', `%${sanitized}%`)
      .order('reputation_score', { ascending: false })
      .limit(clampLimit(limit));
    if (error) throw error;
    return (data as CommunityProfileRow[]) ?? [];
  }

  async findProfile(learnerId: string): Promise<CommunityProfileRow | null> {
    const { data, error } = await this.supabase
      .from(COMMUNITY_TABLE)
      .select('*')
      .eq('learner_id', learnerId)
      .maybeSingle();
    if (error) throw error;
    return (data as CommunityProfileRow) ?? null;
  }

  /**
   * 1-based rank = 1 + number of members with a strictly higher reputation.
   * Total = full member count (for "x of N" display).
   */
  async getRank(reputationScore: number): Promise<{ rank: number; total: number }> {
    const higher = await this.supabase
      .from(COMMUNITY_TABLE)
      .select('learner_id', { count: 'exact', head: true })
      .gt('reputation_score', reputationScore);
    if (higher.error) throw higher.error;

    const total = await this.supabase
      .from(COMMUNITY_TABLE)
      .select('learner_id', { count: 'exact', head: true });
    if (total.error) throw total.error;

    return { rank: (higher.count ?? 0) + 1, total: total.count ?? 0 };
  }
}

/** Strip wildcards/control chars to keep the ILIKE pattern safe and bounded. */
function sanitizeQuery(query: string): string {
  if (typeof query !== 'string') return '';
  return query.replace(/[%_\\]/g, '').trim().slice(0, 100);
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
