import type { Session, Student } from "../src/types/index.ts";

const AUTO_CLEANUP_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_CHECK_INTERVAL_MS = 60 * 1000; // check every minute

function getLabel(score: number): "good" | "fair" | "poor" {
  if (score >= 70) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O to avoid confusion
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Manages active lecture sessions and their student lists */
export class SessionManager {
  private sessions = new Map<string, Session>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup of stale sessions
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleSessions();
    }, CLEANUP_CHECK_INTERVAL_MS);
  }

  /** Create a new session and return its unique 4-char room code */
  createSession(): string {
    let roomCode = generateRoomCode();
    // Ensure uniqueness
    while (this.sessions.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const session: Session = {
      roomCode,
      students: new Map(),
      timeline: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(roomCode, session);
    return roomCode;
  }

  /** Add a student to a session. Returns true if successful, false if room not found or nickname taken. */
  joinSession(roomCode: string, nickname: string): boolean {
    const session = this.sessions.get(roomCode);
    if (!session) return false;

    // Check if nickname is already in use in this room
    if (session.students.has(nickname)) {
      return false;
    }

    const student: Student = {
      id: nickname,
      nickname,
      score: 100,
      label: "good",
      headTilt: 0,
      shoulderDelta: 0,
      lastUpdate: Date.now(),
    };

    session.students.set(nickname, student);
    session.lastActivity = Date.now();
    return true;
  }

  /** Remove a student from a session */
  leaveSession(roomCode: string, nickname: string): void {
    const session = this.sessions.get(roomCode);
    if (!session) return;
    session.students.delete(nickname);
    session.lastActivity = Date.now();
  }

  /** Get session data or null if not found */
  getSession(roomCode: string): Session | null {
    return this.sessions.get(roomCode) ?? null;
  }

  /** Update a student's latest posture data */
  updateScore(
    roomCode: string,
    nickname: string,
    score: number,
    headTilt: number,
    shoulderDelta: number,
  ): void {
    const session = this.sessions.get(roomCode);
    if (!session) return;

    const student = session.students.get(nickname);
    if (!student) return;

    student.score = score;
    student.label = getLabel(score);
    student.headTilt = headTilt;
    student.shoulderDelta = shoulderDelta;
    student.lastUpdate = Date.now();

    session.lastActivity = Date.now();
  }

  /** End a session and remove it */
  endSession(roomCode: string): void {
    this.sessions.delete(roomCode);
  }

  /** Return all active sessions (for broadcast iteration) */
  getAllSessions(): Map<string, Session> {
    return this.sessions;
  }

  /** Remove sessions that have had no activity for 2 hours */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [roomCode, session] of this.sessions) {
      if (now - session.lastActivity > AUTO_CLEANUP_MS) {
        this.sessions.delete(roomCode);
        console.log(`[cleanup] Session ${roomCode} auto-removed after 2h inactivity`);
      }
    }
  }

  /** Stop the cleanup timer (for graceful shutdown / testing) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const sessionManager = new SessionManager();
