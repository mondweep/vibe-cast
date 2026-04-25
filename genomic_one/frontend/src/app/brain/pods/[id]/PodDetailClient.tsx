"use client";

import Link from "next/link";
import { Card, CardBody, Chip, Progress, Tabs, Tab } from "@heroui/react";
import { researchPodsData } from "@/lib/static-data";

type PodStatus = "running" | "blocked" | "completed" | "paused";

const STATUS_COLORS: Record<PodStatus, string> = {
  running: "var(--accent-teal)",
  completed: "var(--safla-green)",
  blocked: "var(--accent-red)",
  paused: "var(--accent-gold)",
};

const STATUS_CARD_CLASS: Record<PodStatus, string> = {
  running: "genomic",
  completed: "safla",
  blocked: "flagged",
  paused: "warning",
};

const AGENT_STATUS_COLORS: Record<string, string> = {
  working: "var(--safla-green)",
  active: "var(--safla-green)",
  waiting: "var(--accent-gold)",
  idle: "var(--text-muted)",
  completed: "var(--accent-teal)",
};

/* Mock timeline events per pod */
const TIMELINE_EVENTS: Record<string, Array<{ time: string; agent: string; event: string; icon: string }>> = {
  "POD-2026-001": [
    { time: "06:00", agent: "System", event: "Pod created: CYP2D6 GLP-1 Interaction Deep Dive", icon: "+" },
    { time: "06:02", agent: "Helix", event: "Literature review phase initiated", icon: "R" },
    { time: "06:15", agent: "Primer", event: "Assigned to PubMed literature scan", icon: "A" },
    { time: "07:30", agent: "Primer", event: "Learning captured: CYP2D6*4 shows reduced affinity for semaglutide metabolites", icon: "L" },
    { time: "08:00", agent: "Strand", event: "Assigned to k-mer similarity analysis on CYP2D6 variant sequences", icon: "A" },
    { time: "09:15", agent: "Helix", event: "Phase transition: Literature Review -> Hypothesis", icon: "P" },
    { time: "10:00", agent: "Codon", event: "Assigned to MinCut pathway analysis", icon: "A" },
    { time: "11:30", agent: "Helix", event: "Phase transition: Hypothesis -> Experiment", icon: "P" },
    { time: "13:00", agent: "Helix", event: "Phase transition: Experiment -> Analysis", icon: "P" },
    { time: "13:15", agent: "Helix", event: "Cross-referencing PharmGKB CYP2D6 entries with GLP-1 RA clinical trials", icon: "W" },
  ],
  "POD-2026-002": [
    { time: "08:00", agent: "System", event: "Pod created: BRCA1 Drug Target Identification", icon: "+" },
    { time: "08:05", agent: "Helix", event: "Literature review phase initiated", icon: "R" },
    { time: "09:00", agent: "Fragment", event: "Assigned to SMILES candidate generation via Agentic Diffusion", icon: "A" },
    { time: "10:30", agent: "Bond", event: "Assigned to binding affinity evaluation", icon: "A" },
    { time: "11:00", agent: "Helix", event: "Phase transition: Literature Review -> Hypothesis", icon: "P" },
    { time: "12:30", agent: "Helix", event: "Phase transition: Hypothesis -> Experiment", icon: "P" },
    { time: "13:00", agent: "Fragment", event: "Blocker raised: Insufficient BRCA1 crystallography data for binding pocket modeling", icon: "B" },
  ],
  "POD-2026-003": [
    { time: "10:00", agent: "System", event: "Pod created: Sickle Cell Variant Classification", icon: "+" },
    { time: "10:05", agent: "Helix", event: "Literature review phase initiated", icon: "R" },
    { time: "11:00", agent: "Strand", event: "Assigned to ruv-FANN classifier training", icon: "A" },
    { time: "14:00", agent: "Helix", event: "Phase transition: Experiment -> Analysis", icon: "P" },
    { time: "17:00", agent: "Strand", event: "Learning captured: HBB E6V variant correctly classified pathogenic with 0.97 confidence", icon: "L" },
    { time: "19:00", agent: "Helix", event: "Phase transition: Analysis -> Reporting", icon: "P" },
    { time: "21:30", agent: "Helix", event: "Pod completed - all tasks finished", icon: "C" },
  ],
  "POD-2026-004": [
    { time: "09:00", agent: "System", event: "Pod created: T2D Epigenetic Trajectory Validation", icon: "+" },
    { time: "09:05", agent: "Helix", event: "Literature review phase initiated", icon: "R" },
    { time: "10:00", agent: "Epoch", event: "Assigned to Temporal Attractor model validation", icon: "A" },
    { time: "11:30", agent: "Helix", event: "Phase transition: Literature Review -> Hypothesis -> Experiment", icon: "P" },
    { time: "12:00", agent: "Helix", event: "Blocker raised: Waiting for cohort dataset access approval", icon: "B" },
  ],
};

