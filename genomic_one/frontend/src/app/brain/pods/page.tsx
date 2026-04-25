"use client";

import Link from "next/link";
import { Card, CardBody, Chip, Progress } from "@heroui/react";
import { useState } from "react";
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

const FILTERS = ["All", "Running", "Blocked", "Completed"] as const;

export default function PodsPage() {
  const [filter, setFilter] = useState<string>("All");
  const pods = researchPodsData.pods;

  const filtered = filter === "All"
    ? pods
    : pods.filter((p) => p.status === filter.toLowerCase());

  return (
    <div className="p-6 sm:p-10">
      {/* Header */}
      <div className="mb-1">
        <span className="panel-label">Research Pods</span>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Autonomous Agent Swarms for Genomic Research
        </h1>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} pod{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="mb-6">
        <span
          className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
          style={{ color: "#f59e0b" }}
        >
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150"
            style={{
              background: filter === f ? "rgba(0,201,177,0.15)" : "var(--bg-elevated)",
              border: filter === f ? "1px solid var(--accent-teal)" : "1px solid var(--bg-border)",
              color: filter === f ? "var(--accent-teal)" : "var(--text-secondary)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pod Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((pod) => (
          <Link key={pod.id} href={`/brain/pods/${pod.id}`}>
            <Card
              className={`panel-card ${STATUS_CARD_CLASS[pod.status as PodStatus]} cursor-pointer transition-all duration-150 hover:brightness-110`}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
              }}
            >
              <CardBody className="p-5 space-y-3">
                {/* Status + Name */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: STATUS_COLORS[pod.status as PodStatus],
                      boxShadow: pod.status === "running" ? `0 0 6px ${STATUS_COLORS[pod.status as PodStatus]}` : undefined,
                    }}
                  />
                  <span
                    className="text-sm font-bold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {pod.name}
                  </span>
                </div>

                {/* ID + Topology badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {pod.id}
                  </span>
                  <Chip
                    size="sm"
                    variant="flat"
                    className="text-[10px] h-5"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--accent-blue)",
                      border: "1px solid var(--bg-border)",
                    }}
                  >
                    {pod.topology}
                  </Chip>
                </div>

                {/* Goal */}
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {pod.goal}
                </p>

                {/* Phase steps */}
                <div className="flex items-center gap-1">
                  {pod.phases.map((phase, i) => {
                    const currentIdx = pod.phases.indexOf(pod.phase);
                    const isCompleted = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={phase} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          title={phase}
                          style={{
                            background: isCompleted
                              ? "var(--accent-teal)"
                              : isCurrent
                                ? STATUS_COLORS[pod.status as PodStatus]
                                : "var(--bg-border)",
                            boxShadow: isCurrent ? `0 0 4px ${STATUS_COLORS[pod.status as PodStatus]}` : undefined,
                          }}
                        />
                        {i < pod.phases.length - 1 && (
                          <div
                            className="w-3 h-px"
                            style={{
                              background: isCompleted ? "var(--accent-teal)" : "var(--bg-border)",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  <span
                    className="text-[10px] font-mono ml-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {pod.phase}
                  </span>
                </div>

                {/* Progress bar + task count */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {pod.completedTasks}/{pod.taskCount} tasks
                    </span>
                    <span
                      className="text-[10px] font-mono font-semibold"
                      style={{ color: STATUS_COLORS[pod.status as PodStatus] }}
                    >
                      {pod.progress}%
                    </span>
                  </div>
                  <Progress
                    value={pod.progress}
                    size="sm"
                    className="h-1.5"
                    classNames={{
                      indicator: pod.status === "completed"
                        ? "bg-[var(--safla-green)]"
                        : pod.status === "blocked"
                          ? "bg-[var(--accent-red)]"
                          : "bg-[var(--accent-teal)]",
                      track: "bg-[var(--bg-elevated)]",
                    }}
                  />
                </div>

                {/* Agent roster */}
                <div className="flex items-center gap-1.5">
                  {pod.agents.map((agent) => (
                    <div
                      key={agent.name}
                      className="relative"
                      title={`${agent.name} (${agent.role}) - ${agent.status}`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: `${AGENT_STATUS_COLORS[agent.status]}15`,
                          color: AGENT_STATUS_COLORS[agent.status],
                          border: `1.5px solid ${AGENT_STATUS_COLORS[agent.status]}40`,
                        }}
                      >
                        {agent.name[0]}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--bg-surface)]"
                        style={{ background: AGENT_STATUS_COLORS[agent.status] }}
                      />
                    </div>
                  ))}
                </div>

                {/* Learnings, Blockers, Time, Constraints */}
                <div
                  className="flex flex-wrap items-center gap-3 pt-2"
                  style={{ borderTop: "1px solid var(--bg-border)" }}
                >
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {pod.learnings} learnings
                  </span>
                  {pod.blockers > 0 && (
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--accent-red)" }}>
                      {pod.blockers} blocker{pod.blockers !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    QG: {(pod.constraints.qualityGate * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    Budget: {pod.constraints.computeBudget}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    Started: {new Date(pod.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    ETA: {new Date(pod.estimatedCompletion).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </CardBody>
            </Card>
          </Link>
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
