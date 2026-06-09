import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, ArrowRight, Loader, Star } from 'lucide-react';
import { communityPatternsApi, Pattern } from '@/api/communityPatterns';

const CATEGORY_OPTIONS = ['Consensus', 'Topology', 'Memory', 'Security', 'Coordination', 'Pipeline'];
const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const CATEGORY_STYLES: Record<string, string> = {
  Consensus: 'bg-purple-100 text-purple-800',
  Topology: 'bg-blue-100 text-blue-800',
  Memory: 'bg-pink-100 text-pink-800',
  Security: 'bg-orange-100 text-orange-800',
  Coordination: 'bg-teal-100 text-teal-800',
  Pipeline: 'bg-indigo-100 text-indigo-800',
};

function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[pattern.category] ?? 'bg-gray-100 text-gray-700'}`}>
          {pattern.category}
        </span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${DIFFICULTY_STYLES[pattern.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
          {pattern.difficulty}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900">{pattern.title}</h3>
      <p className="text-gray-600 text-sm mt-2 flex-1 line-clamp-3">{pattern.problem}</p>

      <div className="flex items-center gap-2 mt-4">
        <Star size={14} className="text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-semibold text-gray-800">{pattern.stars.toFixed(1)}</span>
        <span className="text-xs text-gray-500">({pattern.ratingCount} ratings)</span>
      </div>

      <Link
        to={`/community/patterns/${pattern.id}`}
        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
      >
        View Pattern <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export function PatternsPage() {
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');

  const { data: patterns = [], isLoading, isError } = useQuery({
    queryKey: ['community-patterns', category, difficulty, search],
    queryFn: () => communityPatternsApi.listPatterns({
      category: category || undefined,
      difficulty: difficulty || undefined,
      search: search || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookMarked className="text-primary-600" /> Community Patterns
        </h1>
        <p className="text-gray-600 mt-2">
          Reusable orchestration patterns from the community
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search patterns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Levels</option>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d} className="capitalize">{d}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          Couldn't load patterns. Please try again.
        </div>
      )}

      {!isLoading && !isError && patterns.length === 0 && (
        <p className="text-gray-600 text-center py-12">No patterns found. Try adjusting your filters.</p>
      )}

      {patterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PatternsPage;
