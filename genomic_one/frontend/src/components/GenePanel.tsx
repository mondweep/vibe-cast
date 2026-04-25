"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Chip, Progress } from "@heroui/react";
import { getPanel } from "@/lib/api";

interface Gene {
  name: string;
  description: string;
  chromosome: string;
  length: number;
  gc_content: number;
}

interface PanelData {
  genes: Gene[];
  total_bases: number;
}

const GENE_COLORS: Record<string, string> = {
  HBB: "#06b6d4",
  TP53: "#8b5cf6",
  BRCA1: "#f43f5e",
  CYP2D6: "#10b981",
  INS: "#f59e0b",
};

export default function GenePanel() {
  const [data, setData] = useState<PanelData | null>(null);

  useEffect(() => {
    getPanel().then((d: any) => {
      // Ensure we have a valid panel structure
      if (d && Array.isArray(d.genes)) {
        setData(d);
      } else {
        console.error("Invalid panel data", d);
      }
    });
  }, []);

  if (!data) return <GenePanelSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gene Panel</h2>
        <Chip variant="flat" color="primary" size="sm">
          {data.total_bases.toLocaleString()} bp total
        </Chip>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {data.genes.map((gene) => (
          <Card key={gene.name} className="bg-surface border border-border">
            <CardHeader className="pb-1 pt-3 px-4 flex-col items-start">
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: GENE_COLORS[gene.name] || "#666" }}
                />
                <span className="text-lg font-bold">{gene.name}</span>
              </div>
              <p className="text-xs text-zinc-400">{gene.description}</p>
            </CardHeader>
            <CardBody className="pt-1 pb-3 px-4 gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{gene.chromosome}</span>
                <span className="font-mono">{gene.length} bp</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">GC Content</span>
                  <span className="font-mono">{gene.gc_content.toFixed(1)}%</span>
                </div>
                <Progress
                  value={gene.gc_content}
                  maxValue={100}
                  size="sm"
                  classNames={{
                    indicator: "bg-accent",
                    track: "bg-surface-2",
                  }}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GenePanelSkeleton() {
  return (
    <div>
      <div className="h-7 w-40 bg-surface-2 rounded mb-4 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
