import { GOOD_THRESHOLD, FAIR_THRESHOLD } from "@/lib/constants";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Small inline badge showing a posture score with a colour background
 * based on score thresholds (green / amber / red).
 */
export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const bgColor =
    score >= GOOD_THRESHOLD
      ? "bg-accent-green"
      : score >= FAIR_THRESHOLD
        ? "bg-accent-amber"
        : "bg-accent-red";

  const sizeClasses: Record<string, string> = {
    sm: "px-1.5 py-0.5 text-xs min-w-[2rem]",
    md: "px-2 py-1 text-sm min-w-[2.5rem]",
    lg: "px-3 py-1.5 text-base min-w-[3rem]",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white ${bgColor} ${sizeClasses[size]}`}
    >
      {score}
    </span>
  );
}
