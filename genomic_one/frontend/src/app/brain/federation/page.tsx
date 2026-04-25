"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { federationData } from "@/lib/static-data";

export default function FederationPage() {
  const { nodes, total_sequences, active_nodes, total_nodes } = federationData;

  return (
    <div className="p-6 sm:p-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Federated MCP Deployment Architecture
        </h1>
        <Chip
          variant="flat"
          size="sm"
          classNames={{
            base: "bg-green-500/15",
            content: "text-green-400",
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {active_nodes}/{total_nodes} Nodes Connected
          </span>
        </Chip>
      </div>
      <p className="text-zinc-400 text-sm max-w-2xl">
        Genomic data never leaves its jurisdiction. Intelligence compounds globally.
        GDPR Article 44 compliant by architecture.
      </p>

      {/* Node status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {nodes.map((node) => (
          <Card key={node.id} className="bg-surface border border-border">
            <CardBody className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{node.flag}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{node.name}</h3>
                    <p className="text-xs text-zinc-400">{node.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-400 capitalize">{node.status}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Sequences</span>
                  <span className="font-mono text-zinc-300">
                    {(node.sequences / 1_000_000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Role</span>
                  <span className="text-zinc-300">{node.role}</span>
                </div>
              </div>

              <Chip
                variant="flat"
                size="sm"
                classNames={{
                  base: "bg-zinc-800",
                  content: "text-zinc-400 text-[11px]",
                }}
              >
                Data stays in {node.country}
              </Chip>
            </CardBody>
          </Card>
        ))}

        {/* Summary card */}
        <Card className="bg-surface border border-border">
          <CardBody className="p-4 flex flex-col justify-center items-center gap-3">
            <div className="text-3xl font-bold text-accent">
              {(total_sequences / 1_000_000).toFixed(1)}M
            </div>
            <p className="text-xs text-zinc-400 text-center">Total Sequences Across Federation</p>
            <Chip
              variant="flat"
              size="sm"
              classNames={{
                base: "bg-accent/15",
                content: "text-accent",
              }}
            >
              Federated MCP
            </Chip>
          </CardBody>
        </Card>
      </div>

      {/* Data flow diagram */}
      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-4">Data Flow Architecture</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          <FlowStep label="Local Processing" detail="Raw genomic data analysed on-site" />
          <FlowArrow />
          <FlowStep label="Anonymised Embeddings" detail="Vectors stripped of PII" />
          <FlowArrow />
          <FlowStep label="Global Intelligence" detail="Federated model updates" />
        </div>
        <p className="text-[10px] text-zinc-400 mt-4 text-center">
          Simulated Data · In Silico Environment
        </p>
      </div>
    </div>
  );
}

function FlowStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-3 rounded-lg border border-border bg-surface-2 min-w-[160px]">
      <span className="text-sm font-semibold text-zinc-200">{label}</span>
      <span className="text-[11px] text-zinc-400 mt-1">{detail}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="text-zinc-400 px-2 sm:rotate-0 rotate-90">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </div>
  );
}