/* Mock learnings per pod */
const LEARNINGS_DATA: Record<string, Array<{ content: string; confidence: number; source: string; agent: string; promoted: boolean }>> = {
  "POD-2026-001": [
    { content: "CYP2D6*4 allele shows reduced metabolic affinity for semaglutide intermediate metabolites via CYP3A4 cross-pathway interaction", confidence: 0.88, source: "pattern", agent: "Primer", promoted: true },
    { content: "PharmGKB Level 2A evidence supports CYP2D6 intermediate metabolizer dose adjustment for GLP-1 RAs in combination therapy", confidence: 0.82, source: "reflection", agent: "Helix", promoted: true },
    { content: "K-mer similarity between CYP2D6*4 and CYP2D6*10 variant regions is 0.73, suggesting shared metabolic impact", confidence: 0.76, source: "agent", agent: "Strand", promoted: false },
    { content: "No statistically significant interaction found between CYP2D6 poor metabolizer status and liraglutide clearance (p=0.34)", confidence: 0.91, source: "agent", agent: "Primer", promoted: true },
    { content: "GLP-1 RA hepatic metabolism primarily via DPP-4, not CYP2D6 - direct interaction unlikely for monotherapy", confidence: 0.85, source: "pattern", agent: "Helix", promoted: true },
    { content: "CYP2D6-GLP1R interaction graph shows MinCut value of 0.45 - weak pathway coupling", confidence: 0.69, source: "agent", agent: "Codon", promoted: false },
    { content: "Semaglutide co-administration with CYP2D6 substrates may require monitoring in ultra-rapid metabolizers", confidence: 0.72, source: "reflection", agent: "Helix", promoted: false },
    { content: "PubMed corpus 2020-2026 yields 47 relevant publications on CYP2D6 + GLP-1 RA pharmacokinetics", confidence: 0.95, source: "agent", agent: "Primer", promoted: true },
  ],
  "POD-2026-002": [
    { content: "BRCA1 RING domain binding pocket identified as primary candidate for small molecule inhibition", confidence: 0.78, source: "agent", agent: "Bond", promoted: true },
    { content: "Agentic Diffusion generated 12 SMILES candidates with predicted binding affinity > 7.0 kcal/mol", confidence: 0.71, source: "agent", agent: "Fragment", promoted: false },
    { content: "Benzisoxazole scaffold shows highest structural similarity to known PARP inhibitors (56% Rucaparib similarity)", confidence: 0.83, source: "pattern", agent: "Bond", promoted: true },
    { content: "MinCut analysis confirms BRCA1-EGFR pathway junction as druggable vulnerability point", confidence: 0.67, source: "agent", agent: "Helix", promoted: false },
    { content: "Top candidate (Candidate C) passes Lipinski Rule of Five with favorable logP and molecular weight", confidence: 0.89, source: "agent", agent: "Bond", promoted: true },
  ],
  "POD-2026-003": [
    { content: "HBB E6V (sickle cell) variant classified as pathogenic with 0.97 confidence by ruv-FANN", confidence: 0.97, source: "agent", agent: "Strand", promoted: true },
    { content: "Classifier achieves 0.94 AUC across diverse population test sets (African, European, South Asian)", confidence: 0.94, source: "agent", agent: "Strand", promoted: true },
    { content: "HBB codon 6 A>T transversion is the strongest single-variant signal in the training set", confidence: 0.96, source: "pattern", agent: "Helix", promoted: true },
    { content: "Population-stratified analysis shows no significant bias in pathogenicity scoring across ethnic groups", confidence: 0.88, source: "reflection", agent: "Helix", promoted: true },
    { content: "Feature importance analysis: k-mer frequency at positions 15-25 accounts for 62% of classification weight", confidence: 0.81, source: "agent", agent: "Strand", promoted: false },
    { content: "False positive rate for benign variants is 3.2% - within acceptable clinical threshold", confidence: 0.90, source: "agent", agent: "Strand", promoted: true },
    { content: "Heterozygous carriers show intermediate pathogenicity scores (0.45-0.55 range) as expected", confidence: 0.85, source: "pattern", agent: "Helix", promoted: true },
    { content: "Model generalizes well to HBB C variant (HbC) with 0.89 accuracy without retraining", confidence: 0.79, source: "agent", agent: "Strand", promoted: false },
    { content: "Recommended deployment: Level B clinical decision support with physician override", confidence: 0.92, source: "reflection", agent: "Helix", promoted: true },
    { content: "Validation against ClinVar gold standard: 96.1% concordance on pathogenic/benign classifications", confidence: 0.96, source: "agent", agent: "Strand", promoted: true },
    { content: "Training convergence achieved at epoch 142 with loss plateau at 0.08", confidence: 0.75, source: "agent", agent: "Strand", promoted: false },
    { content: "Final model architecture: 3-layer FANN [512, 128, 5] with dropout 0.3 - optimal for variant classification task", confidence: 0.87, source: "reflection", agent: "Helix", promoted: true },
  ],
  "POD-2026-004": [
    { content: "Temporal Attractor model predicts T2D onset 8-12 years before clinical diagnosis in INS locus carriers", confidence: 0.65, source: "agent", agent: "Helix", promoted: false },
    { content: "Epigenetic age acceleration at INS locus correlates with HbA1c trajectory (r=0.72)", confidence: 0.72, source: "pattern", agent: "Helix", promoted: true },
    { content: "Literature supports GLP-1 RA intervention window at epigenetic age acceleration > 2.5 years", confidence: 0.68, source: "agent", agent: "Helix", promoted: false },
  ],
};

