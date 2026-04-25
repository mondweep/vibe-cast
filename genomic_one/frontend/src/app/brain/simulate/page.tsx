"use client";

import Link from "next/link";
import { Card, CardBody, Chip, Button } from "@heroui/react";

interface SimulationRecord {
  auditId: string;
  genotype: string;
  age: number;
  sex: string;
  ethnicity: string;
  indication: string;
  phenotype: string;
  phenotypeColor: "success" | "warning" | "danger" | "primary";
  date: string;
}

const SIMULATIONS: SimulationRecord[] = [
  {
    auditId: "ISC-2026-03-17-001",
    genotype: "CYP2D6 *1/*4",
    age: 52,
    sex: "Male",
    ethnicity: "European",
    indication: "Type 2 Diabetes",
    phenotype: "Intermediate Metabolizer",
    phenotypeColor: "warning",
    date: "2026-03-17",
  },
  {
    auditId: "ISC-2026-03-17-002",
    genotype: "CYP2D6 *4/*4",
    age: 38,
    sex: "Female",
    ethnicity: "East Asian",
    indication: "Oncology Screening",
    phenotype: "Poor Metabolizer",
    phenotypeColor: "danger",
    date: "2026-03-17",
  },
  {
    auditId: "ISC-2026-03-16-001",
    genotype: "CYP2D6 *1/*1",
    age: 65,
    sex: "Male",
    ethnicity: "African",
    indication: "Obesity",
    phenotype: "Normal Metabolizer",
    phenotypeColor: "success",
    date: "2026-03-16",
  },
  {
    auditId: "ISC-2026-03-16-002",
    genotype: "CYP2D6 *1/*10",
    age: 45,
    sex: "Female",
    ethnicity: "South Asian",
    indication: "Pain Management",
    phenotype: "Intermediate Metabolizer",
    phenotypeColor: "warning",
    date: "2026-03-16",
  },
  {
    auditId: "ISC-2026-03-15-001",
    genotype: "CYP2D6 *2/*2",
    age: 29,
    sex: "Male",
    ethnicity: "Hispanic",
    indication: "Type 2 Diabetes",
    phenotype: "Normal Metabolizer",
    phenotypeColor: "success",
    date: "2026-03-15",
  },
];

export default function SimulationsPage() {
  return (
    <div className="p-6 sm:p-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-1">
        <div>
          <span className="panel-label">Simulations</span>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            In Silico Case Studies
          </h1>
        </div>
        <Link href="/brain/simulate/new">
          <Button
            color="primary"
            size="md"
            className="font-semibold"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Simulation
          </Button>
        </Link>
      </div>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
        Pharmacogenomic patient simulations and clinical decision support
        results.
      </p>
      <div className="mb-8">
        <span
          className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
          style={{ color: "#f59e0b" }}
        >
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Simulation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SIMULATIONS.map((sim) => (
          <Card
            key={sim.auditId}
            className="panel-card genomic"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
            }}
          >
            <CardBody className="p-5 space-y-3">
              {/* Audit ID + Date */}
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: "var(--accent-teal)" }}
                >
                  {sim.auditId}
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {sim.date}
                </span>
              </div>

              {/* Genotype */}
              <div
                className="font-mono text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {sim.genotype}
              </div>

              {/* Phenotype chip */}
              <Chip size="sm" variant="flat" color={sim.phenotypeColor}>
                {sim.phenotype}
              </Chip>

              {/* Demographics */}
              <div className="flex flex-wrap gap-1.5">
                <div
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Age {sim.age}
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {sim.sex}
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {sim.ethnicity}
                </div>
              </div>

              {/* Indication */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  Indication:
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {sim.indication}
                </span>
              </div>

              {/* View Results link */}
              <div
                className="pt-2"
                style={{ borderTop: "1px solid var(--bg-border)" }}
              >
                <Link
                  href="/brain/simulate/new"
                  className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent-teal)" }}
                >
                  View Results
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <span
          className="text-[10px] font-mono uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Simulated Data {"\u00b7"} In Silico Environment
        </span>
      </div>
    </div>
  );
}
