import { SupabaseClient } from '@supabase/supabase-js';
import { UUID } from '../../../shared/domain/ValueObjects';
import { IReadModelRepository } from './IReadModelRepository';
import {
  LearnerProfileReadModel,
  CertificationProgressReadModel,
  CommunityProfileReadModel,
  MetricsReadModel
} from './ReadModels';

export class SupabaseReadModelRepository implements IReadModelRepository {
  constructor(private supabase: SupabaseClient) {}

  // ============ Learner Profile ============

  async findLearnerProfile(learnerId: UUID): Promise<LearnerProfileReadModel | null> {
    const { data, error } = await this.supabase
      .from('learner_profile_read_model')
      .select('*')
      .eq('learner_id', learnerId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    return data || null;
  }

  async saveLearnerProfile(profile: LearnerProfileReadModel): Promise<void> {
    const { error } = await this.supabase
      .from('learner_profile_read_model')
      .upsert({
        learner_id: profile.learner_id,
        enrollment_ids: profile.enrollment_ids,
        completed_enrollment_count: profile.completed_enrollment_count,
        total_enrollments: profile.total_enrollments,
        average_score: profile.average_score,
        badges_earned: profile.badges_earned,
        skills_achieved: profile.skills_achieved,
        last_activity_at: profile.last_activity_at,
        projection_version: profile.projection_version,
        last_synced_event_id: profile.last_synced_event_id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'learner_id'
      });

    if (error) throw error;
  }

  async findLearnerProfiles(learnerIds?: UUID[]): Promise<LearnerProfileReadModel[]> {
    let query = this.supabase
      .from('learner_profile_read_model')
      .select('*');

    if (learnerIds && learnerIds.length > 0) {
      query = query.in('learner_id', learnerIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async findTopLearnersByActivity(limit: number): Promise<LearnerProfileReadModel[]> {
    const { data, error } = await this.supabase
      .from('learner_profile_read_model')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ============ Certification Progress ============

  async findCertificationProgress(enrollmentId: UUID): Promise<CertificationProgressReadModel | null> {
    const { data, error } = await this.supabase
      .from('certification_progress_read_model')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  async saveCertificationProgress(progress: CertificationProgressReadModel): Promise<void> {
    const { error } = await this.supabase
      .from('certification_progress_read_model')
      .upsert({
        enrollment_id: progress.enrollment_id,
        learner_id: progress.learner_id,
        certification_id: progress.certification_id,
        enrollment_status: progress.enrollment_status,
        exam_attempts: progress.exam_attempts,
        current_grade: progress.current_grade,
        badge_status: progress.badge_status,
        issued_badge_id: progress.issued_badge_id,
        next_renewal_date: progress.next_renewal_date,
        last_synced_event_id: progress.last_synced_event_id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'enrollment_id'
      });

    if (error) throw error;
  }

  async findCertificationProgressByLearner(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    const { data, error } = await this.supabase
      .from('certification_progress_read_model')
      .select('*')
      .eq('learner_id', learnerId);

    if (error) throw error;
    return data || [];
  }

  async findCompletedCertifications(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    const { data, error } = await this.supabase
      .from('certification_progress_read_model')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('badge_status', 'ISSUED');

    if (error) throw error;
    return data || [];
  }

  // ============ Community Profile ============

  async findCommunityProfile(learnerId: UUID): Promise<CommunityProfileReadModel | null> {
    const { data, error } = await this.supabase
      .from('community_profile_read_model')
      .select('*')
      .eq('learner_id', learnerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  async saveCommunityProfile(profile: CommunityProfileReadModel): Promise<void> {
    const { error } = await this.supabase
      .from('community_profile_read_model')
      .upsert({
        learner_id: profile.learner_id,
        display_name: profile.display_name,
        badge_count: profile.badge_count,
        skill_count: profile.skill_count,
        reputation_score: profile.reputation_score,
        badges: profile.badges,
        skills: profile.skills,
        last_activity_at: profile.last_activity_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'learner_id'
      });

    if (error) throw error;
  }

  async findTopLearnersByReputation(limit: number): Promise<CommunityProfileReadModel[]> {
    const { data, error } = await this.supabase
      .from('community_profile_read_model')
      .select('*')
      .order('reputation_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async findTopLearnersByBadgeCount(limit: number): Promise<CommunityProfileReadModel[]> {
    const { data, error } = await this.supabase
      .from('community_profile_read_model')
      .select('*')
      .order('badge_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async findLearnersByMinimumSkillCount(minimumSkills: number): Promise<CommunityProfileReadModel[]> {
    const { data, error } = await this.supabase
      .from('community_profile_read_model')
      .select('*')
      .gte('skill_count', minimumSkills)
      .order('skill_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============ Metrics ============

  async findMetricsForPeriod(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', date: string): Promise<MetricsReadModel | null> {
    const { data, error } = await this.supabase
      .from('metrics_read_model')
      .select('*')
      .eq('period', period)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  async saveMetrics(metrics: MetricsReadModel): Promise<void> {
    const { error } = await this.supabase
      .from('metrics_read_model')
      .upsert({
        metrics_id: metrics.metrics_id,
        period: metrics.period,
        date: metrics.date,
        total_events_processed: metrics.total_events_processed,
        event_count_by_type: metrics.event_count_by_type,
        total_learners_active: metrics.total_learners_active,
        total_badges_issued: metrics.total_badges_issued,
        total_skills_achieved: metrics.total_skills_achieved,
        average_completion_time_ms: metrics.average_completion_time_ms,
        latency_percentiles: metrics.latency_percentiles,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'metrics_id'
      });

    if (error) throw error;
  }

  async findMetricsForDateRange(period: string, startDate: string, endDate: string): Promise<MetricsReadModel[]> {
    const { data, error } = await this.supabase
      .from('metrics_read_model')
      .select('*')
      .eq('period', period)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
