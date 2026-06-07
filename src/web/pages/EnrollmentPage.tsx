import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { certificationApi } from '@/api/certification';
import { learningApi } from '@/api/learning';
import { EnrollmentForm } from '@/components/forms/EnrollmentForm';
import { ProgressBar } from '@/components/learner/ProgressBar';
import { Certification } from '@/types';
import { Plus, Filter } from 'lucide-react';

export function EnrollmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [domain, setDomain] = useState('');

  // Fetch certifications
  const { data: certifications = [], isLoading: loadingCerts } = useQuery({
    queryKey: ['certifications', difficulty, domain],
    queryFn: () =>
      certificationApi.getCertifications({
        difficulty: difficulty || undefined,
        domain: domain || undefined,
        limit: 50,
      }),
  });

  // Fetch user enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['user-enrollments', user?.id],
    queryFn: () =>
      user ? learningApi.getLearnerEnrollments(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  // Create enrollment mutation
  const createEnrollmentMutation = useMutation({
    mutationFn: (certificationId: string) =>
      user ? learningApi.createEnrollment(user.id, certificationId) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['learner'] });
      setShowForm(false);
    },
  });

  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
  const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Certifications</h1>
          <p className="text-gray-600 mt-2">Browse and enroll in certifications</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
        >
          <Plus size={20} />
          New Enrollment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain
          </label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Domains</option>
            <option value="tech">Technology</option>
            <option value="business">Business</option>
            <option value="creative">Creative</option>
          </select>
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          <Filter size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Active Enrollments */}
      {activeEnrollments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            My Active Enrollments ({activeEnrollments.length})
          </h2>
          <div className="grid gap-4">
            {activeEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {enrollment.certificationId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    Active
                  </span>
                </div>
                <ProgressBar
                  percentage={enrollment.currentProgress}
                  label="Progress"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Certifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Available Certifications
        </h2>

        {loadingCerts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : certifications.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No certifications found
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert: Certification) => (
              <div
                key={cert.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {cert.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {cert.description}
                </p>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <p>Duration: {cert.duration} hours</p>
                  <p>Exams: {cert.examCount}</p>
                  <p>
                    Domain:{' '}
                    <span className="capitalize">{cert.domain}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      cert.difficulty === 'advanced'
                        ? 'bg-red-100 text-red-800'
                        : cert.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {cert.difficulty.charAt(0).toUpperCase() +
                      cert.difficulty.slice(1)}
                  </span>
                  <button
                    onClick={() => {
                      setShowForm(true);
                    }}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    Enroll →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Enrollments */}
      {completedEnrollments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Completed Certifications ({completedEnrollments.length})
          </h2>
          <div className="grid gap-4">
            {completedEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {enrollment.certificationId}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Score: {enrollment.finalScore}%
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  Completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              New Enrollment
            </h2>
            <EnrollmentForm
              certifications={certifications}
              isLoading={loadingCerts}
              onSubmit={(certId) =>
                createEnrollmentMutation.mutateAsync(certId).then(() => undefined)
              }
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EnrollmentPage;
