import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Layers, Lock, ArrowRight, Loader } from 'lucide-react';
import { useLearningPaths } from '@/hooks/usePaths';
import { useMyAccess } from '@/hooks/useMyAccess';
import { PremiumBadge } from '@/components/common/PremiumBadge';
import { CouponModal } from '@/components/common/CouponModal';
import type { LearningPath } from '@/types';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const PREMIUM_LEVELS = new Set(['intermediate', 'advanced']);

interface PathCardProps {
  path: LearningPath;
  hasAccess: boolean;
  expiryDate: string | null;
  onUnlock: (tier: string) => void;
}

function PathCard({ path, hasAccess, expiryDate, onUnlock }: PathCardProps) {
  const prereqLocked = Boolean(path.prerequisitePathId);
  const isPremium = PREMIUM_LEVELS.has(path.level);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
            LEVEL_STYLES[path.level] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {path.level}
        </span>
        <div className="flex items-center gap-2">
          {isPremium && <PremiumBadge size="sm" />}
          {prereqLocked && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Lock size={14} /> Prerequisite required
            </span>
          )}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900">{path.title}</h3>
      <p className="text-gray-600 text-sm mt-2 flex-1">{path.description}</p>

      <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
        <span className="flex items-center gap-1">
          <Layers size={16} /> {path.lessonCount} lessons
        </span>
        <span className="flex items-center gap-1">
          <Clock size={16} /> {path.estimatedHours} hours
        </span>
      </div>

      {isPremium && !hasAccess ? (
        <button
          onClick={() => onUnlock(path.level.toUpperCase())}
          className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-medium"
        >
          <Lock size={16} /> Unlock with Coupon
        </button>
      ) : (
        <>
          <Link
            to={`/paths/${path.id}`}
            className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
          >
            View Path <ArrowRight size={16} />
          </Link>
          {isPremium && hasAccess && expiryDate && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Access expires: {formatDate(expiryDate)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function LearningPathsPage() {
  const { data: paths = [], isLoading, isError } = useLearningPaths();
  const { hasAccessTo, getExpiryFor } = useMyAccess();
  const [couponModalTier, setCouponModalTier] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="text-primary-600" /> Learning Paths
        </h1>
        <p className="text-gray-600 mt-2">
          Progress from fundamentals to advanced agent orchestration.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          Couldn't load learning paths. Please try again.
        </div>
      )}

      {!isLoading && !isError && paths.length === 0 && (
        <p className="text-gray-600 text-center py-12">
          No learning paths are available yet.
        </p>
      )}

      {paths.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => {
            const tierKey = path.level.toUpperCase();
            const hasAccess = !PREMIUM_LEVELS.has(path.level) || hasAccessTo(tierKey);
            const expiryDate = getExpiryFor(tierKey);
            return (
              <PathCard
                key={path.id}
                path={path}
                hasAccess={hasAccess}
                expiryDate={expiryDate}
                onUnlock={(tier) => setCouponModalTier(tier)}
              />
            );
          })}
        </div>
      )}

      <CouponModal
        isOpen={!!couponModalTier}
        onClose={() => setCouponModalTier(null)}
        onSuccess={() => setCouponModalTier(null)}
        tier={couponModalTier ?? ''}
      />
    </div>
  );
}

export default LearningPathsPage;
