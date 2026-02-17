import { GOOD_THRESHOLD, FAIR_THRESHOLD } from "../../lib/constants";

interface RoomStatsProps {
  participantCount: number;
  averageScore: number;
  sessionDuration: string;
}

function scoreColour(score: number): string {
  if (score >= GOOD_THRESHOLD) return "text-emerald-400";
  if (score >= FAIR_THRESHOLD) return "text-amber-400";
  return "text-red-400";
}

export default function RoomStats({
  participantCount,
  averageScore,
  sessionDuration,
}: RoomStatsProps) {
  const cards: { label: string; value: string | number; colour: string }[] = [
    {
      label: "Students Connected",
      value: participantCount,
      colour: "text-sky-300",
    },
    {
      label: "Average Posture",
      value: Math.round(averageScore),
      colour: scoreColour(averageScore),
    },
    {
      label: "Session Time",
      value: sessionDuration,
      colour: "text-slate-200",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col items-center justify-center rounded-2xl bg-white/5 px-4 py-5"
        >
          <span className={`text-5xl font-extrabold leading-none ${card.colour}`}>
            {card.value}
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
