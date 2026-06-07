import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLearnerProfile, useLearnerEnrollments } from '@/hooks/useLearnerProfile';
import { LearnerCard } from '@/components/learner/LearnerCard';
import { ProgressBar } from '@/components/learner/ProgressBar';
import { BadgesList } from '@/components/learner/BadgesList';
import { BookOpen, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useLearnerProfile(
    user?.id,
  );
  const { data: enrollments = [] } = useLearnerEnrollments(user?.id);

  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's an overview of your learning progress.
        </p>
      </div>

      {/* Profile Card */}
      {profile && (
        <LearnerCard learner={profile} isLoading={profileLoading} />
      )}

      {/* Quick Stats */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Current Enrollments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {activeEnrollments.length}
                </p>
              </div>
              <BookOpen className="text-primary-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Badges Earned</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {profile.badgesEarned}
                </p>
              </div>
              <Award className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Average Score</p>
                <p className="text-3xl font-bold text-success-600 mt-1">
                  {profile.averageScore.toFixed(0)}%
                </p>
              </div>
              <ProgressBar
                percentage={Math.round(profile.averageScore)}
                variant="circular"
                size="sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Enrollments */}
      {enrollments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Active Learning Paths
          </h2>

          {activeEnrollments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No active enrollments. Start learning by exploring our
              certifications!
            </p>
          ) : (
            <div className="space-y-4">
              {activeEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      Certification ID: {enrollment.certificationId}
                    </h3>
                    <div className="mt-2">
                      <ProgressBar
                        percentage={enrollment.currentProgress}
                        label={`${enrollment.currentProgress}% Complete`}
                        size="sm"
                      />
                    </div>
                  </div>
                  <Link
                    to={`/exam/${enrollment.id}`}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call to Action */}
      {enrollments.length === 0 && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
          <p className="mb-6 text-primary-100">
            Explore our certifications and start your learning journey today.
          </p>
          <Link
            to="/enrollment"
            className="inline-block px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Browse Certifications
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-600 text-center py-8">
          Your recent activity will appear here
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;
