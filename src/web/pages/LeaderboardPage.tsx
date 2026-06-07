import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '@/api/community';
import { useAuth } from '@/auth/AuthContext';
import { Trophy, Medal } from 'lucide-react';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [limit] = useState(10);
  const [skip, setSkip] = useState(0);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', skip],
    queryFn: () => communityApi.getLeaderboard(limit, skip),
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-500" size={24} />;
    if (rank === 3) return <Medal className="text-orange-600" size={24} />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-600 mt-2">
          See how you rank against other learners
        </p>
      </div>

      {/* Your Rank */}
      {user && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow text-white p-6">
          <p className="text-primary-100 text-sm mb-1">Your Rank</p>
          <h2 className="text-3xl font-bold">Loading...</h2>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Reputation Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Badges
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : !leaderboard?.items || leaderboard.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                    No leaderboard data available
                  </td>
                </tr>
              ) : (
                leaderboard.items.map((entry, idx) => (
                  <tr
                    key={entry.learnerId}
                    className={`hover:bg-gray-50 transition ${
                      entry.isCurrentUser ? 'bg-primary-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className="font-bold text-gray-900">
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {entry.avatar ? (
                          <img
                            src={entry.avatar}
                            alt={entry.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {entry.displayName}
                          </p>
                          {entry.isCurrentUser && (
                            <p className="text-xs text-primary-600 font-medium">
                              You
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-600">
                        {entry.reputationScore.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                        {entry.badgeCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {leaderboard && leaderboard.hasMore && (
          <div className="flex justify-center items-center gap-4 p-6 border-t border-gray-200">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {Math.floor(skip / limit) + 1}
            </span>
            <button
              onClick={() => setSkip(skip + limit)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Ranking System</h3>
        <p className="text-gray-700 text-sm">
          Your reputation score is calculated based on badges earned, exams
          passed, and community engagement. Climb the leaderboard by completing
          more certifications!
        </p>
      </div>
    </div>
  );
}

export default LeaderboardPage;
