import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLearnerProfile } from '@/hooks/useLearnerProfile';
import { useLearnerProgress, useCompletedLessons } from '@/hooks/useProgress';
import type { PathProgressSummary } from '@/api/progress';
import { LearnerCard } from '@/components/learner/LearnerCard';
import { ProgressBar } from '@/components/learner/ProgressBar';
import { BookOpen, Award, Clock, Flame, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Progress Dashboard (PRD §4.3) — real path enrollments, progress bars,
 * continue-where-you-left-off, lessons completed X/Y, est. hours remaining,
 * weekly labs and a streak. Backed by the ADR-011 CQRS progress read models.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const learnerId = user?.id;
  const { data: profile, isLoading: profileLoading } = useLearnerProfile(learnerId);
  const { data: progress, isLoading: progressLoading } = useLearnerProgress(learnerId);
  const { data: completedLessons = [] } = useCompletedLessons(learnerId);

  const paths = progress?.paths ?? [];
  const activePaths = paths.filter((p) => p.status === 'ACTIVE');
  const activePath = progress?.activePath ?? null;

  // Weekly labs + streak from completed-lesson timestamps (PRD §4.3).
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklyLabs = completedLessons.filter(
    (l) => now - new Date(l.completedAt).getTime() <= weekMs,
  ).length;
  const streak = computeStreakDays(completedLessons.map((l) => l.completedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's an overview of your learning progress.
        </p>
      </div>

      {profile && <LearnerCard learner={profile} isLoading={profileLoading} />}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Paths"
          value={activePaths.length}
          icon={<BookOpen className="text-primary-600" size={32} />}
        />
        <StatCard
          label="Labs This Week"
          value={weeklyLabs}
          icon={<Clock className="text-primary-600" size={32} />}
        />
        <StatCard
          label="Day Streak"
          value={streak}
          icon={<Flame className="text-orange-500" size={32} />}
        />
        <StatCard
          label="Badges Earned"
          value={profile?.badgesEarned ?? 0}
          icon={<Award className="text-yellow-600" size={32} />}
        />
      </div>

      {/* Continue where you left off */}
      {activePath && activePath.nextLessonId && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
          <p className="text-primary-100 text-sm">Continue where you left off</p>
          <h2 className="text-2xl font-bold mt-1">{activePath.pathTitle}</h2>
          <p className="text-primary-100 mt-1">
            {activePath.completedLessons}/{activePath.totalLessons} lessons •{' '}
            {activePath.estimatedHoursRemaining}h to certification
          </p>
          <Link
            to={`/lessons/${activePath.nextLessonId}`}
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-primary-700 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Resume Next Lesson
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Active Learning Paths */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Learning Paths</h2>

        {progressLoading ? (
          <p className="text-gray-500 text-center py-8">Loading your progress…</p>
        ) : paths.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {paths.map((p) => (
              <PathProgressRow key={p.pathId} path={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function PathProgressRow({ path }: { path: PathProgressSummary }) {
  const target = path.nextLessonId
    ? `/lessons/${path.nextLessonId}`
    : `/paths/${path.pathId}`;
  const isComplete = path.status === 'COMPLETED';
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{path.pathTitle || 'Learning Path'}</h3>
          {isComplete && (
            <span className="text-xs px-2 py-0.5 bg-success-100 text-success-700 rounded-full">
              Completed
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {path.completedLessons}/{path.totalLessons} lessons •{' '}
          {path.estimatedHoursRemaining}h remaining
        </p>
        <div className="mt-2">
          <ProgressBar
            percentage={path.progressPercent}
            label={`${path.progressPercent}% Complete`}
            size="sm"
          />
        </div>
      </div>
      <Link
        to={target}
        className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2"
      >
        {isComplete ? 'Review' : 'Continue'}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-4">
        You haven't started a learning path yet.
      </p>
      <Link
        to="/paths"
        className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
      >
        Browse Learning Paths
      </Link>
    </div>
  );
}

/** Consecutive-day streak counting back from today over completion timestamps. */
function computeStreakDays(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;
  const dayKeys = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to start either today or yesterday.
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dayKeys.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default DashboardPage;
