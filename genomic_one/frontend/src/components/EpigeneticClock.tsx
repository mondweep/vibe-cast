"use client";

import { useEffect, useState } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { getEpigenetics } from "@/lib/api";

interface EpiData {
  cpg_sites: number;
  mean_methylation: number;
  predicted_age: number;
}

export default function EpigeneticClock() {
  const [data, setData] = useState<EpiData | null>(null);

  useEffect(() => {
    getEpigenetics().then(setData);
  }, []);

  if (!data) return <div className="h-64 animate-pulse bg-surface-2 rounded" />;

  const chartData = [{ name: "Age", value: data.predicted_age, fill: "#06b6d4" }];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Radial gauge */}
      <div className="w-56 h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            data={chartData}
            startAngle={210}
            endAngle={-30}
            barSize={12}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "#27272a" }}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-accent">{data.predicted_age.toFixed(1)}</span>
          <span className="text-xs text-zinc-400">biological years</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4 flex-1">
        <div>
          <div className="text-xs text-zinc-400 mb-1">Horvath Clock Model</div>
          <div className="text-sm text-zinc-300">
            Estimates biological age from DNA methylation patterns at CpG dinucleotide sites.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-xs text-zinc-400">CpG Sites</div>
            <div className="text-lg font-mono font-semibold">{data.cpg_sites}</div>
          </div>
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-xs text-zinc-400">Mean Methylation</div>
            <div className="text-lg font-mono font-semibold">{data.mean_methylation.toFixed(3)}</div>
          </div>
        </div>
        <div className="text-xs text-zinc-400">
          Beta values range 0.0 (unmethylated) to 1.0 (fully methylated)
        </div>
      </div>
    </div>
  );
}
