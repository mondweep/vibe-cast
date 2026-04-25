"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getVariants, getAlignment } from "@/lib/api";
import EvidenceBase, { Reference } from "@/components/EvidenceBase";

const VARIANT_REFERENCES: Reference[] = [
  { title: "Sickle cell disease: molecular pathogenesis and therapeutic targets", source: "Nature Reviews", year: 2023, relevance: 5 },
  { title: "HBB variant classification guidelines — ACMG/AMP standards", source: "Genetics in Medicine", year: 2024, relevance: 4 },
];

interface Variant {
  position: number;
  ref_allele: string;
  alt_allele: string;
  depth: number;
  quality: number;
  is_sickle_cell: boolean;
}

interface VariantResult {
  positions_analyzed: number;
  total_variants: number;
  variants: Variant[];
}

interface AlignmentResult {
  query_start: number;
  query_end: number;
  query_len: number;
  score: number;
  mapped_position: number;
  mapping_quality: number;
  cigar_ops: number;
}

export default function VariantBrowser() {
  const [variants, setVariants] = useState<VariantResult | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);

  useEffect(() => {
    getVariants().then(setVariants);
    getAlignment().then(setAlignment);
  }, []);

  if (!variants || !alignment) return <div className="h-64 animate-pulse bg-surface-2 rounded" />;

  // Generate synthetic depth chart data around the sickle cell position
  const depthData = Array.from({ length: 40 }, (_, i) => {
    const pos = i * 5;
    const isSickle = pos === 20;
    return {
      position: pos,
      depth: isSickle ? variants.variants[0]?.depth || 38 : 30 + Math.floor(Math.random() * 15),
      variant: isSickle,
    };
  });

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <Chip variant="flat" color="default" size="sm">
          {variants.positions_analyzed} positions
        </Chip>
        <Chip variant="flat" color="warning" size="sm">
          {variants.total_variants} variant{variants.total_variants !== 1 ? "s" : ""}
        </Chip>
        <Chip variant="flat" color="success" size="sm">
          Alignment score: {alignment.score}
        </Chip>
        <Chip variant="flat" color="secondary" size="sm">
          MAPQ: {alignment.mapping_quality}
        </Chip>
      </div>

      {/* Depth chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={depthData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <XAxis dataKey="position" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "#3f3f46" }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "#3f3f46" }} />
            <Tooltip
              contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Bar dataKey="depth" radius={[2, 2, 0, 0]}>
              {depthData.map((entry, i) => (
                <Cell key={i} fill={entry.variant ? "#f43f5e" : "#06b6d4"} fillOpacity={entry.variant ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Variant detail */}
      {variants.variants.map((v, i) => (
        <div key={i} className="bg-surface-2 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            {v.is_sickle_cell && (
              <Chip color="danger" size="sm" variant="flat">Sickle Cell</Chip>
            )}
            <span className="text-sm font-mono">HBB position {v.position}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-zinc-400 text-xs">Ref/Alt</span>
              <div className="font-mono">
                <span className="text-green-400">{v.ref_allele}</span>
                {" → "}
                <span className="text-red-400">{v.alt_allele}</span>
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-xs">Depth</span>
              <div className="font-mono">{v.depth}x</div>
            </div>
            <div>
              <span className="text-zinc-400 text-xs">Quality</span>
              <div className="font-mono">{v.quality.toFixed(1)}</div>
            </div>
            <div>
              <span className="text-zinc-400 text-xs">Mutation</span>
              <div className="font-mono text-xs">A→T at codon 6 (Glu→Val)</div>
            </div>
          </div>
        </div>
      ))}

      {/* FACT Literature Evidence */}
      <EvidenceBase references={VARIANT_REFERENCES} />
    </div>
  );
}
