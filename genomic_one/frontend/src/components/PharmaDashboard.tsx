"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Chip, Progress, Button } from "@heroui/react";
import { getPharma } from "@/lib/api";
import { saflaValidation } from "@/lib/static-data";
import EvidenceBase, { Reference } from "@/components/EvidenceBase";

const PHARMA_REFERENCES: Reference[] = [
  { title: "CYP2D6 pharmacogenomics and GLP-1 receptor agonist metabolism", source: "Clinical Pharmacology & Therapeutics", year: 2024, relevance: 4 },
  { title: "Semaglutide metabolic pathways in type 2 diabetes management", source: "NEJM", year: 2023, relevance: 3 },
  { title: "PharmGKB CYP2D6 clinical annotation — drug dosing guidelines", source: "PharmGKB", year: 2024, relevance: 5 },
  { title: "Impact of CYP2D6 polymorphisms on incretin-based therapy outcomes", source: "Diabetes Care", year: 2023, relevance: 4 },
];

interface PharmaResult {
  sequence_length: number;
  allele1: { name: string; activity: number };
  allele2: { name: string; activity: number };
  phenotype: string;
  recommendations: { drug: string; recommendation: string; dose_factor: number }[];
}

const PHENOTYPE_COLORS: Record<string, "success" | "warning" | "danger" | "primary"> = {
  Normal: "success",
  Intermediate: "warning",
  Poor: "danger",
  Ultrarapid: "primary",
};

const PHENOTYPE_DESCRIPTIONS: Record<string, string> = {
  Normal: "Standard drug metabolism. Most medications dosed per label.",
  Intermediate: "Reduced enzyme activity. Some drugs may accumulate or show altered efficacy.",
  Poor: "Minimal enzyme activity. Significant risk of adverse drug reactions at standard doses.",
  Ultrarapid: "Increased enzyme activity. Prodrugs may convert too rapidly; active drugs may be cleared too fast.",
};

type RiskLevel = "low" | "moderate" | "high";

function getRiskLevel(doseFactor: number, drug: string): RiskLevel {
  if (doseFactor < 0.6) return "high";
  if (doseFactor < 0.9 && doseFactor !== 1.0) return "moderate";
  if (drug.includes("GLP-1")) return "low";
  return "low";
}

const RISK_CONFIG: Record<RiskLevel, { color: string; label: string; chipColor: "success" | "warning" | "danger" }> = {
  low: { color: "#10b981", label: "Low Risk", chipColor: "success" },
  moderate: { color: "#f59e0b", label: "Monitor", chipColor: "warning" },
  high: { color: "#f43f5e", label: "Action Required", chipColor: "danger" },
};

