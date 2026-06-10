/**
 * Core domain types for Vibe-Cast frontend
 */

export interface Learner {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  avatar?: string;
  totalEnrollments: number;
  averageScore: number;
  badgesEarned: number;
  reputationScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  id: string;
  name: string;
  description: string;
  domain: 'tech' | 'business' | 'creative';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in hours
  examCount: number;
  badgeId?: string;
  createdAt: string;
}

export interface LearningPath {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  description: string;
  estimatedHours: number;
  lessonCount: number;
  orderedLessonIds: string[];
  prerequisitePathId: string | null;
  status: string;
  /** Cumulative likes across all lessons in this path (populated by lesson-feedback rollup). */
  totalLikes?: number;
}

export interface Lesson {
  id: string;
  pathId: string;
  order: number;
  title: string;
  topics: string[];
  estimatedHours: number;
  capstone: string;
  prerequisiteLessonId: string | null;
  content: unknown[];
  status: string;
}

export interface Enrollment {
  id: string;
  learnerId: string;
  certificationId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  enrolledAt: string;
  completedAt?: string;
  finalScore?: number;
  currentProgress: number; // percentage 0-100
}

export interface Exam {
  id: string;
  enrollmentId: string;
  certificationId: string;
  totalQuestions: number;
  timeLimit: number; // in minutes
  passingScore: number;
  questions: ExamQuestion[];
  createdAt: string;
}

export interface ExamQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false';
  options: string[];
  correctOption: number;
  points: number;
}

export interface ExamSubmission {
  enrollmentId: string;
  examId: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  score: number;
  completedAt: string;
}

export interface Badge {
  id: string;
  certificationId: string;
  name: string;
  description: string;
  imageUrl: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  earnedAt?: string;
}

export interface CertificationProgress {
  enrollmentId: string;
  learnerId: string;
  certificationId: string;
  currentGrade: number;
  examAttempts: number;
  badgeStatus: 'earned' | 'in_progress' | 'not_started';
  lastUpdated: string;
}

export interface CommunityMember {
  learnerId: string;
  displayName: string;
  avatar?: string;
  badgeCount: number;
  reputationScore: number;
  totalEnrollments: number;
}

export interface LeaderboardEntry extends CommunityMember {
  rank: number;
  isCurrentUser?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}
