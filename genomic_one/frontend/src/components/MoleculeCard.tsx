"use client";

import { Card, CardBody, Chip, Progress } from "@heroui/react";

export interface MoleculeCandidate {
  id: number;
  smiles: string;
  name: string;
  binding_affinity: number;
  toxicity: "low" | "moderate" | "high";
  drug_similarity: { drug: string; percent: number };
  molecular_weight: number;
  logP: number;
}

const TOXICITY_CONFIG: Record<
  "low" | "moderate" | "high",
  { label: string; color: "success" | "warning" | "danger" }
> = {
  low: { label: "LOW", color: "success" },
  moderate: { label: "MODERATE", color: "warning" },
  high: { label: "HIGH", color: "danger" },
};

export default function MoleculeCard({
  candidate,
  targetPathway,
}: {
  candidate: MoleculeCandidate;
  targetPathway: string;
}) {
  const tox = TOXICITY_CONFIG[candidate.toxicity];
  const affinityPercent = Math.min((candidate.binding_affinity / 12) * 100, 100);

  return (
    <Card
      className="panel-card molecule"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderTop: "2px solid var(--accent-purple)",
      }}
    >
      <CardBody className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-xs tracking-[0.15em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            CANDIDATE {candidate.id}
          </span>
          <Chip size="sm" variant="flat" color="secondary" className="text-[10px] tracking-wider uppercase">
            Agentic Diffusion
          </Chip>
        </div>

        {/* Name */}
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {candidate.name}
        </p>

        {/* SMILES display */}
        <div
          className="rounded-md px-3 py-3 font-mono text-sm break-all leading-relaxed"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            color: "var(--accent-purple)",
          }}
        >
          <span
            className="block text-[10px] uppercase tracking-[0.12em] mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            SMILES
          </span>
          {candidate.smiles}
        </div>

        {/* Stats grid */}
        <div className="space-y-3">
          {/* Binding Affinity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[11px] uppercase tracking-wider font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                Binding Affinity
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: "var(--accent-teal)" }}
              >
                {candidate.binding_affinity} kcal/mol
              </span>
            </div>
            <Progress
              size="sm"
              value={affinityPercent}
              color="success"
              className="h-1.5"
              aria-label="Binding affinity"
            />
          </div>

          {/* Toxicity */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] uppercase tracking-wider font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Toxicity Risk
            </span>
            <Chip size="sm" variant="flat" color={tox.color}>
              {tox.label}
            </Chip>
          </div>

          {/* Drug Similarity */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] uppercase tracking-wider font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Drug Similarity
            </span>
            <span
              className="font-mono text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {candidate.drug_similarity.percent}%{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                ({candidate.drug_similarity.drug})
              </span>
            </span>
          </div>

          {/* Molecular Weight + LogP */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span
                className="block text-[10px] uppercase tracking-wider font-mono mb-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                Mol. Weight
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {candidate.molecular_weight}
              </span>
            </div>
            <div>
              <span
                className="block text-[10px] uppercase tracking-wider font-mono mb-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                LogP
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {candidate.logP}
              </span>
            </div>
          </div>
        </div>

        {/* Footer labels */}
        <div className="pt-2 space-y-1 border-t" style={{ borderColor: "var(--bg-border)" }}>
          <p
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Simulated Data · In Silico Environment
          </p>
          <p
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Target: {targetPathway}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
