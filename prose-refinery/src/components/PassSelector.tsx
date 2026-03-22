"use client";

import { Pass } from "@/lib/types";

const passes: { value: Pass; label: string; pattern: string }[] = [
  { value: "conciseness", label: "Conciseness", pattern: "System Rules" },
  { value: "clarity", label: "Clarity", pattern: "Few-Shot" },
  { value: "tone", label: "Tone", pattern: "Role Prompting" },
  { value: "structure", label: "Structure", pattern: "Chain-of-Thought" },
  { value: "iterate", label: "Iterate", pattern: "Multi-Turn" },
];

interface PassSelectorProps {
  value: Pass;
  onChange: (pass: Pass) => void;
}

export function PassSelector({ value, onChange }: PassSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {passes.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            value === p.value
              ? "bg-amber-600 text-white"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          }`}
        >
          <span className="font-medium">{p.label}</span>
          <span className="ml-1 opacity-70 text-xs">({p.pattern})</span>
        </button>
      ))}
    </div>
  );
}
