"use client";

import { Card, CardBody, Chip } from "@heroui/react";

type MemoryType = "genomic" | "neural" | "temporal" | "advisory";

interface Memory {
  title: string;
  stored: string;
  source: string;
  type: MemoryType;
  details: Record<string, string>;
}

const memories: Memory[] = [
  {
    title: "CYP2D6 *4/*10 — Intermediate Metabolizer",
    stored: "2026-03-17 08:12",
    source: "Patient Simulation ISC-001",
    type: "genomic",
    details: { Gene: "CYP2D6", Confidence: "94%" },
  },
  {
    title: "HBB E6V Sickle Cell Carrier Detection",
    stored: "2026-03-17 08:15",
    source: "Variant Analysis",
    type: "genomic",
    details: { Gene: "HBB", Confidence: "98%" },
  },
  {
    title: "BRCA1 185delAG — Elevated Cancer Risk",
    stored: "2026-03-16 14:30",
    source: "Patient Simulation ISC-002",
    type: "genomic",
    details: { Gene: "BRCA1", Confidence: "87%" },
  },
  {
    title: "TP53-BRCA1 K-mer Similarity Cluster",
    stored: "2026-03-16 10:45",
    source: "Vector Analysis",
    type: "neural",
    details: { Genes: "TP53 / BRCA1", Similarity: "0.4883" },
  },
  {
    title: "GLP-1 RA Standard Dosing — CYP2D6 Normal",
    stored: "2026-03-15 16:20",
    source: "Pharma Advisory",
    type: "advisory",
    details: { Drug: "Semaglutide", Risk: "Low" },
  },
  {
    title: "INS Locus T2D Trajectory — Age 52",
    stored: "2026-03-15 09:00",
    source: "Temporal Attractor",
    type: "temporal",
    details: { Gene: "INS", "10yr Risk": "38%" },
  },
  {
    title: "Epigenetic Age 27.9yr — CpG Profile",
    stored: "2026-03-14 11:30",
    source: "Horvath Clock",
    type: "temporal",
    details: { Sites: "500", "Mean Methylation": "0.497" },
  },
  {
    title: "CYP2D6 *1/*1 — Normal Metabolizer Baseline",
    stored: "2026-03-14 08:00",
    source: "Patient Simulation ISC-003",
    type: "genomic",
    details: { Gene: "CYP2D6", Confidence: "99%" },
  },
];

const borderColors: Record<MemoryType, string> = {
  genomic: "border-l-[var(--accent-teal)]",
  neural: "border-l-[var(--accent-purple)]",
  temporal: "border-l-[var(--accent-gold)]",
  advisory: "border-l-[var(--safla-green)]",
};

const chipColors: Record<MemoryType, { base: string; content: string }> = {
  genomic: { base: "bg-[var(--accent-teal)]/15", content: "text-[var(--accent-teal)]" },
  neural: { base: "bg-[var(--accent-purple)]/15", content: "text-[var(--accent-purple)]" },
  temporal: { base: "bg-[var(--accent-gold)]/15", content: "text-[var(--accent-gold)]" },
  advisory: { base: "bg-[var(--safla-green)]/15", content: "text-[var(--safla-green)]" },
};

export default function MemoriesPage() {
  return (
    <div className="p-6 sm:p-10">
      <span className="panel-label">Memories</span>
      <p className="text-[var(--text-secondary)] text-sm max-w-2xl mb-8">
        Stored vector patterns from in silico case studies
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {memories.map((memory) => (
          <Card
            key={memory.title}
            className={`bg-surface border border-border border-l-3 ${borderColors[memory.type]}`}
          >
            <CardBody className="p-4 space-y-3">
              <div>
                <h3 className="font-mono font-semibold text-sm leading-snug">
                  {memory.title}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Stored {memory.stored}
                </p>
              </div>

              <Chip
                variant="flat"
                size="sm"
                classNames={chipColors[memory.type]}
              >
                {memory.source}
              </Chip>

              <div className="space-y-1.5">
                {Object.entries(memory.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">{key}</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-muted)] mt-8 text-center">
        Simulated Data · In Silico Environment
      </p>
    </div>
  );
}