/* Mock blockers per pod */
const BLOCKERS_DATA: Record<string, Array<{ reason: string; status: string; raisedAt: string; agent: string }>> = {
  "POD-2026-002": [
    { reason: "Insufficient BRCA1 crystallography data for accurate binding pocket modeling. Need PDB entries 7LYB and 7M4E which are restricted access.", status: "active", agent: "Fragment", raisedAt: "2026-03-17T13:00:00Z" },
  ],
  "POD-2026-004": [
    { reason: "Cohort dataset access approval pending from UK Biobank. Application UKB-2026-03-17-001 submitted, typical turnaround 48-72h.", status: "escalated", agent: "Helix", raisedAt: "2026-03-17T12:00:00Z" },
  ],
};

function getActivityLog(podId: string) {
  const timeline = TIMELINE_EVENTS[podId] || [];
  return timeline.map((e, i) => ({
    id: i,
    time: e.time,
    agent: e.agent,
    action: e.event,
  }));
}

export default function PodDetailClient({ podId }: { podId: string }) {
  const pod = researchPodsData.pods.find((p) => p.id === podId);

  if (!pod) {
    return (
      <div className="p-6 sm:p-10">
        <span className="panel-label">Research Pods</span>
        <p style={{ color: "var(--text-secondary)" }}>Pod not found.</p>
        <Link href="/brain/pods" className="text-sm mt-4 inline-block" style={{ color: "var(--accent-teal)" }}>
          Back to Pods
        </Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[pod.status as PodStatus];
  const timeline = TIMELINE_EVENTS[pod.id] || [];
  const learnings = LEARNINGS_DATA[pod.id] || [];
  const blockers = BLOCKERS_DATA[pod.id] || [];
  const activityLog = getActivityLog(pod.id);
  const currentPhaseIdx = pod.phases.indexOf(pod.phase);

  return (
    <div className="p-6 sm:p-10">
      {/* Back button + Header */}
      <Link
        href="/brain/pods"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-opacity hover:opacity-80"
        style={{ color: "var(--accent-teal)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Pods
      </Link>

      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: statusColor,
            boxShadow: pod.status === "running" ? `0 0 8px ${statusColor}` : undefined,
          }}
        />
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {pod.name}
        </h1>
        <Chip
          size="sm"
          variant="flat"
          className="capitalize text-[10px]"
          style={{
            background: `${statusColor}15`,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
          }}
        >
          {pod.status}
        </Chip>
      </div>

      <div className="mb-6">
        <span
          className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
          style={{ color: "#f59e0b" }}
        >
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Tabs */}
      <Tabs
        aria-label="Pod detail tabs"
        variant="underlined"
        classNames={{
          tabList: "gap-4 border-b border-[var(--bg-border)]",
          tab: "text-sm font-medium",
          cursor: "bg-[var(--accent-teal)]",
        }}
      >
        {/* Tab 1: Overview */}
        <Tab key="overview" title="Overview">
          <div className="space-y-6 pt-4">
            {/* Metadata */}
            <div className={`panel-card ${STATUS_CARD_CLASS[pod.status as PodStatus]}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>ID</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: "var(--accent-teal)" }}>{pod.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Topology</span>
                  <Chip size="sm" variant="flat" className="text-[10px]" style={{ background: "var(--bg-elevated)", color: "var(--accent-blue)", border: "1px solid var(--bg-border)" }}>
                    {pod.topology}
                  </Chip>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Quality Gate</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{(pod.constraints.qualityGate * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Compute Budget</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{pod.constraints.computeBudget}</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Goal</span>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{pod.goal}</p>
              </div>
              <div className="mt-3 flex gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Max Duration</span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{pod.constraints.maxDuration}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Started</span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{new Date(pod.startedAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>ETA</span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{new Date(pod.estimatedCompletion).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Phase stepper */}
            <div className="panel-card genomic">
              <span className="text-[10px] font-mono uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>Phase Progress</span>
              <div className="flex items-center gap-0">
                {pod.phases.map((phase, i) => {
                  const isCompleted = i < currentPhaseIdx;
                  const isCurrent = i === currentPhaseIdx;
                  return (
                    <div key={phase} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: isCompleted ? "var(--accent-teal)" : isCurrent ? statusColor : "var(--bg-elevated)",
                            color: isCompleted || isCurrent ? "var(--bg-base)" : "var(--text-muted)",
                            border: isCurrent ? `2px solid ${statusColor}` : isCompleted ? "none" : "1px solid var(--bg-border)",
                            boxShadow: isCurrent ? `0 0 8px ${statusColor}` : undefined,
                          }}
                        >
                          {isCompleted ? "\u2713" : i + 1}
                        </div>
                        <span
                          className="text-[9px] font-mono mt-1.5 text-center whitespace-nowrap"
                          style={{ color: isCurrent ? statusColor : isCompleted ? "var(--accent-teal)" : "var(--text-muted)" }}
                        >
                          {phase}
                        </span>
                      </div>
                      {i < pod.phases.length - 1 && (
                        <div
                          className="h-px flex-1 -mt-4"
                          style={{ background: isCompleted ? "var(--accent-teal)" : "var(--bg-border)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall progress */}
            <div className="panel-card genomic">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Overall Progress</span>
                <span className="font-mono text-sm font-bold" style={{ color: statusColor }}>{pod.progress}%</span>
              </div>
              <Progress
                value={pod.progress}
                size="md"
                classNames={{
                  indicator: pod.status === "completed"
                    ? "bg-[var(--safla-green)]"
                    : pod.status === "blocked"
                      ? "bg-[var(--accent-red)]"
                      : "bg-[var(--accent-teal)]",
                  track: "bg-[var(--bg-elevated)]",
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {pod.completedTasks}/{pod.taskCount} tasks completed
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {pod.learnings} learnings captured
                </span>
              </div>
            </div>

            {/* Agent cards */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>Agent Roster</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pod.agents.map((agent) => (
                  <Card
                    key={agent.name}
                    className="panel-card"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
                  >
                    <CardBody className="p-4 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background: `${AGENT_STATUS_COLORS[agent.status]}15`,
                            color: AGENT_STATUS_COLORS[agent.status],
                            border: `1.5px solid ${AGENT_STATUS_COLORS[agent.status]}40`,
                          }}
                        >
                          {agent.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{agent.name}</div>
                          <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{agent.role}</div>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                          <Chip
                            size="sm"
                            variant="flat"
                            className="text-[10px] capitalize"
                            style={{
                              background: agent.level === "lead" ? "rgba(139,92,246,0.15)" : "var(--bg-elevated)",
                              color: agent.level === "lead" ? "var(--accent-purple)" : "var(--text-secondary)",
                              border: agent.level === "lead" ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--bg-border)",
                            }}
                          >
                            {agent.level}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="flat"
                            className="text-[10px] capitalize"
                            style={{
                              background: `${AGENT_STATUS_COLORS[agent.status]}15`,
                              color: AGENT_STATUS_COLORS[agent.status],
                              border: `1px solid ${AGENT_STATUS_COLORS[agent.status]}30`,
                            }}
                          >
                            {agent.status}
                          </Chip>
                        </div>
                      </div>
                      {agent.currentTask && (
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{agent.currentTask}</p>
                      )}
                      {agent.progress > 0 && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={agent.progress}
                            size="sm"
                            className="flex-1"
                            classNames={{
                              indicator: "bg-[var(--accent-teal)]",
                              track: "bg-[var(--bg-elevated)]",
                            }}
                          />
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{agent.progress}%</span>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Tab>

        {/* Tab 2: Timeline */}
        <Tab key="timeline" title="Timeline">
          <div className="pt-4">
            <div className="relative ml-4">
              {/* Vertical line */}
              <div
                className="absolute left-0 top-0 bottom-0 w-px"
                style={{ background: "var(--bg-border)" }}
              />
              {timeline.map((event, i) => (
                <div key={i} className="relative pl-8 pb-6 last:pb-0">
                  {/* Dot on the line */}
                  <div
                    className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full -translate-x-1/2"
                    style={{
                      background: event.icon === "B" ? "var(--accent-red)"
                        : event.icon === "L" ? "var(--safla-green)"
                        : event.icon === "C" ? "var(--accent-teal)"
                        : event.icon === "P" ? "var(--accent-purple)"
                        : "var(--accent-blue)",
                    }}
                  />
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[10px] flex-shrink-0 pt-0.5" style={{ color: "var(--text-muted)" }}>{event.time}</span>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-primary)" }}>{event.event}</p>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="text-[10px] mt-1"
                        style={{ background: "var(--bg-elevated)", color: "var(--accent-teal)", border: "1px solid var(--bg-border)" }}
                      >
                        {event.agent}
                      </Chip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {timeline.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No timeline events recorded.</p>
            )}
          </div>
        </Tab>

        {/* Tab 3: Learnings */}
        <Tab key="learnings" title={`Learnings (${learnings.length})`}>
          <div className="space-y-3 pt-4">
            {learnings.map((learning, i) => (
              <Card
                key={i}
                className="panel-card"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
              >
                <CardBody className="p-4 space-y-2">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{learning.content}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Confidence:</span>
                    <Progress
                      value={learning.confidence * 100}
                      size="sm"
                      className="flex-1 max-w-32"
                      classNames={{
                        indicator: learning.confidence >= 0.85 ? "bg-[var(--safla-green)]" : learning.confidence >= 0.7 ? "bg-[var(--accent-teal)]" : "bg-[var(--accent-gold)]",
                        track: "bg-[var(--bg-elevated)]",
                      }}
                    />
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                      {(learning.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                      size="sm"
                      variant="flat"
                      className="text-[10px] capitalize"
                      style={{ background: "var(--bg-elevated)", color: "var(--accent-blue)", border: "1px solid var(--bg-border)" }}
                    >
                      {learning.source}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      className="text-[10px]"
                      style={{ background: "var(--bg-elevated)", color: "var(--accent-teal)", border: "1px solid var(--bg-border)" }}
                    >
                      {learning.agent}
                    </Chip>
                    {learning.promoted && (
                      <Chip
                        size="sm"
                        variant="flat"
                        className="text-[10px]"
                        style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-purple)", border: "1px solid rgba(139,92,246,0.3)" }}
                      >
                        Promoted to Memory
                      </Chip>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
            {learnings.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No learnings captured yet.</p>
            )}
          </div>
        </Tab>

        {/* Tab 4: Blockers */}
        <Tab key="blockers" title={`Blockers (${blockers.length})`}>
          <div className="space-y-3 pt-4">
            {blockers.map((blocker, i) => (
              <Card
                key={i}
                className="panel-card flagged"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
              >
                <CardBody className="p-4 space-y-2">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{blocker.reason}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                      size="sm"
                      variant="flat"
                      className="text-[10px] capitalize"
                      style={{
                        background: blocker.status === "active" ? "rgba(255,77,77,0.15)" : blocker.status === "escalated" ? "rgba(240,180,41,0.15)" : "rgba(0,229,160,0.15)",
                        color: blocker.status === "active" ? "var(--accent-red)" : blocker.status === "escalated" ? "var(--accent-gold)" : "var(--safla-green)",
                        border: `1px solid ${blocker.status === "active" ? "rgba(255,77,77,0.3)" : blocker.status === "escalated" ? "rgba(240,180,41,0.3)" : "rgba(0,229,160,0.3)"}`,
                      }}
                    >
                      {blocker.status}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      className="text-[10px]"
                      style={{ background: "var(--bg-elevated)", color: "var(--accent-teal)", border: "1px solid var(--bg-border)" }}
                    >
                      {blocker.agent}
                    </Chip>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      Raised: {new Date(blocker.raisedAt).toLocaleString()}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
            {blockers.length === 0 && (
              <p className="text-sm pt-2" style={{ color: "var(--text-muted)" }}>No blockers. All clear.</p>
            )}
          </div>
        </Tab>

        {/* Tab 5: Activity Log */}
        <Tab key="activity" title="Activity Log">
          <div className="pt-4">
            <div className="space-y-1">
              {activityLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 px-3 rounded"
                  style={{ background: entry.id % 2 === 0 ? "var(--bg-surface)" : "transparent" }}
                >
                  <span className="font-mono text-[10px] flex-shrink-0 pt-0.5 w-10" style={{ color: "var(--text-muted)" }}>
                    {entry.time}
                  </span>
                  <Chip
                    size="sm"
                    variant="flat"
                    className="text-[10px] flex-shrink-0"
                    style={{ background: "var(--bg-elevated)", color: "var(--accent-teal)", border: "1px solid var(--bg-border)" }}
                  >
                    {entry.agent}
                  </Chip>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.action}</span>
                </div>
              ))}
            </div>
            {activityLog.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No activity recorded.</p>
            )}
          </div>
        </Tab>
      </Tabs>

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
