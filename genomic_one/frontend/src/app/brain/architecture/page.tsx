"use client";

import { useState } from "react";
import { Accordion, AccordionItem, Button, Chip } from "@heroui/react";
import { motion } from "framer-motion";

interface LayerTech {
  name: string;
  url?: string;
}

interface LayerData {
  id: string;
  number: string;
  name: string;
  status: string;
  color: string;
  summary: string;
  technologies: LayerTech[];
  details: string[];
}

const LAYERS: LayerData[] = [
  {
    id: "l1",
    number: "L1",
    name: "Genomic Core + MidStream",
    status: "ACTIVE",
    color: "var(--accent-teal)",
    summary: "Rust DNA analysis library with real-time SSE streaming",
    technologies: [
      { name: "rvdna" },
      { name: "MidStream" },
    ],
    details: [
      "k-mer vectorization, Smith-Waterman alignment, variant calling",
      "Real-time SSE streaming",
      "Gene panel: HBB, TP53, BRCA1, CYP2D6, INS (real human coding sequences)",
      "RVDNA binary format: AI-native with pre-indexed k-mer vectors",
    ],
  },
  {
    id: "l2",
    number: "L2",
    name: "Vector + FACT",
    status: "ACTIVE",
    color: "var(--accent-blue)",
    summary: "Vector database with HNSW indexing, sparse solvers, and literature retrieval",
    technologies: [
      { name: "RuVector" },
      { name: "Sublinear" },
      { name: "FACT" },
    ],
    details: [
      "Self-learning vector database with HNSW indexing and graph neural networks",
      "O(log n) sparse solvers via ruvector-solver",
      "Fast Augmented Context Tools for literature retrieval",
      "MinCut pathway analysis for drug target identification (gene interaction graph partitioning)",
    ],
  },
  {
    id: "l3",
    number: "L3",
    name: "Neural + Diffusion",
    status: "ACTIVE",
    color: "var(--accent-purple)",
    summary: "Neural network classification and molecule generation",
    technologies: [
      { name: "ruv-FANN" },
      { name: "Agentic Diffusion" },
    ],
    details: [
      "Pure Rust neural network framework (feedforward, cascade correlation)",
      "Molecule generation with SMILES-based candidate design",
      "Models: VariantClassifier [512,128,5], DrugResponsePredictor [512,256,64,3], GeneClusterEmbedding autoencoder",
      "Sub-100ms inference, no GPU required",
    ],
  },
  {
    id: "l4",
    number: "L4",
    name: "Bayesian + Temporal",
    status: "ACTIVE",
    color: "var(--accent-gold)",
    summary: "Probabilistic reasoning with temporal disease progression modelling",
    technologies: [
      { name: "Savant AI" },
      { name: "Temporal Attractor Studio" },
    ],
    details: [
      "Bayesian trait-based probabilistic reasoning with meta-cognition",
      "FTLE disease progression modelling",
      "Priors: Beta/Normal distributions over variant pathogenicity, drug response, epigenetic drift",
      "Updates incrementally with each analysis run",
    ],
  },
  {
    id: "l5",
    number: "L5",
    name: "Decision / Advisory",
    status: "ACTIVE",
    color: "var(--accent-teal)",
    summary: "Multi-signal synthesis combining all lower layers into clinical recommendations",
    technologies: [],
    details: [
      "Outputs: CYP2D6/GLP-1 pharmacogenomics, drug targets, risk flags",
      "Formats: Clinical decision cards matching PharmGKB/CPIC standards",
    ],
  },
  {
    id: "l6",
    number: "L6",
    name: "SAFLA Safety Validation",
    status: "VALIDATED",
    color: "var(--safla-green)",
    summary: "Every advisory output passes through safety gates before surfacing",
    technologies: [
      { name: "SAFLA" },
    ],
    details: [
      "Production-ready AI safety system with meta-cognitive reasoning",
      "Checks: confidence threshold, contraindication, population coverage, regulatory classification",
      "Audit trail: ISC-prefixed IDs with full provenance chain",
    ],
  },
  {
    id: "deploy",
    number: "MCP",
    name: "Federated MCP",
    status: "5/5 NODES",
    color: "var(--federation-node)",
    summary: "5 globally distributed nodes for GDPR-compliant genomic data processing",
    technologies: [
      { name: "Federated MCP", url: "https://github.com/ruvnet/federated-mcp" },
    ],
    details: [
      "Each node processes data locally; only anonymised embeddings cross borders",
    ],
  },
];

