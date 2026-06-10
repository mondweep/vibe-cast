import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { communityPatternsApi, type SubmitPatternData } from '@/api/communityPatterns';
import { useAuth } from '@/auth/AuthContext';

const CATEGORIES = ['Consensus', 'Topology', 'Memory', 'Security', 'Coordination', 'Pipeline'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export function ContributePatternPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<SubmitPatternData>({
    title: '',
    category: 'Coordination',
    difficulty: 'beginner',
    problem: '',
    solution: '',
    codeExample: '',
  });

  const mutation = useMutation({
    mutationFn: (data: SubmitPatternData) => communityPatternsApi.submitPattern(data),
  });

  if (!user) return <Navigate to="/login" replace />;

  if (mutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-green-900">Pattern submitted for review!</p>
            <p className="text-sm text-green-700 mt-1">
              Thank you. Your pattern will be reviewed before appearing in the community library.
            </p>
          </div>
        </div>
        <Link to="/community/patterns" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
          <ArrowLeft size={16} /> Back to Patterns
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: SubmitPatternData = {
      ...form,
      codeExample: form.codeExample?.trim() || undefined,
    };
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/community/patterns" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
        <ArrowLeft size={16} /> Back to Patterns
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Contribute a Pattern</h1>
        <p className="text-sm text-gray-500 mb-6">Share a reusable orchestration pattern with the community. Patterns are reviewed before publication.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">Title <span className="text-red-500">*</span></label>
            <input
              id="title" name="title" type="text" required
              value={form.title} onChange={handleChange}
              placeholder="e.g. Fan-out with coordinator"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">Category <span className="text-red-500">*</span></label>
              <select id="category" name="category" required value={form.category} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="difficulty">Difficulty <span className="text-red-500">*</span></label>
              <select id="difficulty" name="difficulty" required value={form.difficulty} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize">
                {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="problem">Problem <span className="text-red-500">*</span></label>
            <textarea
              id="problem" name="problem" required rows={3}
              value={form.problem} onChange={handleChange}
              placeholder="What problem does this pattern solve?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="solution">Solution <span className="text-red-500">*</span></label>
            <textarea
              id="solution" name="solution" required rows={4}
              value={form.solution} onChange={handleChange}
              placeholder="How does this pattern solve the problem?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="codeExample">Code Example <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              id="codeExample" name="codeExample" rows={5}
              value={form.codeExample} onChange={handleChange}
              placeholder="// Optional: show how to use this pattern in code"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">
              Failed to submit. Please check your inputs and try again.
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Pattern for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ContributePatternPage;
