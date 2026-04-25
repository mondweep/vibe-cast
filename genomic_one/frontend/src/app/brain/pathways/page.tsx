"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { getMolecules } from "@/lib/api";
import {
  moleculeData as fallbackMoleculeData,
  pathwaysData,
} from "@/lib/static-data";
import MoleculeCard, { MoleculeCandidate } from "@/components/MoleculeCard";

interface MoleculeResult {
  target_pathway: string;
  candidates: MoleculeCandidate[];
}

// Node positions for the SVG graph (hand-tuned for clarity)
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  TP53: { x: 180, y: 120 },
  BRCA1: { x: 100, y: 220 },
  MDM2: { x: 260, y: 220 },
  EGFR: { x: 420, y: 120 },
  KRAS: { x: 500, y: 220 },
  CYP2D6: { x: 420, y: 310 },
  INS: { x: 520, y: 310 },
  HBB: { x: 470, y: 400 },
};

const NODE_TYPE_COLORS: Record<string, string> = {
  suppressor: "var(--accent-teal)",
  oncogene: "var(--accent-red)",
  metabolic: "var(--accent-gold)",
  structural: "var(--accent-blue)",
};

const NODE_TYPE_LABELS: Record<string, string> = {
  suppressor: "Tumor Suppressor",
  oncogene: "Oncogene",
  metabolic: "Metabolic",
  structural: "Structural",
};

function isMinCutEdge(sourceName: string, targetName: string): boolean {
  return pathwaysData.mincut.cut_edges.some(
    (e) =>
      (e.source === sourceName && e.target === targetName) ||
      (e.source === targetName && e.target === sourceName)
  );
}

