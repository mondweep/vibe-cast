import { UUID } from '../../../shared/domain/ValueObjects';

export interface BadgeSnapshot {
  badgeId: UUID;
  certificationName: string;
  issuedAt: string; // ISO8601
  status: 'ACTIVE' | 'REVOKED';
}

export interface SkillSnapshot {
  skillId: UUID;
  skillName: string;
  score: number;
  achievedAt: string; // ISO8601
}

export interface LearnerProfileReadModel {
  learner_id: UUID;
  enrollment_ids: UUID[];
  completed_enrollment_count: number;
  total_enrollments: number;
  average_score: number;
  badges_earned: BadgeSnapshot[];
  skills_achieved: SkillSnapshot[];
  last_activity_at: string; // ISO8601
  projection_version: number;
  last_synced_event_id: UUID | null;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface ExamAttemptSnapshot {
  examId: UUID;
  attemptNumber: number;
  score: number;
  completedAt: string; // ISO8601
  status: 'PASSED' | 'FAILED' | 'PENDING';
}

export interface CertificationProgressReadModel {
  enrollment_id: UUID;
  learner_id: UUID;
  certification_id: UUID;
  enrollment_status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REMEDIATION';
  exam_attempts: ExamAttemptSnapshot[];
  current_grade: number | null;
  badge_status: 'PENDING' | 'ISSUED' | 'REVOKED' | 'NONE';
  issued_badge_id: UUID | null;
  next_renewal_date: string | null; // ISO8601
  last_synced_event_id: UUID | null;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface BadgeDetail {
  badgeId: UUID;
  badgeName: string;
  issuedAt: string; // ISO8601
  displayOrder: number;
}

export interface SkillDetail {
  skillId: UUID;
  skillName: string;
  proficiencyLevel: number;
  achievedAt: string; // ISO8601
}

export interface CommunityProfileReadModel {
  learner_id: UUID;
  display_name: string | null;
  badge_count: number;
  skill_count: number;
  reputation_score: number;
  badges: BadgeDetail[];
  skills: SkillDetail[];
  last_activity_at: string; // ISO8601
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface MetricsReadModel {
  metrics_id: UUID;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  date: string; // ISO8601
  total_events_processed: number;
  event_count_by_type: Record<string, number>;
  total_learners_active: number;
  total_badges_issued: number;
  total_skills_achieved: number;
  average_completion_time_ms: number;
  latency_percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}
