"use client";

import { StructureAnalysis } from "@/lib/types";

interface StructureViewProps {
  analysis: StructureAnalysis;
}

export function StructureView({ analysis }: StructureViewProps) {
  return (
    <div className="space-y-6">
      {/* Chain-of-Thought Reasoning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          Chain-of-Thought Reasoning
        </h3>
        <p className="text-sm text-blue-900 whitespace-pre-wrap">
          {analysis.reasoning}
        </p>
      </div>

      {/* Paragraph-by-paragraph outline */}
      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-3">
          Structural Outline
        </h3>
        <div className="space-y-2">
          {analysis.outline.map((node, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 bg-white border border-stone-200 rounded-lg"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-mono">
                {node.paragraph}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {node.role}
                  </span>
                </div>
                <p className="text-sm text-stone-700 mt-1">{node.summary}</p>
                {node.connectionToNext && (
                  <p className="text-xs text-stone-500 mt-1">
                    Transition: {node.connectionToNext}
                  </p>
                )}
                {node.issues.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {node.issues.map((issue, j) => (
                      <p key={j} className="text-xs text-red-600">
                        {issue}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall assessment */}
      <div className="bg-stone-100 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-1">
          Overall Flow
        </h3>
        <p className="text-sm text-stone-600">{analysis.overallFlow}</p>
      </div>

      {/* Gaps */}
      {analysis.gaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            Gaps Identified
          </h3>
          <ul className="space-y-1">
            {analysis.gaps.map((gap, i) => (
              <li
                key={i}
                className="text-sm text-red-600 pl-4 before:content-['•'] before:absolute before:left-0 relative"
              >
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reordering suggestions */}
      {analysis.suggestedReordering.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-700 mb-2">
            Suggested Reordering
          </h3>
          <ul className="space-y-1">
            {analysis.suggestedReordering.map((suggestion, i) => (
              <li
                key={i}
                className="text-sm text-green-700 pl-4 before:content-['→'] before:absolute before:left-0 relative"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
