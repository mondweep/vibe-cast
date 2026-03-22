"use client";

import { Suggestion } from "@/lib/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  index: number;
  accepted: boolean;
  onToggle: () => void;
}

export function SuggestionCard({
  suggestion,
  index,
  accepted,
  onToggle,
}: SuggestionCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        accepted
          ? "border-green-300 bg-green-50"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-mono text-stone-400">#{index + 1}</span>
        <button
          onClick={onToggle}
          className={`shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
            accepted
              ? "bg-green-600 text-white"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          }`}
        >
          {accepted ? "Accepted" : "Accept"}
        </button>
      </div>

      <div className="mt-2 space-y-2">
        <div>
          <span className="text-xs font-medium text-red-600">Original:</span>
          <p className="text-sm text-stone-700 bg-red-50 px-2 py-1 rounded mt-0.5 line-through decoration-red-300">
            {suggestion.original}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-green-600">Revised:</span>
          <p className="text-sm text-stone-700 bg-green-50 px-2 py-1 rounded mt-0.5">
            {suggestion.revised}
          </p>
        </div>
        <div className="text-xs text-stone-500 italic border-l-2 border-amber-300 pl-2">
          {suggestion.explanation}
        </div>
      </div>
    </div>
  );
}
