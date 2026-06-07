/**
 * Configuration constants for Vibe-Cast frontend
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_V1_BASE = `${API_URL}/api/v1`;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const API_TIMEOUT = 30000; // 30 seconds
export const RATE_LIMIT_THRESHOLD = 100; // requests per minute

export const CACHE_DURATION = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
};

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  LEADERBOARD_SIZE: 10,
};

export const EXAM = {
  DEFAULT_TIME_LIMIT: 60, // minutes
  MIN_PASSING_SCORE: 70, // percent
};

export const ROUTES = {
  DASHBOARD: '/',
  PATHS: '/paths',
  PATH_DETAIL: '/paths/:pathId',
  ENROLLMENT: '/enrollment',
  EXAM: '/exam/:enrollmentId',
  BADGES: '/badges',
  LEADERBOARD: '/leaderboard',
  PROFILE: '/profile',
  LOGIN: '/login',
  SIGNUP: '/signup',
};

export const DIFFICULTY_LEVELS = {
  beginner: { label: 'Beginner', color: 'bg-green-100', textColor: 'text-green-800' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
  advanced: { label: 'Advanced', color: 'bg-red-100', textColor: 'text-red-800' },
};

export const ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const BADGE_STATUS = {
  EARNED: 'earned',
  IN_PROGRESS: 'in_progress',
  NOT_STARTED: 'not_started',
};
