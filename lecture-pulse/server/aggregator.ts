import type { Session, DashboardState } from "../src/types/index.ts";

/**
 * Aggregate posture data across all students in a session and return
 * a DashboardState object ready for broadcast to the presenter.
 *
 * Timeline management is external: the caller should append the current
 * average to session.timeline before or after calling this function.
 * This function simply reads the existing timeline from the session.
 */
export function aggregateStats(session: Session): DashboardState {
  const students = Array.from(session.students.values());
  const participantCount = students.length;

  if (participantCount === 0) {
    return {
      type: "dashboard_state",
      participantCount: 0,
      averageScore: 0,
      distribution: { good: 0, fair: 0, poor: 0 },
      leaderboard: [],
      timeline: session.timeline,
    };
  }

  // Mean of all active students' latest scores
  const totalScore = students.reduce((sum, s) => sum + s.score, 0);
  const averageScore = Math.round((totalScore / participantCount) * 10) / 10;

  // Distribution: good >= 70, fair 40-69, poor < 40
  let good = 0;
  let fair = 0;
  let poor = 0;
  for (const student of students) {
    if (student.score >= 70) {
      good++;
    } else if (student.score >= 40) {
      fair++;
    } else {
      poor++;
    }
  }

  // Leaderboard: top 5 sorted by score descending
  const leaderboard = students
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => ({ nickname: s.nickname, score: s.score }));

  return {
    type: "dashboard_state",
    participantCount,
    averageScore,
    distribution: { good, fair, poor },
    leaderboard,
    timeline: session.timeline,
  };
}
