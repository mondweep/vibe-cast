import React, { useState } from 'react';
import { Badge } from '@/types';
import { Award } from 'lucide-react';

interface BadgesListProps {
  badges: Badge[];
  isLoading?: boolean;
  onBadgeClick?: (badge: Badge) => void;
}

export function BadgesList({
  badges,
  isLoading,
  onBadgeClick,
}: BadgesListProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-4 animate-pulse"
          >
            <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Award size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">No badges earned yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Complete certifications to earn badges
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => {
              setSelectedBadge(badge);
              onBadgeClick?.(badge);
            }}
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
          >
            {/* Badge Image */}
            {badge.imageUrl ? (
              <img
                src={badge.imageUrl}
                alt={badge.name}
                className="w-full h-24 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg mb-3 flex items-center justify-center">
                <Award size={48} className="text-yellow-600" />
              </div>
            )}

            {/* Badge Info */}
            <h3 className="font-semibold text-gray-900 truncate">
              {badge.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {badge.description}
            </p>

            {/* Difficulty */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span
                className={`inline-block text-xs px-2 py-1 rounded ${
                  badge.difficulty === 'advanced'
                    ? 'bg-red-100 text-red-800'
                    : badge.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}
              >
                {badge.difficulty.charAt(0).toUpperCase() +
                  badge.difficulty.slice(1)}
              </span>
            </div>

            {/* Earned Date */}
            {badge.earnedAt && (
              <p className="text-xs text-gray-400 mt-2">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            {selectedBadge.imageUrl && (
              <img
                src={selectedBadge.imageUrl}
                alt={selectedBadge.name}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedBadge.name}
            </h2>
            <p className="text-gray-600 mb-4">{selectedBadge.description}</p>

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Difficulty:</strong>{' '}
                {selectedBadge.difficulty.charAt(0).toUpperCase() +
                  selectedBadge.difficulty.slice(1)}
              </p>
              {selectedBadge.earnedAt && (
                <p className="text-sm text-gray-600">
                  <strong>Earned:</strong>{' '}
                  {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Close
              </button>
              <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium">
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BadgesList;
