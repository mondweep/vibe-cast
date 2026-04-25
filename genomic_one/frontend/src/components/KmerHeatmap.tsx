"use client";

import { useEffect, useState, Fragment } from "react";
import { getKmer } from "@/lib/api";

interface KmerSimilarity {
  gene_a: string;
  gene_b: string;
  similarity: number;
}

const GENES = ["HBB", "TP53", "BRCA1", "CYP2D6", "INS", "APOE"];

function getColor(value: number): string {
  // Map 0.35-0.55 range to teal intensity (visible on dark backgrounds)
  const t = Math.max(0, Math.min(1, (value - 0.35) / 0.2));
  const r = Math.round(13 + t * 0);
  const g = Math.round(40 + t * 161);
  const b = Math.round(70 + t * 107);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function KmerHeatmap() {
  const [data, setData] = useState<KmerSimilarity[] | null>(null);

  useEffect(() => {
    getKmer().then((d: any) => {
      // Handle both { similarities: [...] } and [...] formats, ensuring we always have an array
      const similarities = Array.isArray(d) ? d : (d?.similarities || []);
      setData(similarities);
    });
  }, []);

  if (!data) return <div className="h-64 animate-pulse bg-surface-2 rounded" />;

  // Build lookup map
  const simMap = new Map<string, number>();
  data.forEach(({ gene_a, gene_b, similarity }) => {
    simMap.set(`${gene_a}-${gene_b}`, similarity);
    simMap.set(`${gene_b}-${gene_a}`, similarity);
  });

  const getSim = (a: string, b: string) => {
    if (a === b) return 1.0;
    return simMap.get(`${a}-${b}`) ?? 0;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${GENES.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {GENES.map((g) => (
          <div key={g} className="text-xs text-center text-zinc-400 font-mono py-1">{g}</div>
        ))}

        {/* Data rows */}
        {GENES.map((row) => (
          <Fragment key={row}>
            <div key={`label-${row}`} className="text-xs text-right text-zinc-400 font-mono pr-2 flex items-center justify-end">
              {row}
            </div>
            {GENES.map((col) => {
              const sim = getSim(row, col);
              return (
                <div
                  key={`${row}-${col}`}
                  className="aspect-square rounded-sm flex items-center justify-center text-xs font-mono transition-all hover:scale-110 cursor-default"
                  style={{
                    backgroundColor: row === col ? "#06b6d4" : getColor(sim),
                    color: sim > 0.45 || row === col ? "#fff" : "#aaa",
                    minWidth: "40px",
                    minHeight: "40px",
                  }}
                  title={`${row} vs ${col}: ${sim.toFixed(4)}`}
                >
                  {sim.toFixed(2)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-zinc-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: getColor(0.35 + (i / 10) * 0.2) }}
            />
          ))}
        </div>
        <span>High</span>
        <span className="ml-2 text-zinc-400">(cosine, k=11, d=512)</span>
      </div>
    </div>
  );
}
