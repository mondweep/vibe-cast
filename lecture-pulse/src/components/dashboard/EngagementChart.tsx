import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { GOOD_THRESHOLD, FAIR_THRESHOLD } from "../../lib/constants";

interface EngagementChartProps {
  timeline: { time: string; score: number }[];
}

export default function EngagementChart({ timeline }: EngagementChartProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-white/5 p-4">
      <h3 className="mb-2 text-lg font-semibold uppercase tracking-wider text-slate-400">
        Engagement Timeline
      </h3>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeline}
            margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
          >
            <XAxis
              dataKey="time"
              tick={{ fill: "#94a3b8", fontSize: 13 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 13 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
              width={36}
            />

            {/* threshold reference lines */}
            <ReferenceLine
              y={GOOD_THRESHOLD}
              stroke="#22c55e"
              strokeDasharray="6 4"
              strokeOpacity={0.4}
              label={{
                value: "Good",
                fill: "#22c55e",
                fontSize: 12,
                position: "insideTopRight",
              }}
            />
            <ReferenceLine
              y={FAIR_THRESHOLD}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              strokeOpacity={0.4}
              label={{
                value: "Fair",
                fill: "#f59e0b",
                fontSize: 12,
                position: "insideTopRight",
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 14,
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number) => [`${value}`, "Score"]}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: "#38bdf8" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
