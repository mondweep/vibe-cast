"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";

const GENES = [
  { name: "HBB", full: "Hemoglobin Beta", color: "#06b6d4" },
  { name: "TP53", full: "Tumor Suppressor", color: "#8b5cf6" },
  { name: "BRCA1", full: "DNA Repair", color: "#f43f5e" },
  { name: "CYP2D6", full: "Drug Metabolism", color: "#10b981" },
  { name: "INS", full: "Insulin", color: "#f59e0b" },
];

const STAGGER_MS = 800;
const ANIMATION_DURATION_MS = 4000;
const TICK_INTERVAL_MS = 50;
const SSE_TIMEOUT_MS = 2000;

interface GeneState {
  name: string;
  full: string;
  color: string;
  progress: number;
  status: "waiting" | "running" | "complete";
  data?: Record<string, unknown>;
}

interface StreamState {
  connected: boolean;
  genes: GeneState[];
  currentStage: string;
  totalProgress: number;
  complete: boolean;
  totalTime?: string;
}

function buildInitialGenes(): GeneState[] {
  return GENES.map((g) => ({
    name: g.name,
    full: g.full,
    color: g.color,
    progress: 0,
    status: "waiting" as const,
  }));
}

export default function StreamingProgress() {
  const [state, setState] = useState<StreamState>({
    connected: false,
    genes: buildInitialGenes(),
    currentStage: "",
    totalProgress: 0,
    complete: false,
  });

  const fallbackRunning = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ---------- Fallback (client-side animation) ----------
  const startFallback = useCallback(() => {
    if (fallbackRunning.current) return;
    fallbackRunning.current = true;

    const startTimes = GENES.map((_, i) => i * STAGGER_MS);
    const globalStart = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const nextGenes = GENES.map((g, i) => {
        const elapsed = now - globalStart - startTimes[i];
        const pct = elapsed <= 0 ? 0 : Math.min(100, Math.round((elapsed / ANIMATION_DURATION_MS) * 100));
        const status: GeneState["status"] = pct >= 100 ? "complete" : pct > 0 ? "running" : "waiting";
        return { name: g.name, full: g.full, color: g.color, progress: pct, status };
      });

      const totalProgress = Math.round(nextGenes.reduce((s, g) => s + g.progress, 0) / nextGenes.length);
      const allDone = nextGenes.every((g) => g.progress >= 100);

      setState((prev) => ({
        ...prev,
        genes: nextGenes,
        totalProgress,
        complete: allDone,
        currentStage: allDone ? "" : `Processing — ${nextGenes.find((g) => g.status === "running")?.name ?? ""}`,
      }));

      if (allDone) {
        clearInterval(interval);
        fallbackRunning.current = false;
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      fallbackRunning.current = false;
    };
  }, []);

  // ---------- SSE connection ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let cleanupFallback: (() => void) | undefined;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      // No connection within timeout — switch to fallback
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setState((prev) => ({ ...prev, connected: false }));
      cleanupFallback = startFallback();
    }, SSE_TIMEOUT_MS);

    try {
      const es = new EventSource(`${API_BASE}/api/stream/analysis`);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (cancelled) return;
        clearTimeout(timeout);
        setState((prev) => ({ ...prev, connected: true }));
      };

      es.onmessage = (event) => {
        if (cancelled) return;
        clearTimeout(timeout);

        try {
          const payload = JSON.parse(event.data) as {
            stage?: string;
            gene?: string;
            progress?: number;
            data?: Record<string, unknown>;
            total_time?: string;
          };

          setState((prev) => {
            if (!prev.connected) {
              // First message received — mark connected
            }

            const genes = prev.genes.map((g) => {
              if (payload.gene && g.name === payload.gene) {
                const progress = payload.progress ?? g.progress;
                const status: GeneState["status"] = progress >= 100 ? "complete" : progress > 0 ? "running" : "waiting";
                return { ...g, progress, status, data: payload.data ?? g.data };
              }
              return g;
            });

            const totalProgress = Math.round(genes.reduce((s, g) => s + g.progress, 0) / genes.length);
            const isComplete = payload.stage === "complete" || genes.every((g) => g.status === "complete");

            const stageName = payload.stage && payload.stage !== "complete"
              ? `${payload.stage}${payload.gene ? ` \u2014 ${payload.gene}` : ""}`
              : prev.currentStage;

            return {
              connected: true,
              genes,
              currentStage: isComplete ? "" : stageName,
              totalProgress,
              complete: isComplete,
              totalTime: payload.total_time ?? prev.totalTime,
            };
          });
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        clearTimeout(timeout);
        es.close();
        eventSourceRef.current = null;
        // Only switch to fallback if we never connected
        setState((prev) => {
          if (!prev.connected && !prev.complete) {
            cleanupFallback = startFallback();
          }
          return { ...prev, connected: prev.connected };
        });
      };
    } catch {
      // EventSource constructor failed — fallback
      clearTimeout(timeout);
      setState((prev) => ({ ...prev, connected: false }));
      cleanupFallback = startFallback();
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      cleanupFallback?.();
    };
  }, [startFallback]);

  // ---------- Derived values ----------
  const completedCount = state.genes.filter((g) => g.status === "complete").length;
  const runningGene = state.genes.find((g) => g.status === "running");

  // ---------- Data snippet helper ----------
  function dataSnippet(gene: GeneState): string | null {
    if (!gene.data) return null;
    const d = gene.data;
    if (typeof d.dimensions === "number") return `${d.dimensions} dimensions`;
    if (typeof d.variants === "number") return `${d.variants} variants`;
    if (typeof d.markers === "number") return `${d.markers} markers`;
    if (typeof d.pathways === "number") return `${d.pathways} pathways`;
    if (typeof d.score !== "undefined") return `score ${d.score}`;
    // Show first string value if nothing else matches
    const firstVal = Object.values(d).find((v) => typeof v === "string" || typeof v === "number");
    return firstVal != null ? String(firstVal) : null;
  }

  return (
    <div className="panel-card genomic">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="panel-label mb-0">MidStream Analysis</span>
          {state.complete ? (
            <span
              className="text-xs font-mono font-semibold px-2.5 py-1 rounded"
              style={{ color: "var(--accent-teal)", background: "rgba(0,201,177,0.15)" }}
            >
              Analysis Complete{state.totalTime ? ` \u2014 ${state.totalTime}` : ""}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse-live"
                style={{ background: state.connected ? "var(--streaming-pulse)" : "var(--accent-gold)" }}
              />
              <span
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                style={{
                  color: state.connected ? "var(--accent-teal)" : "var(--accent-gold)",
                  background: state.connected ? "rgba(0,201,177,0.12)" : "rgba(240,180,41,0.12)",
                }}
              >
                {state.connected ? "LIVE" : "SIMULATED"}
              </span>
            </span>
          )}
        </div>
        <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {completedCount}/{GENES.length} genes
        </span>
      </div>

      {/* Current stage subtitle */}
      {state.currentStage && !state.complete && (
        <div className="mb-4">
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {state.currentStage}
          </span>
        </div>
      )}
      {!state.currentStage && <div className="mb-3" />}

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
        {state.genes.map((gene) => {
          const done = gene.status === "complete";
          const isRunning = gene === runningGene;
          const barColor = done ? "var(--accent-teal)" : gene.color;
          const snippet = done ? dataSnippet(gene) : null;

          return (
            <div key={gene.name}>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                    {gene.name}
                  </span>
                  <span className="text-xs ml-2 hidden lg:inline" style={{ color: "var(--text-secondary)" }}>
                    {gene.full}
                  </span>
                </div>
                <span className="text-xl font-mono font-bold tabular-nums" style={{ color: barColor }}>
                  {gene.progress}%
                </span>
              </div>
              {/* Custom progress bar */}
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div
                  className={`h-full rounded-full transition-all duration-100 ease-linear${isRunning ? " animate-pulse-live" : ""}`}
                  style={{
                    width: `${gene.progress}%`,
                    background: barColor,
                    boxShadow: `0 0 8px ${barColor}40`,
                  }}
                />
              </div>
              {/* Stage-specific data snippet */}
              {snippet && (
                <div className="mt-1.5">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {snippet}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
