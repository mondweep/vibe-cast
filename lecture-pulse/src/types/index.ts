// ─── Pose / Posture Types ────────────────────────────────────────

/** A single landmark returned from MediaPipe Pose. */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** Classification bucket for a posture score. */
export type PostureClassification = "good" | "fair" | "poor";

/** Detailed result from the posture-scoring algorithm. */
export interface PostureResult {
  score: number;
  headTilt: number;
  shoulderDelta: number;
  torsoLean: number;
  neckForward: number;
}

// ─── WebSocket Protocol ──────────────────────────────────────────

/** Student → Server */
export interface StudentUpdate {
  type: "posture_update";
  roomCode: string;
  nickname: string;
  score: number;
  headTilt: number;
  shoulderDelta: number;
  timestamp: number;
}

/** Server → Dashboard */
export interface DashboardState {
  type: "dashboard_state";
  participantCount: number;
  averageScore: number;
  distribution: { good: number; fair: number; poor: number };
  leaderboard: { nickname: string; score: number }[];
  timeline: TimelineEntry[];
}

/** Server → All Students (and dashboard) */
export interface StretchBreak {
  type: "stretch_break";
  duration: number; // seconds
}

// ─── Session ─────────────────────────────────────────────────────

export interface SessionInfo {
  roomCode: string;
  participants: string[];
  createdAt: number;
}

/** A single entry in the engagement timeline. */
export interface TimelineEntry {
  time: string;
  score: number;
}

/** Server-side session state (in-memory). */
export interface Session {
  roomCode: string;
  students: Map<string, Student>;
  timeline: TimelineEntry[];
  createdAt: number;
  lastActivity: number;
}

// ─── Student ─────────────────────────────────────────────────────

/** Student session state tracked on the server. */
export interface Student {
  id: string;
  nickname: string;
  score: number;
  label: PostureClassification;
  headTilt: number;
  shoulderDelta: number;
  lastUpdate: number;
}

// ─── Dashboard helpers ───────────────────────────────────────────

/** Computed posture score for a student (compact). */
export interface PostureScore {
  score: number;
  label: PostureClassification;
  timestamp: number;
}

/** Aggregate room statistics sent to the dashboard. */
export interface RoomStatsData {
  totalStudents: number;
  averageScore: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
}

/** Time-series data point for engagement chart. */
export interface EngagementDataPoint {
  time: string;
  averageScore: number;
  studentCount: number;
}

/** All possible WS message types exchanged in the system. */
export type WSMessage = StudentUpdate | DashboardState | StretchBreak;
