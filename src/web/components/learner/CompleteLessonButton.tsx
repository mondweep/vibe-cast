import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useCompleteLesson } from '@/hooks/useProgress';

interface CompleteLessonButtonProps {
  lessonId: string;
  isCompleted?: boolean;
  onCompleted?: (result: { progressPercent: number; status: string }) => void;
}

/**
 * Complete-lesson action (PRD §4.3) — NEW standalone component so it can be
 * dropped into the lesson page without the progress agent editing LessonPage.
 * Posts to /api/v1/learning/lessons/:id/complete and refreshes progress queries.
 */
export function CompleteLessonButton({
  lessonId,
  isCompleted = false,
  onCompleted,
}: CompleteLessonButtonProps) {
  const { user } = useAuth();
  const { mutate, isPending, isError } = useCompleteLesson();

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-lg text-sm font-medium">
        <CheckCircle size={16} />
        Completed
      </span>
    );
  }

  const handleClick = () => {
    if (!user?.id) return;
    mutate(
      { lessonId, learnerId: user.id },
      { onSuccess: (result) => onCompleted?.(result) },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || !user?.id}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-60"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        {isPending ? 'Marking complete...' : 'Mark Lesson Complete'}
      </button>
      {isError && (
        <span className="text-xs text-error-600">Could not complete lesson. Try again.</span>
      )}
    </div>
  );
}

export default CompleteLessonButton;
