import { useMemo } from "react";
import type { PostureClassification } from "@/types";
import { GOOD_THRESHOLD, FAIR_THRESHOLD } from "@/lib/constants";

interface PostureScoreProps {
  score: number;
  classification: PostureClassification;
}

/** Arc geometry constants. */
const RADIUS = 80;
const STROKE_WIDTH = 12;
const SIZE = (RADIUS + STROKE_WIDTH) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The arc spans 270 degrees (3/4 of a circle), starting from bottom-left. */
const ARC_DEGREES = 270;
const ARC_LENGTH = (ARC_DEGREES / 360) * CIRCUMFERENCE;
/** Offset to create the gap at the bottom. */
const ARC_OFFSET = CIRCUMFERENCE - ARC_LENGTH;
/** Rotation so the gap faces straight down. */
const ROTATION = 135;

/**
 * Large circular arc/ring indicator displaying the posture score.
 *
 * - Green (good >= 70)
 * - Amber/yellow (fair 40-69)
 * - Red (poor < 40)
 *
 * Score number displayed in center, classification text below.
 * Animated transitions between states.
 */
export default function PostureScore({
  score,
  classification,
}: PostureScoreProps) {
  const fillLength = useMemo(
    () => (score / 100) * ARC_LENGTH,
    [score],
  );

  const strokeColor =
    score >= GOOD_THRESHOLD
      ? "#10b981"
      : score >= FAIR_THRESHOLD
        ? "#f59e0b"
        : "#ef4444";

  const glowColor =
    score >= GOOD_THRESHOLD
      ? "rgba(16, 185, 129, 0.3)"
      : score >= FAIR_THRESHOLD
        ? "rgba(245, 158, 11, 0.3)"
        : "rgba(239, 68, 68, 0.3)";

  const classificationLabel: Record<PostureClassification, string> = {
    good: "Good posture",
    fair: "Fair posture",
    poor: "Poor posture",
  };

  const classificationColor: Record<PostureClassification, string> = {
    good: "text-accent-green",
    fair: "text-accent-amber",
    poor: "text-accent-red",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="transform"
          style={{ transform: `rotate(${ROTATION}deg)` }}
        >
          {/* Glow filter */}
          <defs>
            <filter id="score-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#343541"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${ARC_LENGTH} ${ARC_OFFSET}`}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${fillLength} ${CIRCUMFERENCE - fillLength}`}
            strokeLinecap="round"
            filter="url(#score-glow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Score number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold transition-colors duration-500"
            style={{ color: strokeColor, textShadow: `0 0 20px ${glowColor}` }}
          >
            {score}
          </span>
          <span className="text-xs text-dark-400 mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Classification label */}
      <p
        className={`mt-1 text-lg font-semibold transition-colors duration-500 ${classificationColor[classification]}`}
      >
        {classificationLabel[classification]}
      </p>
    </div>
  );
}
