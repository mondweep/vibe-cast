import React, { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { certificationApi } from '@/api/certification';
import { BadgesList } from '@/components/learner/BadgesList';
import { Filter } from 'lucide-react';

export function BadgesPage() {
  const { user } = useAuth();
  const [skillFilter, setSkillFilter] = useState('');

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: () =>
      user ? certificationApi.getLearnerBadges(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const filteredBadges = skillFilter
    ? badges.filter((b) =>
        b.name.toLowerCase().includes(skillFilter.toLowerCase()),
      )
    : badges;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Badges</h1>
        <p className="text-gray-600 mt-2">
          Display and manage your earned badges and achievements
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Badges
            </label>
            <input
              type="text"
              placeholder="Search by skill or certification..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Filter size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {badges.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Badges</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {badges.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Beginner Badges</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {badges.filter((b) => b.difficulty === 'beginner').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Advanced Badges</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {badges.filter((b) => b.difficulty === 'advanced').length}
            </p>
          </div>
        </div>
      )}

      {/* Badges Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Achievements ({filteredBadges.length})
        </h2>
        <BadgesList badges={filteredBadges} isLoading={isLoading} />
      </div>

      {/* Badges Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">About Badges</h3>
        <p className="text-gray-700 text-sm mb-3">
          Badges are earned by successfully completing certifications. Each
          badge represents mastery in a specific skill area. Share your badges
          on social media to showcase your achievements!
        </p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Beginner: Foundational knowledge</li>
          <li>• Intermediate: Applied skills</li>
          <li>• Advanced: Expert-level mastery</li>
        </ul>
      </div>
    </div>
  );
}

export default BadgesPage;
