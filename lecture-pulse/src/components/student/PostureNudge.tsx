import { useState, useEffect, useRef, useCallback } from "react";
import { NUDGE_THRESHOLD, NUDGE_DELAY_MS } from "@/lib/constants";

interface PostureNudgeProps {
  score: number;
}

/**
 * Overlay notification that appears when the student's posture score
 * stays below NUDGE_THRESHOLD for longer than NUDGE_DELAY_MS.
 *
 * Displays a dismissible message with a slide-in-from-bottom animation.
 * Internally tracks time spent in poor posture using useEffect + timer.
 */
export default function PostureNudge({ score }: PostureNudgeProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const poorStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (score < NUDGE_THRESHOLD) {
      // Started (or continued) poor posture
      if (poorStartRef.current === null) {
        poorStartRef.current = Date.now();
      }

      if (!dismissed && !visible) {
        clearTimer();
        const elapsed = Date.now() - poorStartRef.current;
        const remaining = Math.max(0, NUDGE_DELAY_MS - elapsed);

        timerRef.current = setTimeout(() => {
          setVisible(true);
        }, remaining);
      }
    } else {
      // Posture improved - reset everything
      poorStartRef.current = null;
      clearTimer();
      setVisible(false);
      setDismissed(false);
    }

    return clearTimer;
  }, [score, dismissed, visible, clearTimer]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6 animate-slide-up">
      <div className="w-full max-w-sm rounded-2xl border border-accent-amber/30 bg-dark-800/95 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-amber/20">
            <svg
              className="h-5 w-5 text-accent-amber"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              You&apos;ve been slouching
            </p>
            <p className="mt-0.5 text-xs text-dark-300">
              Try sitting up straight!
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-white"
            aria-label="Dismiss nudge"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