export default function PathwaysPage() {
  const [molecules, setMolecules] =
    useState<MoleculeResult>(fallbackMoleculeData);

  useEffect(() => {
    getMolecules().then((d) => setMolecules(d as MoleculeResult));
  }, []);

  return (
    <div className="p-6 sm:p-10">
      {/* Header */}
      <span className="panel-label">Pathways</span>
      <h1
        className="text-2xl font-bold tracking-tight mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        MinCut Gene Interaction Analysis
      </h1>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
        Biological pathway analysis, gene interaction networks, and signal
        cascades.
      </p>
      <div className="mb-8">
        <span
          className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
          style={{ color: "#f59e0b" }}
        >
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Gene Interaction Network */}
      <div className="flex items-center gap-3 mb-1">
        <h2
          className="font-mono text-xs tracking-[0.15em] uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          Gene Interaction Network
        </h2>
        <Chip
          size="sm"
          variant="flat"
          color="secondary"
          className="text-[10px] tracking-wider uppercase"
        >
          Layer 2
        </Chip>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        8-node gene network with MinCut partition overlay
      </p>

      <Card
        className="panel-card neural"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
        }}
      >
        <CardBody className="p-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: NODE_TYPE_COLORS[type] }}
                />
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-0.5"
                style={{ background: "var(--accent-red)" }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                MinCut Edge
              </span>
            </div>
          </div>

          {/* SVG Graph */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 620 460"
              className="w-full"
              style={{ maxWidth: 720, minWidth: 400 }}
            >
              {/* Partition backgrounds */}
              <rect
                x="50"
                y="70"
                width="260"
                height="210"
                rx="16"
                fill="rgba(0,201,177,0.04)"
                stroke="rgba(0,201,177,0.15)"
                strokeWidth="1"
                strokeDasharray="6 3"
              />
              <text
                x="60"
                y="90"
                fill="rgba(0,201,177,0.4)"
                fontSize="10"
                fontFamily="monospace"
              >
                PARTITION A
              </text>

              <rect
                x="370"
                y="70"
                width="210"
                height="370"
                rx="16"
                fill="rgba(255,77,77,0.04)"
                stroke="rgba(255,77,77,0.15)"
                strokeWidth="1"
                strokeDasharray="6 3"
              />
              <text
                x="380"
                y="90"
                fill="rgba(255,77,77,0.4)"
                fontSize="10"
                fontFamily="monospace"
              >
                PARTITION B
              </text>

              {/* Edges */}
              {pathwaysData.edges.map((edge, i) => {
                const sourceNode = pathwaysData.nodes[edge.source];
                const targetNode = pathwaysData.nodes[edge.target];
                const sourcePos = NODE_POSITIONS[sourceNode.gene_name];
                const targetPos = NODE_POSITIONS[targetNode.gene_name];
                const isCut = isMinCutEdge(
                  sourceNode.gene_name,
                  targetNode.gene_name
                );

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke={
                        isCut ? "var(--accent-red)" : "var(--bg-border)"
                      }
                      strokeWidth={isCut ? 2.5 : 1.5}
                      strokeDasharray={isCut ? "6 3" : "none"}
                      opacity={isCut ? 1 : 0.6}
                    />
                    {/* Weight label at midpoint */}
                    <text
                      x={(sourcePos.x + targetPos.x) / 2 + 4}
                      y={(sourcePos.y + targetPos.y) / 2 - 4}
                      fill={
                        isCut
                          ? "var(--accent-red)"
                          : "var(--text-muted)"
                      }
                      fontSize="9"
                      fontFamily="monospace"
                      opacity={0.7}
                    >
                      {edge.weight.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {pathwaysData.nodes.map((node) => {
                const pos = NODE_POSITIONS[node.gene_name];
                const color = NODE_TYPE_COLORS[node.node_type];
                return (
                  <g key={node.gene_name}>
                    {/* Glow */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="26"
                      fill={color}
                      opacity={0.08}
                    />
                    {/* Node circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="20"
                      fill="var(--bg-elevated)"
                      stroke={color}
                      strokeWidth="2"
                    />
                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={color}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.gene_name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </CardBody>
      </Card>

      {/* MinCut Results */}
      <div className="mt-6">
        <Card
          className="panel-card genomic"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                MinCut Results
              </h3>
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-[10px]"
              >
                Graph Analysis
              </Chip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cut Value */}
              <div>
                <span
                  className="text-[10px] uppercase tracking-wider font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cut Value
                </span>
                <div
                  className="text-2xl font-mono font-bold mt-1"
                  style={{ color: "var(--accent-teal)" }}
                >
                  {pathwaysData.mincut.cut_value.toFixed(2)}
                </div>
              </div>

              {/* Cut Edges */}
              <div>
                <span
                  className="text-[10px] uppercase tracking-wider font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cut Edges
                </span>
                <div className="mt-1 space-y-1">
                  {pathwaysData.mincut.cut_edges.map((edge, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono flex items-center gap-1.5"
                      style={{ color: "var(--accent-red)" }}
                    >
                      <span>{edge.source}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                      <span>{edge.target}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partitions */}
              <div>
                <span
                  className="text-[10px] uppercase tracking-wider font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  Partitions
                </span>
                <div className="mt-1 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    <span
                      className="text-[10px] font-mono mr-1"
                      style={{ color: "var(--accent-teal)" }}
                    >
                      A:
                    </span>
                    {pathwaysData.mincut.partitions[0].map((g) => (
                      <Chip
                        key={g}
                        size="sm"
                        variant="flat"
                        color="success"
                        className="text-[10px]"
                      >
                        {g}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className="text-[10px] font-mono mr-1"
                      style={{ color: "var(--accent-red)" }}
                    >
                      B:
                    </span>
                    {pathwaysData.mincut.partitions[1].map((g) => (
                      <Chip
                        key={g}
                        size="sm"
                        variant="flat"
                        color="danger"
                        className="text-[10px]"
                      >
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drug Target Implication */}
            <div
              className="rounded-lg px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-secondary)",
              }}
            >
              <span
                className="block text-[10px] uppercase tracking-wider font-mono mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Drug Target Implication
              </span>
              The BRCA1-EGFR and KRAS-TP53 cut edges represent key
              vulnerabilities in the gene interaction network. Disrupting these
              connections (e.g., via EGFR inhibitors or KRAS-targeted therapies)
              may isolate the tumor-suppressive partition from oncogenic
              signaling, creating a therapeutic window for combination therapy.
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Molecule Generation Section */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-1">
          <h2
            className="font-mono text-xs tracking-[0.15em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Molecule Generation
          </h2>
          <Chip
            size="sm"
            variant="flat"
            color="secondary"
            className="text-[10px] tracking-wider uppercase"
          >
            Layer 3
          </Chip>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Candidate structures identified by Agentic Diffusion targeting{" "}
          {molecules.target_pathway}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {molecules.candidates.map((candidate) => (
            <MoleculeCard
              key={candidate.id}
              candidate={candidate}
              targetPathway={molecules.target_pathway}
            />
          ))}
        </div>
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
