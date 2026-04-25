"use client";

import { Card, CardBody, Chip, Progress } from "@heroui/react";

type LearningType = "genomic" | "neural" | "temporal" | "advisory";

interface Learning {
  title: string;
  pattern: string;
  confidence: number;
  evidence: number;
  prior?: string;
  lastUpdated: string;
  basedOn: string[];
  type: LearningType;
}

const learnings: Learning[] = [
  {
    title: "Sickle Cell Variant Signature",
    pattern: "A>T transversion at HBB codon 6",
    confidence: 95,
    evidence: 38,
    prior: "Beta(19,1)",
    lastUpdated: "2026-03-17",
    basedOn: ["Bayesian trait learning", "Savant AI"],
    type: "genomic",
  },
  {
    title: "CYP2D6 Poor Metabolizer Haplotype",
    pattern: "*4/*4 diplotype",
    confidence: 82,
    evidence: 22,
    prior: "Beta(9,2)",
    lastUpdated: "2026-03-16",
    basedOn: ["ruv-FANN VariantClassifier", "Bayesian"],
    type: "genomic",
  },
  {
    title: "TP53-BRCA1 DNA Repair Co-occurrence",
    pattern: "High k-mer similarity",
    confidence: 71,
    evidence: 14,
    lastUpdated: "2026-03-15",
    basedOn: ["RuVector HNSW", "MinCut pathway analysis"],
    type: "neural",
  },
  {
    title: "GLP-1 RA Dosing Stability",
    pattern: "Standard semaglutide dosing safe across CYP2D6 IM/NM",
    confidence: 88,
    evidence: 31,
    lastUpdated: "2026-03-15",
    basedOn: ["SAFLA validation", "Bayesian"],
    type: "advisory",
  },
  {
    title: "Age-Dependent INS Methylation Drift",
    pattern: "CpG methylation at INS locus shows age-dependent drift",
    confidence: 58,
    evidence: 9,
    lastUpdated: "2026-03-14",
    basedOn: ["Temporal Attractor (FTLE)", "Horvath Clock"],
    type: "temporal",
  },
  {
    title: "Epigenetic Age Calibration",
    pattern:
      "Predicted bio age within 3yr of chronological for Normal metabolizers",
    confidence: 74,
    evidence: 18,
    lastUpdated: "2026-03-14",
    basedOn: ["Bayesian", "ruv-FANN"],
    type: "temporal",
  },
];

const topBorderColors: Record<LearningType, string> = {
  genomic: "border-t-[var(--accent-teal)]",
  neural: "border-t-[var(--accent-purple)]",
  temporal: "border-t-[var(--accent-gold)]",
  advisory: "border-t-[var(--safla-green)]",
};

function confidenceColor(c: number): string {
  if (c >= 90) return "var(--accent-teal)";
  if (c >= 75) return "var(--accent-blue)";
  if (c >= 60) return "var(--accent-gold)";
  return "var(--accent-red)";
}

function confidenceHeroColor(c: number): "success" | "primary" | "warning" | "danger" {
  if (c >= 90) return "success";
  if (c >= 75) return "primary";
  if (c >= 60) return "warning";
  return "danger";
}

export default function LearningPage() {
  return (
    <div className="p-6 sm:p-10">
      <span className="panel-label">Learning</span>
      <p className="text-[var(--text-secondary)] text-sm max-w-2xl mb-8">
        Bayesian priors and long-term patterns built from accumulated
        intelligence
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {learnings.map((learning) => (
          <Card
            key={learning.title}
            className={`bg-surface border border-border border-t-3 ${topBorderColors[learning.type]}`}
          >
            <CardBody className="p-5 space-y-4">
              <div>
                <h3 className="font-mono font-bold text-sm leading-snug">
                  {learning.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {learning.pattern}
                </p>
              </div>

              {/* Confidence bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Confidence</span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: confidenceColor(learning.confidence) }}
                  >
                    {learning.confidence}%
                  </span>
                </div>
                <Progress
                  size="sm"
                  value={learning.confidence}
                  color={confidenceHeroColor(learning.confidence)}
                  className="max-w-full"
                  aria-label={`Confidence: ${learning.confidence}%`}
                />
              </div>

              {/* Meta details */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Evidence</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {learning.evidence} analyses
                  </span>
                </div>
                {learning.prior && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Prior</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {learning.prior}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Last updated</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {learning.lastUpdated}
                  </span>
                </div>
              </div>

              {/* Technology tags */}
              <div>
                <p className="text-[11px] text-[var(--text-muted)] mb-1.5">
                  Based on
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {learning.basedOn.map((tech) => (
                    <Chip
                      key={tech}
                      variant="flat"
                      size="sm"
                      classNames={{
                        base: "bg-[var(--bg-elevated)]",
                        content:
                          "text-[var(--text-secondary)] text-[11px]",
                      }}
                    >
                      {tech}
                    </Chip>
                  ))}
                </div>
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
