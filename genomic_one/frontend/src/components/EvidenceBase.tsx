"use client";

import { useState } from "react";
import { Chip } from "@heroui/react";

export interface Reference {
  title: string;
  source: string;
  year: number;
  relevance: number; // 1-5 stars
}

interface EvidenceBaseProps {
  references: Reference[];
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-xs tracking-wider">
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

export default function EvidenceBase({ references }: EvidenceBaseProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm font-mono">
            {open ? "▼" : "▶"}
          </span>
          <span className="text-sm text-zinc-300 font-medium">
            Evidence Base ({references.length} sources)
          </span>
          <Chip size="sm" variant="flat" color="secondary" className="text-[10px]">
            FACT-Augmented
          </Chip>
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 bg-zinc-900/30">
          {references.map((ref, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-sm"
            >
              <span className="text-zinc-400 font-mono text-xs mt-0.5 shrink-0">
                [{i + 1}]
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-zinc-300 leading-snug">
                  &ldquo;{ref.title}&rdquo;
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-zinc-400 text-xs">
                    {ref.source}, {ref.year}
                  </span>
                  <Stars count={ref.relevance} />
                </div>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-zinc-400 pt-1 border-t border-border/50">
            Simulated Data · In Silico Environment
          </div>
        </div>
      )}
    </div>
  );
}
