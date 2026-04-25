"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Tab, Card, CardBody, Chip } from "@heroui/react";

const BrainGraph3D = dynamic(() => import("@/components/BrainGraph3D"), {
  ssr: false,
  loading: () => <div className="h-[400px] rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />,
});

const LAYERS = [
  {
    key: "l1",
    label: "L1 — Genomic Core",
    color: "var(--accent-teal)",
    status: "ACTIVE",
    description: "Real human gene sequence analysis using rvdna",
    components: [
      { name: "Gene Panel", detail: "HBB, TP53, BRCA1, CYP2D6, INS — real coding sequences" },
      { name: "K-mer Vectorization", detail: "11-mer frequency vectors, 512 dimensions, cosine similarity" },
      { name: "Smith-Waterman", detail: "Local alignment with mapping quality scoring" },
      { name: "Variant Calling", detail: "Pileup-based SNP detection with sickle cell simulation" },
      { name: "Protein Translation", detail: "DNA to amino acid with contact graph prediction" },
      { name: "Epigenetic Clock", detail: "Horvath clock biological age estimation from CpG methylation" },
      { name: "Pharmacogenomics", detail: "CYP2D6 star allele calling, GLP-1 RA recommendations" },
      { name: "RVDNA Format", detail: "AI-native binary format with pre-indexed k-mer vectors" },
    ],
  },
  {
    key: "l2",
    label: "L2 — Vector + FACT",
    color: "var(--accent-blue)",
    status: "ACTIVE",
    description: "HNSW similarity search, graph analysis, literature retrieval",
    components: [
      { name: "RuVector HNSW", detail: "KmerIndex for fast approximate nearest neighbor search" },
      { name: "MinCut Pathways", detail: "Gene interaction graph partitioning for drug target identification" },
      { name: "Sublinear PageRank", detail: "Forward Push and Neumann series on gene interaction graphs" },
      { name: "FACT Literature", detail: "Fast Augmented Context retrieval — curated evidence base per finding" },
    ],
  },
  {
    key: "l3",
    label: "L3 — Neural + Diffusion",
    color: "var(--accent-purple)",
    status: "ACTIVE",
    description: "Neural classification and molecule generation",
    components: [
      { name: "ruv-FANN Classifier", detail: "3-layer feedforward network for variant pathogenicity (5-class)" },
      { name: "Drug Response Predictor", detail: "4-layer network predicting metabolizer phenotype from k-mer vectors" },
      { name: "Gene Cluster Embedding", detail: "Autoencoder compressing gene vectors for similarity clustering" },
      { name: "Agentic Diffusion", detail: "Candidate molecule generation with binding affinity and toxicity scoring" },
    ],
  },
  {
    key: "l4",
    label: "L4 — Bayesian + Temporal",
    color: "var(--accent-gold)",
    status: "ACTIVE",
    description: "Probabilistic reasoning and disease progression modelling",
    components: [
      { name: "Bayesian Priors", detail: "Beta/Normal distributions over variant pathogenicity, drug response, conservation" },
      { name: "Pattern Recognition", detail: "Sickle-cell signatures, CYP2D6 haplotypes, TP53-BRCA1 co-occurrence" },
      { name: "Temporal Attractor", detail: "FTLE-based disease trajectory projections (5-80 year horizons)" },
      { name: "Meta-Cognitive", detail: "Confidence scoring and uncertainty quantification per prediction" },
    ],
  },
  {
    key: "l5",
    label: "L5 — Decision / Advisory",
    color: "var(--accent-teal)",
    status: "ACTIVE",
    description: "Multi-signal synthesis for clinical decision support",
    components: [
      { name: "Signal Synthesis", detail: "Combines variant + neural + Bayesian signals into recommendations" },
      { name: "Drug Target ID", detail: "MinCut-informed drug target identification with pathway context" },
      { name: "Risk Assessment", detail: "Colour-coded risk flags (Low/Monitor/Action Required)" },
      { name: "Clinical Interpretation", detail: "CYP2D6 diplotype → metabolizer → GLP-1 RA dosing recommendation" },
    ],
  },
  {
    key: "l6",
    label: "L6 — SAFLA",
    color: "var(--safla-green)",
    status: "VALIDATED",
    description: "Safety validation, audit trail, and clinical override",
    components: [
      { name: "Confidence Threshold", detail: "Flags outputs below 80% model confidence" },
      { name: "Contraindication Check", detail: "Screens for known drug-drug interactions" },
      { name: "Population Coverage", detail: "Flags underrepresented allele frequencies by ethnicity" },
      { name: "Regulatory Classification", detail: "Maps recommendations to CPIC/PharmGKB guideline tiers" },
      { name: "Audit Trail", detail: "ISC-prefixed audit IDs with full provenance chain" },
      { name: "Clinical Override", detail: "Human-in-the-loop override mechanism for flagged outputs" },
    ],
  },
];

function IntelligenceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("layer") || "l1";

  const handleTabChange = (key: React.Key) => {
    router.push(`/brain/intelligence?layer=${String(key)}`, { scroll: false });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-6">
        <span className="panel-label">Intelligence Layers</span>
        <h1 className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
          7-Layer Intelligence System
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Each layer builds on the ones below it, creating progressively more sophisticated genomic understanding.
        </p>
      </div>

      <div className="panel-card neural mb-8">
        <span className="panel-label">Neural Intelligence Graph</span>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Real-time visualization of the 7-layer intelligence system
        </p>
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <BrainGraph3D />
        </div>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={handleTabChange}
        variant="underlined"
        classNames={{
          tabList: "gap-0 flex-wrap",
          tab: "font-mono text-xs",
          cursor: "bg-accent",
        }}
      >
        {LAYERS.map((layer) => (
          <Tab
            key={layer.key}
            title={
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: layer.color }}
                />
                {layer.label}
              </span>
            }
          >
            <div className="mt-6">
              <Card
                className="border"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--bg-border)',
                  borderTop: `2px solid ${layer.color}`,
                }}
              >
                <CardBody className="gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                      {layer.label}
                    </h2>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={layer.status === "VALIDATED" ? "success" : "primary"}
                    >
                      {layer.status}
                    </Chip>
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>{layer.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {layer.components.map((comp) => (
                      <div
                        key={comp.name}
                        className="rounded-lg p-4"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                      >
                        <div className="font-mono text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {comp.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {comp.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </Tab>
        ))}
      </Tabs>

      <p className="text-xs font-mono mt-6" style={{ color: 'var(--text-muted)' }}>
        Simulated Data · In Silico Environment
      </p>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>}>
      <IntelligenceContent />
    </Suspense>
  );
}
