import { GOOD_THRESHOLD, FAIR_THRESHOLD } from "../../lib/constants";

interface LeaderboardProps {
  leaderboard: { nickname: string; score: number }[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

function scoreBg(score: number): string {
  if (score >= GOOD_THRESHOLD) return "bg-emerald-500/20 text-emerald-300";
  if (score >= FAIR_THRESHOLD) return "bg-amber-500/20 text-amber-300";
  return "bg-red-500/20 text-red-300";
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const top5 = leaderboard.slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold uppercase tracking-wider text-slate-400">
        Leaderboard
      </h3>

      {top5.length === 0 && (
        <p className="mt-4 text-center text-base text-slate-500">
          Waiting for students...
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {top5.map((entry, idx) => {
          const isTop = idx === 0;
          return (
            <li
              key={entry.nickname}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                isTop ? "bg-white/10 ring-1 ring-sky-400/30" : "bg-white/[0.03]"
              }`}
            >
              {/* Rank / Medal */}
              <span className="w-8 text-center text-2xl leading-none">
                {idx < 3 ? MEDALS[idx] : (
                  <span className="text-lg font-bold text-slate-500">
                    {idx + 1}
                  </span>
                )}
              </span>

              {/* Nickname */}
              <span
                className={`flex-1 truncate text-xl font-semibold ${
                  isTop ? "text-white" : "text-slate-300"
                }`}
              >
                {entry.nickname}
              </span>

              {/* Score badge */}
              <span
                className={`rounded-full px-3 py-1 text-lg font-bold tabular-nums ${scoreBg(
                  entry.score,
                )}`}
              >
                {entry.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
