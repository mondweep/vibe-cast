import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Lightbulb,
  Loader,
  Play,
  Trophy,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillLabApi, type SubmitAttemptResult } from '@/api/skillLab';

const LEVEL_STYLES: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced:     'bg-red-100 text-red-800',
};

const SKILL_STYLES: Record<string, string> = {
  'message-passing': 'bg-blue-100 text-blue-800',
  'leader-election': 'bg-purple-100 text-purple-800',
  consensus:         'bg-orange-100 text-orange-800',
  topology:          'bg-cyan-100 text-cyan-800',
  memory:            'bg-pink-100 text-pink-800',
};

function HintsPanel({ exerciseId, hintCount }: { exerciseId: string; hintCount: number }) {
  const [revealed, setRevealed] = useState<{ index: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const nextIndex = revealed.length;
  const canGetMore = nextIndex < hintCount;

  const fetchHint = async () => {
    if (!canGetMore) return;
    setLoading(true);
    try {
      const result = await skillLabApi.getHint(exerciseId, nextIndex);
      setRevealed((prev) => [...prev, { index: result.hintIndex, text: result.text }]);
    } catch {
      // silently ignore — user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {revealed.map((h) => (
        <div key={h.index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <Lightbulb size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-900">{h.text}</p>
        </div>
      ))}
      {canGetMore && (
        <button
          onClick={fetchHint}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border border-yellow-300 text-yellow-800 rounded-lg hover:bg-yellow-50 transition disabled:opacity-50"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Lightbulb size={14} />}
          Get hint {nextIndex + 1}/{hintCount}
        </button>
      )}
    </div>
  );
}

function TestResultsPanel({ results }: { results: SubmitAttemptResult }) {
  const { passed, failed, feedback, allPassed } = results;
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${allPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2">
        {allPassed
          ? <CheckCircle size={18} className="text-green-600" />
          : <XCircle size={18} className="text-red-600" />}
        <span className={`font-semibold text-sm ${allPassed ? 'text-green-800' : 'text-red-800'}`}>
          {allPassed ? 'All checks passed!' : `${failed} check${failed !== 1 ? 's' : ''} failed`}
        </span>
        <span className="text-xs text-gray-500 ml-auto">{passed} passed / {passed + failed} total</span>
      </div>
      {feedback.length > 0 && (
        <ul className="space-y-1">
          {feedback.map((msg, i) => (
            <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
              <span className="mt-0.5 flex-shrink-0">•</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExercisePage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const queryClient = useQueryClient();

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => skillLabApi.getExercise(exerciseId!),
    enabled: Boolean(exerciseId),
  });

  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<SubmitAttemptResult | null>(null);
  const [completed, setCompleted] = useState(false);

  // Pre-fill starter code once exercise loads
  useEffect(() => {
    if (exercise?.starter_code && !code) {
      setCode(exercise.starter_code);
    }
  }, [exercise?.starter_code]);

  const submitMutation = useMutation({
    mutationFn: (submittedCode: string) => skillLabApi.submitAttempt(exerciseId!, submittedCode),
    onSuccess: (result) => {
      setTestResults(result);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => skillLabApi.completeExercise(exerciseId!),
    onSuccess: () => {
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['skill-lab-exercises'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="space-y-4">
        <Link to="/skill-lab" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
          <ArrowLeft size={16} /> Back to Skill Lab
        </Link>
        <p className="text-gray-600">Exercise not found.</p>
      </div>
    );
  }

  const showComplete = testResults?.allPassed && !completed;

  return (
    <div className="space-y-4 max-w-6xl">
      <Link to="/skill-lab" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
        <ArrowLeft size={16} /> Back to Skill Lab
      </Link>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${SKILL_STYLES[exercise.skill] ?? 'bg-gray-100 text-gray-700'}`}>
            {exercise.skill.replace('-', ' ')}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${LEVEL_STYLES[exercise.level] ?? 'bg-gray-100 text-gray-700'}`}>
            {exercise.level}
          </span>
        </div>
      </div>

      {completed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
          <Trophy size={20} />
          <span className="font-semibold">Exercise completed!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: instructions + hints */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Instructions</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{exercise.instructions ?? ''}</ReactMarkdown>
            </div>
          </div>

          {(exercise.hintCount ?? 0) > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Hints</h2>
              <HintsPanel exerciseId={exercise.exercise_id} hintCount={exercise.hintCount ?? 0} />
            </div>
          )}
        </div>

        {/* Right panel: code editor + results */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Your solution</span>
              <span className="text-xs text-gray-400">{code.split('\n').length} lines</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-80 p-4 font-mono text-sm text-gray-900 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              placeholder="// Write your Ruflo orchestration code here..."
              spellCheck={false}
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => submitMutation.mutate(code)}
              disabled={submitMutation.isPending || !code.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50"
            >
              {submitMutation.isPending
                ? <Loader size={16} className="animate-spin" />
                : <Play size={16} />}
              Submit & Check
            </button>

            {showComplete && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
              >
                {completeMutation.isPending
                  ? <Loader size={16} className="animate-spin" />
                  : <Trophy size={16} />}
                Mark Complete
              </button>
            )}
          </div>

          {submitMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              Submission failed. Please check your connection and try again.
            </div>
          )}

          {testResults && <TestResultsPanel results={testResults} />}
        </div>
      </div>
    </div>
  );
}

export default ExercisePage;