const FLOW_STEPS = [
  { label: "Sequence Data", color: "var(--text-primary)" },
  { label: "L1 Genomic Core", color: "var(--accent-teal)" },
  { label: "L2 Vector + FACT", color: "var(--accent-blue)" },
  { label: "L3 Neural + Diffusion", color: "var(--accent-purple)" },
  { label: "L4 Bayesian + Temporal", color: "var(--accent-gold)" },
  { label: "L5 Decision / Advisory", color: "var(--accent-teal)" },
  { label: "L6 SAFLA Validation", color: "var(--safla-green)" },
  { label: "Federated MCP", color: "var(--federation-node)" },
];

const ASCII_ARCH = `Deployment:  Federated MCP (5 nodes, GDPR-compliant)
Layer 6:     SAFLA Safety Validation
Layer 5:     Decision / Advisory (GLP-1 Pharmacogenomics)
Layer 4:     Bayesian + Temporal Attractor (FTLE)
Layer 3:     ruv-FANN + Agentic Diffusion (Molecules)
Layer 2:     RuVector/MinCut + FACT (Literature)
Layer 1:     rvdna + MidStream (Real-time Streaming)`;

function chipColor(layerColor: string): "warning" | "success" | "primary" | "secondary" | "default" | "danger" {
  if (layerColor.includes("gold")) return "warning";
  if (layerColor.includes("green") || layerColor.includes("safla")) return "success";
  if (layerColor.includes("blue")) return "primary";
  if (layerColor.includes("purple")) return "secondary";
  if (layerColor.includes("teal")) return "default";
  if (layerColor.includes("federation")) return "danger";
  return "default";
}

export default function ArchitecturePage() {
  const [copied, setCopied] = useState(false);

  const copyArch = async () => {
    try {
      await navigator.clipboard.writeText(ASCII_ARCH);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="panel-label mb-0">System Architecture</span>
          <Chip size="sm" variant="flat" color="warning" className="font-mono text-[10px]">
            Development
          </Chip>
        </div>
        <h1 className="text-2xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>
          7-Layer Genomic Intelligence Pipeline
        </h1>
      </div>

      {/* Architecture Diagram — Accordion Stack */}
      <Accordion
        variant="light"
        selectionMode="multiple"
        className="px-0 gap-1"
        itemClasses={{
          base: "px-0",
          trigger: "px-0 py-0",
          content: "px-0 pt-0 pb-2",
        }}
      >
        {LAYERS.map((layer, idx) => (
          <AccordionItem
            key={layer.id}
            aria-label={layer.name}
            classNames={{
              base: "mb-1",
            }}
            title={
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.3 }}
                className="relative overflow-hidden rounded-lg transition-all duration-200 hover:brightness-110 w-full"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderLeft: `4px solid ${layer.color}`,
                }}
              >
                <div className="px-5 py-3 flex items-center gap-4">
                  <div
                    className="font-mono text-xs font-bold w-8 text-center flex-shrink-0"
                    style={{ color: layer.color }}
                  >
                    {layer.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {layer.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {layer.summary}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-1 rounded"
                      style={{
                        color: layer.color,
                        background: `${layer.color}15`,
                      }}
                    >
                      {layer.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            }
          >
            <div
              className="ml-4 rounded-b-lg px-5 py-4 space-y-3"
              style={{
                background: "var(--bg-elevated)",
                borderLeft: `4px solid ${layer.color}`,
                borderRight: "1px solid var(--bg-border)",
                borderBottom: "1px solid var(--bg-border)",
              }}
            >
              {/* Technology chips */}
              {layer.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {layer.technologies.map((tech) => (
                    <Chip
                      key={tech.name}
                      size="sm"
                      variant="flat"
                      color={chipColor(layer.color)}
                      className="font-mono text-xs"
                    >
                      {tech.url ? (
                        <a
                          href={tech.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {tech.name}
                        </a>
                      ) : (
                        tech.name
                      )}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Detail bullets */}
              <ul className="space-y-1.5">
                {layer.details.map((detail, i) => (
                  <li
                    key={i}
                    className="text-xs font-mono flex items-start gap-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: layer.color }}
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Data Flow */}
      <div
        className="mt-10 rounded-lg p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        <span className="panel-label">Data Flow Pipeline</span>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {FLOW_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="font-mono text-xs font-semibold px-2.5 py-1 rounded"
                style={{
                  color: step.color,
                  background: `${step.color}12`,
                  border: `1px solid ${step.color}30`,
                }}
              >
                {step.label}
              </span>
              {i < FLOW_STEPS.length - 1 && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: "var(--accent-teal)" }}
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-4">
        <Button
          variant="bordered"
          size="sm"
          onPress={copyArch}
          className="font-mono text-xs"
          style={{ borderColor: "var(--bg-border)", color: "var(--text-secondary)" }}
        >
          {copied ? "Copied" : "Copy Architecture"}
        </Button>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          Simulated Data · In Silico Environment
        </span>
      </div>
    </div>
  );
}
