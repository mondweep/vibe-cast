"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import { getRvdna, getPanel } from "@/lib/api";

interface RvdnaResult {
  total_size: number;
  bits_per_base: number;
  sections: number;
  kmer_blocks: number;
  vector_dims: number;
}

interface PanelResult {
  total_bases: number;
}

export default function PipelineSummary() {
  const [rvdna, setRvdna] = useState<RvdnaResult | null>(null);
  const [panel, setPanel] = useState<PanelResult | null>(null);

  useEffect(() => {
    getRvdna().then(setRvdna);
    getPanel().then(setPanel);
  }, []);

  if (!rvdna || !panel) return <div className="h-24 animate-pulse bg-surface-2 rounded" />;

  const stats = [
    { label: "Genes Analyzed", value: "5", color: "#06b6d4" },
    { label: "Total Bases", value: `${panel.total_bases.toLocaleString()} bp`, color: "#8b5cf6" },
    { label: "RVDNA Size", value: `${rvdna.total_size.toLocaleString()} bytes`, color: "#10b981" },
    { label: "Bits/Base", value: rvdna.bits_per_base.toFixed(1), color: "#f59e0b" },
    { label: "Sections", value: String(rvdna.sections), color: "#f43f5e" },
    { label: "K-mer Blocks", value: String(rvdna.kmer_blocks), color: "#06b6d4" },
    { label: "Vector Dims", value: String(rvdna.vector_dims), color: "#8b5cf6" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pipeline Summary</h2>
      <div className="flex flex-wrap gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-zinc-400">{s.label}:</span>
            <span className="text-sm font-mono font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Chip size="sm" variant="flat" color="primary">Genomic Core</Chip>
        <Chip size="sm" variant="flat" color="secondary">Vector Intelligence</Chip>
        <Chip size="sm" variant="flat" color="success">Pure Rust</Chip>
      </div>
    </div>
  );
}
