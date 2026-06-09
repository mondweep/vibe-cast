/**
 * PatternRepository
 * Supabase read-model persistence for Pattern aggregate
 * Domain: Community — Pattern Repository (ADR-016, P1)
 * Schema: ruflo_demo, table: ruflo_demo_pattern_read_model
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Pattern, PatternCategory, PatternDifficulty, PatternStatus } from '../../domain/models/Pattern';

export interface PatternRow {
  pattern_id: string;
  author_id: string;
  title: string;
  category: string;
  difficulty: string;
  problem: string;
  solution: string;
  code_example: string | null;
  production_context: string | null;
  performance_notes: string | null;
  known_limitations: string | null;
  status: string;
  stars: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface PatternFilters {
  category?: PatternCategory;
  difficulty?: PatternDifficulty;
  search?: string;
}

function rowToPattern(row: PatternRow): Pattern {
  return Pattern.fromPersistence(
    row.pattern_id,
    row.author_id,
    row.title,
    row.category as PatternCategory,
    row.difficulty as PatternDifficulty,
    row.problem,
    row.solution,
    row.code_example ?? '',
    row.production_context,
    row.performance_notes,
    row.known_limitations,
    row.status as PatternStatus,
    Number(row.stars),
    new Date(row.created_at),
    new Date(row.updated_at),
  );
}

export class PatternRepository {
  constructor(
    private supabase: SupabaseClient,
    private schema = 'ruflo_demo',
  ) {}

  private table() {
    return this.supabase
      .schema(this.schema)
      .from('ruflo_demo_pattern_read_model');
  }

  /**
   * List published patterns with optional filters
   */
  async findPublished(filters?: PatternFilters): Promise<PatternRow[]> {
    let query = this.table()
      .select('*')
      .eq('status', 'published')
      .order('stars', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as PatternRow[]) ?? [];
  }

  /**
   * Find pattern by ID
   */
  async findById(id: string): Promise<PatternRow | null> {
    const { data, error } = await this.table()
      .select('*')
      .eq('pattern_id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as PatternRow) ?? null;
  }

  /**
   * Save (upsert) a pattern
   */
  async save(pattern: Pattern): Promise<void> {
    const row: Partial<PatternRow> = {
      pattern_id: pattern.id,
      author_id: pattern.authorId,
      title: pattern.title,
      category: pattern.category,
      difficulty: pattern.difficulty,
      problem: pattern.problem,
      solution: pattern.solution,
      code_example: pattern.codeExample || null,
      production_context: pattern.productionContext,
      performance_notes: pattern.performanceNotes,
      known_limitations: pattern.knownLimitations,
      status: pattern.status.toLowerCase(),
      stars: pattern.stars,
      updated_at: pattern.updatedAt.toISOString(),
    };

    const { error } = await this.table().upsert(row, { onConflict: 'pattern_id' });
    if (error) throw error;
  }

  /**
   * Update aggregate stars on a pattern row
   */
  async updateStars(id: string, stars: number): Promise<void> {
    const { error } = await this.table()
      .update({ stars, updated_at: new Date().toISOString() })
      .eq('pattern_id', id);
    if (error) throw error;
  }

  /**
   * Find patterns by author
   */
  async findByAuthor(authorId: string): Promise<PatternRow[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PatternRow[]) ?? [];
  }
}
