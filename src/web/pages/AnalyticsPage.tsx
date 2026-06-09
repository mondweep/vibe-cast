import React, { useEffect, useState } from 'react';
import { BarChart2, BookOpen, CheckSquare, Clock, TrendingUp, TrendingDown, Minus, Users, AlertTriangle, Loader } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { metricsApi, LearnerMetrics, CohortMetrics } from '@/api/metrics';

/**
 * Analytics Dashboard (PRD §8, ADR-017 P1).
 *
 * Section 1 — "Your Progress": learner's own stat cards.
 * Section 2 — "Cohort Overview": cohort aggregate cards.
 */
export function AnalyticsPage() {
  const { user } = useAuth();
  const [myMetrics, setMyMetrics]         = useState<LearnerMetrics | null>(null);
  const [cohorts, setCohorts]             = useState<CohortMetrics[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [metricsError, setMetricsError]   = useState<string | null>(null);
  const [cohortsError, setCohortsError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setMetricsLoading(true);
    metricsApi.getMyMetrics()
      .then(setMyMetrics)
      .catch((e) => setMetricsError(e instanceof Error ? e.message : 'Failed to load metrics'))
      .finally(() => setMetricsLoading(false));
  }, [user]);

  useEffect(() => {
    setCohortsLoading(true);
    metricsApi.getCohorts()
      .then(setCohorts)
      .catch((e) => setCohortsError(e instanceof Error ? e.message : 'Failed to load cohorts'))
      .finally(() => setCohortsLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart2 className="text-primary-600" /> Analytics
        </h1>
        <p className="text-gray-600 mt-2">
          Track your learning progress and cohort performance.
        </p>
      </div>

      {/* Section 1: Your Progress */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Progress</h2>

        {metricsLoading && (
          <div className="flex justify-center py-10">
            <Loader className="animate-spin text-primary-600" size={28} />
          </div>
        )}

        {metricsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            {metricsError}
          </div>
        )}

        {!metricsLoading && !metricsError && myMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Path Progress"
              value={`${myMetrics.pathProgressPercent ?? 0}%`}
              icon={<BookOpen className="text-primary-600" size={28} />}
            />
            <MetricCard
              label="Lessons Completed"
              value={`${myMetrics.lessonsCompleted} / ${myMetrics.lessonsTotal}`}
              icon={<CheckSquare className="text-green-600" size={28} />}
            />
            <MetricCard
              label="Exercises Done"
              value={`${myMetrics.exercisesCompleted} / ${myMetrics.exercisesTotal}`}
              icon={<CheckSquare className="text-blue-600" size={28} />}
            />
            <MetricCard
              label="Hours Invested"
              value={`${myMetrics.timeInvestedHours ?? 0}h`}
              icon={<Clock className="text-orange-500" size={28} />}
            />
            <MetricCard
              label="Days Inactive"
              value={String(myMetrics.daysInactive ?? 0)}
              icon={<AlertTriangle className="text-yellow-500" size={28} />}
            />
            <MetricCard
              label="Engagement"
              value={trendLabel(myMetrics.engagementTrend)}
              icon={<TrendIcon trend={myMetrics.engagementTrend} />}
            />
            <MetricCard
              label="Est. Cert. Date"
              value={myMetrics.estCertDate
                ? new Date(myMetrics.estCertDate).toLocaleDateString()
                : '—'}
              icon={<BarChart2 className="text-purple-600" size={28} />}
            />
          </div>
        )}

        {!metricsLoading && !metricsError && !myMetrics && (
          <p className="text-gray-500 text-sm py-4">
            No metrics recorded yet. Complete lessons to see your analytics.
          </p>
        )}
      </section>

      {/* Section 2: Cohort Overview */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Cohort Overview</h2>

        {cohortsLoading && (
          <div className="flex justify-center py-10">
            <Loader className="animate-spin text-primary-600" size={28} />
          </div>
        )}

        {cohortsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            {cohortsError}
          </div>
        )}

        {!cohortsLoading && !cohortsError && cohorts.length === 0 && (
          <p className="text-gray-500 text-sm py-4">No cohorts found.</p>
        )}

        {!cohortsLoading && !cohortsError && cohorts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {cohorts.map((c) => (
              <CohortCard key={c.cohortId} cohort={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- helpers

function trendLabel(trend: string | undefined): string {
  if (trend === 'up')   return 'Rising ↗';
  if (trend === 'down') return 'Declining ↘';
  return 'Steady →';
}

function TrendIcon({ trend }: { trend: string | undefined }) {
  if (trend === 'up')   return <TrendingUp  className="text-green-500"  size={28} />;
  if (trend === 'down') return <TrendingDown className="text-red-500"   size={28} />;
  return <Minus className="text-gray-400" size={28} />;
}

// ---------------------------------------------------------------- sub-components

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      {icon}
    </div>
  );
}

function CohortCard({ cohort }: { cohort: CohortMetrics }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
        <span className="flex items-center gap-1 text-gray-500 text-sm">
          <Users size={15} /> {cohort.learnerCount}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <StatLine label="Active this week" value={`${cohort.activeThisWeekPct}%`} />
        <StatLine label="Avg progress"     value={`${cohort.avgPathProgress}%`} />
        <StatLine label="Completion rate"  value={`${cohort.completionRate}%`} />
        <StatLine label="Avg time/lesson"  value={`${cohort.avgTimePerLessonHours}h`} />
      </div>

      {cohort.churnRiskCount > 0 && (
        <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 flex items-center gap-1">
          <AlertTriangle size={13} />
          {cohort.churnRiskCount} learner{cohort.churnRiskCount > 1 ? 's' : ''} at churn risk
        </p>
      )}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </>
  );
}

export default AnalyticsPage;
