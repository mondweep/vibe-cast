import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, BookMarked, Loader, AlertTriangle, PlusCircle } from 'lucide-react';
import { communityPatternsApi } from '@/api/communityPatterns';
import { useAuth } from '@/auth/AuthContext';

const CATEGORY_STYLES: Record<string, string> = {
  Consensus: 'bg-purple-100 text-purple-800',
  Topology: 'bg-blue-100 text-blue-800',
  Memory: 'bg-pink-100 text-pink-800',
  Security: 'bg-orange-100 text-orange-800',
  Coordination: 'bg-teal-100 text-teal-800',
  Pipeline: 'bg-indigo-100 text-indigo-800',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

function StarRating({ value, onRate, disabled }: { value: number; onRate: (s: number) => void; disabled: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" aria-label="Rate this pattern">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          disabled={disabled}
          onClick={() => onRate(s)}
          onMouseEnter={() => !disabled && setHover(s)}
          onMouseLeave={() => !disabled && setHover(0)}
          className="focus:outline-none disabled:cursor-default"
          aria-label={`Rate ${s} star${s !== 1 ? 's' : ''}`}
        >
          <Star
            size={28}
            className={
              (hover || value) >= s
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 text-sm whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export function PatternDetailPage() {
  const { patternId } = useParams<{ patternId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const { data: pattern, isLoading, isError } = useQuery({
    queryKey: ['community-pattern', patternId],
    queryFn: () => communityPatternsApi.getPattern(patternId!),
    enabled: Boolean(patternId),
  });

  const rateMutation = useMutation({
    mutationFn: (stars: number) => communityPatternsApi.ratePattern(patternId!, stars),
    onSuccess: () => {
      setRatingSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['community-pattern', patternId] });
      queryClient.invalidateQueries({ queryKey: ['community-patterns'] });
    },
  });

  const handleRate = (stars: number) => {
    if (!user || ratingSubmitted) return;
    setUserRating(stars);
    rateMutation.mutate(stars);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (isError || !pattern) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800 flex items-center gap-3">
        <AlertTriangle size={20} />
        Pattern not found or failed to load.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/community/patterns" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
        <ArrowLeft size={16} /> Back to Patterns
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[pattern.category] ?? 'bg-gray-100 text-gray-700'}`}>
            {pattern.category}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${DIFFICULTY_STYLES[pattern.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
            {pattern.difficulty}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <BookMarked className="text-primary-600" size={24} />
          {pattern.title}
        </h1>
        <div className="flex items-center gap-2 mt-3">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-gray-800">{pattern.stars.toFixed(1)}</span>
          <span className="text-sm text-gray-500">({pattern.ratingCount} ratings)</span>
        </div>
      </div>

      <Section title="Problem">{pattern.problem}</Section>
      <Section title="Solution">{pattern.solution}</Section>

      {pattern.codeExample && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Code Example</h2>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto whitespace-pre">
            <code>{pattern.codeExample}</code>
          </pre>
        </div>
      )}

      {pattern.productionContext && <Section title="Production Context">{pattern.productionContext}</Section>}
      {pattern.performanceNotes && <Section title="Performance Notes">{pattern.performanceNotes}</Section>}
      {pattern.knownLimitations && <Section title="Known Limitations">{pattern.knownLimitations}</Section>}

      {/* Rating widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Rate this Pattern</h2>
        {!user ? (
          <p className="text-sm text-gray-600">
            <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link> to rate this pattern.
          </p>
        ) : ratingSubmitted ? (
          <p className="text-sm text-green-700 font-medium">Thank you for your rating!</p>
        ) : (
          <div className="space-y-2">
            <StarRating value={userRating} onRate={handleRate} disabled={rateMutation.isPending} />
            {rateMutation.isPending && <p className="text-sm text-gray-500">Saving...</p>}
            {rateMutation.isError && <p className="text-sm text-red-600">Failed to save rating. Please try again.</p>}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Have a pattern to share?</p>
          <p className="text-sm text-gray-600">Contribute a reusable orchestration pattern to help the community.</p>
        </div>
        <Link
          to="/community/patterns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium whitespace-nowrap"
        >
          <PlusCircle size={16} /> Contribute a Pattern
        </Link>
      </div>
    </div>
  );
}

export default PatternDetailPage;
