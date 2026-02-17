import { useState, useEffect, useRef, useCallback } from "react";

interface StretchModeProps {
  duration: number; // seconds
  onComplete: () => void;
}

/** Guided stretch prompts that cycle during the break. */
const STRETCH_PROMPTS = [
  { emoji: "\u{1F64C}", text: "Raise your arms up and stretch tall..." },
  { emoji: "\u{1F4AA}", text: "Roll your shoulders back slowly..." },
  { emoji: "\u{1F642}", text: "Tilt your head left, then right..." },
  { emoji: "\u{270B}", text: "Stretch your arms out to the sides..." },
  { emoji: "\u{1F9D8}", text: "Take a deep breath and relax..." },
];

/**
 * Full-screen overlay with a countdown timer for guided stretch breaks.
 * Shows cycling stretch prompts, a progress bar for time remaining,
 * and calls onComplete when the timer ends.
 */
export default function StretchMode({ duration, onComplete }: StretchModeProps) {
  const [remaining, setRemaining] = useState(duration);
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Cycle through prompts every few seconds
  const promptInterval = Math.max(5, Math.floor(duration / STRETCH_PROMPTS.length));

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimers();
          // Use setTimeout to avoid calling onComplete during render
          setTimeout(() => onCompleteRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimers;
  }, [clearTimers]);

  // Cycle prompts
  useEffect(() => {
    const elapsed = duration - remaining;
    const idx = Math.min(
      Math.floor(elapsed / promptInterval),
      STRETCH_PROMPTS.length - 1,
    );
    setCurrentPromptIdx(idx);
  }, [remaining, duration, promptInterval]);

  const progressPercent = ((duration - remaining) / duration) * 100;
  const prompt = STRETCH_PROMPTS[currentPromptIdx];

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-950/95 backdrop-blur-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent-purple/20 px-4 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-purple" />
          <span className="text-sm font-medium text-accent-purple">
            Stretch Break
          </span>
        </div>
      </div>

      {/* Countdown timer */}
      <div className="mb-8">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-accent-purple/30 bg-dark-900">
          <span className="text-4xl font-bold text-white">{timeDisplay}</span>
        </div>
      </div>

      {/* Stretch prompt */}
      <div className="mb-10 px-8 text-center">
        <p className="mb-3 text-4xl">{prompt.emoji}</p>
        <p className="text-xl font-medium text-white">{prompt.text}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-dark-700">
          <div
            className="h-full rounded-full bg-accent-purple transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-dark-400">
          {remaining > 0
            ? `${remaining} second${remaining !== 1 ? "s" : ""} remaining`
            : "Stretch complete!"}
        </p>
      </div>

      {/* Dots for prompt indicator */}
      <div className="mt-6 flex gap-2">
        {STRETCH_PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              i === currentPromptIdx ? "bg-accent-purple" : "bg-dark-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
