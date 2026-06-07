import { z } from 'zod';

/**
 * Zod Validation Schemas for API Endpoints
 *
 * All request body and query parameter schemas used by controllers
 * Type-safe validation at system boundaries
 */

// Learning Domain Schemas

export const EnrollmentRequestSchema = z.object({
  learnerId: z.string().uuid('learnerId must be a valid UUID'),
  certificationId: z.string().uuid('certificationId must be a valid UUID'),
});

export type EnrollmentRequest = z.infer<typeof EnrollmentRequestSchema>;

export const CompleteEnrollmentRequestSchema = z.object({
  finalScore: z.number().min(0).max(100, 'finalScore must be between 0 and 100'),
  completedAt: z.string().datetime().optional(),
});

export type CompleteEnrollmentRequest = z.infer<
  typeof CompleteEnrollmentRequestSchema
>;

export const LearnerProfileQuerySchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type LearnerProfileQuery = z.infer<typeof LearnerProfileQuerySchema>;

// Certification Domain Schemas

export const IssueBadgeRequestSchema = z.object({
  learnerId: z.string().uuid('learnerId must be a valid UUID'),
  enrollmentId: z.string().uuid('enrollmentId must be a valid UUID'),
  badgeId: z.string().uuid('badgeId must be a valid UUID'),
  certificationName: z.string().min(1, 'certificationName is required'),
});

export type IssueBadgeRequest = z.infer<typeof IssueBadgeRequestSchema>;

export const SubmitExamRequestSchema = z.object({
  enrollmentId: z.string().uuid('enrollmentId must be a valid UUID'),
  examId: z.string().uuid('examId must be a valid UUID'),
  answers: z.record(z.string(), z.string().or(z.array(z.string()))),
  score: z.number().min(0).max(100, 'score must be between 0 and 100'),
});

export type SubmitExamRequest = z.infer<typeof SubmitExamRequestSchema>;

export const CertificationProgressQuerySchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type CertificationProgressQuery = z.infer<
  typeof CertificationProgressQuerySchema
>;

// Community Domain Schemas

export const MemberProfileQuerySchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type MemberProfileQuery = z.infer<typeof MemberProfileQuerySchema>;

export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  skip: z.coerce.number().int().min(0).default(0),
  certification: z.string().optional(),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