export default function PharmaDashboard() {
  const [data, setData] = useState<PharmaResult | null>(null);

  useEffect(() => {
    getPharma().then(setData);
  }, []);

  if (!data) return <div className="h-48 animate-pulse bg-surface-2 rounded" />;

  const totalActivity = data.allele1.activity + data.allele2.activity;
  const allele1Display = data.allele1.name.replace("Star", "*");
  const allele2Display = data.allele2.name.replace("Star", "*");
  const diplotype = `${allele1Display}/${allele2Display}`;

  return (
    <div className="space-y-5">
      {/* Clinical Genotype Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Diplotype Card */}
        <Card className="bg-surface-2 border border-border">
          <CardBody className="gap-2">
            <div className="text-xs text-zinc-400">CYP2D6 Diplotype</div>
            <div className="text-2xl font-mono font-bold">{diplotype}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                <span className="text-xs text-zinc-400">Allele 1:</span>
                <span className="text-xs font-mono">{allele1Display} ({data.allele1.activity.toFixed(1)})</span>
              </div>
              <span className="text-zinc-400">|</span>
              <div className="flex gap-1">
                <span className="text-xs text-zinc-400">Allele 2:</span>
                <span className="text-xs font-mono">{allele2Display} ({data.allele2.activity.toFixed(1)})</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Metabolizer Phenotype Card */}
        <Card className="bg-surface-2 border border-border">
          <CardBody className="gap-2">
            <div className="text-xs text-zinc-400">Metabolizer Phenotype</div>
            <div className="flex items-center gap-2 mt-1">
              <Chip color={PHENOTYPE_COLORS[data.phenotype] || "default"} variant="flat" size="lg">
                {data.phenotype} Metabolizer
              </Chip>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {PHENOTYPE_DESCRIPTIONS[data.phenotype] || ""}
            </div>
          </CardBody>
        </Card>

        {/* Activity Score Card */}
        <Card className="bg-surface-2 border border-border">
          <CardBody className="gap-2">
            <div className="text-xs text-zinc-400">Activity Score</div>
            <div className="text-2xl font-mono font-bold">{totalActivity.toFixed(1)}</div>
            <Progress
              value={totalActivity * 50}
              maxValue={100}
              size="sm"
              classNames={{
                indicator: totalActivity < 0.5 ? "bg-red-500" : totalActivity < 1.5 ? "bg-amber-500" : "bg-green-500",
                track: "bg-zinc-800",
              }}
            />
            <div className="text-xs text-zinc-400">{data.sequence_length} bp analyzed</div>
          </CardBody>
        </Card>
      </div>

      {/* Drug-Gene Interaction Table with Risk Flags */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-zinc-400 text-xs">
              <th className="text-left py-2 px-3 font-medium">Risk</th>
              <th className="text-left py-2 px-3 font-medium">Drug</th>
              <th className="text-left py-2 px-3 font-medium">Clinical Recommendation</th>
              <th className="text-left py-2 px-3 font-medium">Dose Adjustment</th>
            </tr>
          </thead>
          <tbody>
            {data.recommendations.map((rec, i) => {
              const risk = getRiskLevel(rec.dose_factor, rec.drug);
              const config = RISK_CONFIG[risk];
              return (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-3">
                    <Chip size="sm" variant="flat" color={config.chipColor} className="min-w-[80px] text-center">
                      {config.label}
                    </Chip>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-semibold">{rec.drug}</span>
                    {rec.drug.includes("GLP-1") && (
                      <span className="ml-2 text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                        GLP-1
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-zinc-300 max-w-md">{rec.recommendation}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(rec.dose_factor * 80, 10)}px`,
                          backgroundColor: config.color,
                        }}
                      />
                      <span className="font-mono text-xs">{rec.dose_factor}x</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Clinical Interpretation Note */}
      <div className="bg-zinc-800/30 border border-border rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-400 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div>
            <p className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Clinical Interpretation:</span>{" "}
              CYP2D6 {diplotype} — {data.phenotype} Metabolizer (activity score {totalActivity.toFixed(1)}).
              {data.phenotype === "Intermediate" && " Standard semaglutide dosing appropriate. Monitor for elevated plasma concentration at initiation. GLP-1 receptor agonists are primarily cleared via DPP-4 proteolysis and renal elimination, with minimal CYP2D6 involvement."}
              {data.phenotype === "Poor" && " Exercise caution with CYP2D6-dependent substrates. GLP-1 analogues may be preferred due to non-CYP metabolism pathways."}
              {data.phenotype === "Normal" && " No pharmacogenomic dose adjustments required for standard medications."}
            </p>
          </div>
        </div>
      </div>

      {/* FACT Literature Evidence */}
      <EvidenceBase references={PHARMA_REFERENCES} />

      {/* SAFLA Safety Validation */}
      <Card className="bg-surface-2 border border-border">
        <CardBody className="gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 12 15 16 10" />
                </svg>
              </span>
              <span className="font-semibold text-sm">SAFLA Validated</span>
              <Chip
                size="sm"
                variant="flat"
                color={
                  saflaValidation.status === "passed"
                    ? "success"
                    : saflaValidation.status === "warning"
                      ? "warning"
                      : "danger"
                }
              >
                {saflaValidation.status === "passed"
                  ? "PASSED"
                  : saflaValidation.status === "warning"
                    ? "WARNING"
                    : "FLAGGED"}
              </Chip>
            </div>
            <span className="text-[10px] text-zinc-400">Powered by SAFLA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-zinc-400">Audit ID</span>
              <div className="font-mono mt-0.5">{saflaValidation.audit_id}</div>
            </div>
            <div>
              <span className="text-zinc-400">Confidence</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Progress
                  value={saflaValidation.confidence * 100}
                  maxValue={100}
                  size="sm"
                  classNames={{
                    indicator: "bg-green-500",
                    track: "bg-zinc-800",
                  }}
                  className="max-w-[100px]"
                />
                <span className="font-mono">{(saflaValidation.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <span className="text-zinc-400">Regulatory Standard</span>
              <div className="mt-0.5">{saflaValidation.regulatory_standard}</div>
            </div>
          </div>

          <div className="space-y-2">
            {saflaValidation.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 ${check.status === "passed" ? "text-green-400" : check.status === "warning" ? "text-amber-400" : "text-red-400"}`}>
                  {check.status === "passed" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : check.status === "warning" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </span>
                <div>
                  <span className="font-medium text-zinc-300">{check.name}</span>
                  <Chip
                    size="sm"
                    variant="dot"
                    color={check.status === "passed" ? "success" : check.status === "warning" ? "warning" : "danger"}
                    className="ml-2 scale-90"
                  >
                    {check.status.toUpperCase()}
                  </Chip>
                  <p className="text-zinc-400 mt-0.5">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-zinc-400">Simulated Data · In Silico Environment</span>
            <Button size="sm" variant="flat" color="primary" className="text-xs">
              Clinical Override →
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
