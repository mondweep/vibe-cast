import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface PosturePieProps {
  distribution: { good: number; fair: number; poor: number };
}

const COLOURS: Record<string, string> = {
  good: "#22c55e",
  fair: "#f59e0b",
  poor: "#ef4444",
};

const LABELS: Record<string, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

interface SliceData {
  name: string;
  value: number;
  fill: string;
}

export default function PosturePie({ distribution }: PosturePieProps) {
  const total = distribution.good + distribution.fair + distribution.poor;

  const data: SliceData[] = (
    Object.keys(distribution) as Array<keyof typeof distribution>
  ).map((key) => ({
    name: LABELS[key],
    value: distribution[key],
    fill: COLOURS[key],
  }));

  return (
    <div className="flex h-full flex-col items-center rounded-2xl bg-white/5 p-4">
      <h3 className="mb-2 text-lg font-semibold uppercase tracking-wider text-slate-400">
        Posture Breakdown
      </h3>

      <div className="relative min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              label={({ name, value }: { name: string; value: number }) =>
                `${name}: ${value}`
              }
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white">{total}</span>
          <span className="text-xs uppercase tracking-wider text-slate-400">
            participants
          </span>
        </div>
      </div>
    </div>
  );
}
