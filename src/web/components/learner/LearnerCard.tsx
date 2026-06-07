import React from 'react';
import { Learner } from '@/types';
import { User, BookOpen, Award } from 'lucide-react';

interface LearnerCardProps {
  learner: Learner;
  isLoading?: boolean;
}

export function LearnerCard({ learner, isLoading }: LearnerCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
          {learner.avatar ? (
            <img
              src={learner.avatar}
              alt={learner.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={32} className="text-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {learner.displayName}
          </h2>
          <p className="text-sm text-gray-600">{learner.email}</p>
          {learner.bio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {learner.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-gray-600">
            <BookOpen size={18} />
            <span className="text-sm font-semibold">
              {learner.totalEnrollments}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-yellow-600">
            <Award size={18} />
            <span className="text-sm font-semibold">
              {learner.badgesEarned}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {learner.bio && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-700">{learner.bio}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600">
            {learner.totalEnrollments}
          </p>
          <p className="text-xs text-gray-500">Enrollments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {learner.badgesEarned}
          </p>
          <p className="text-xs text-gray-500">Badges</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-success-600">
            {learner.averageScore.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">Avg Score</p>
        </div>
      </div>
    </div>
  );
}

export default LearnerCard;
