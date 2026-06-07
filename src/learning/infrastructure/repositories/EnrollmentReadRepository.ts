import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Row shape for a single enrollment from the certification progress read model.
 */
export interface EnrollmentRow {
  enrollment_id: string;
  learner_id: string;
  certification_id: string;
  enrollment_status: string;
  current_grade: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const ENROLLMENT_TABLE = 'ruflo_demo_certification_progress_read_model';

/**
 * Read-only repository for a single enrollment — closes the SPA contract gap for
 * GET /learning/enrollments/:id. Queries the same certification progress read
 * model the learner-enrollments list uses, keyed by enrollment_id (ADR-011).
 */
export class EnrollmentReadRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(enrollmentId: string): Promise<EnrollmentRow | null> {
    const { data, error } = await this.supabase
      .from(ENROLLMENT_TABLE)
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();
    if (error) throw error;
    return (data as EnrollmentRow) ?? null;
  }
}
