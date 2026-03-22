"use client";

import { useState } from "react";
import { Pass, Genre, RefineResponse } from "@/lib/types";
import { defaultPrompts } from "@/lib/prompts";
import { SuggestionCard } from "./SuggestionCard";
import { StructureView } from "./StructureView";

interface PromptPlaygroundProps {
  text: string;
  pass: Pass;
  genre: Genre;
  toneAudience: string;
  toneTone: string;
}

export function PromptPlayground({
  text,
  pass,
  genre,
  toneAudience,
  toneTone,
}: PromptPlaygroundProps) {
  const template = defaultPrompts[pass];

  const [promptA, setPromptA] = useState(template.systemPrompt);
  const [promptB, setPromptB] = useState(template.systemPrompt);
  const [resultA, setResultA] = useState<RefineResponse | null>(null);
  const [resultB, setResultB] = useState<RefineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function runComparison() {
    if (!text.trim()) return;
    setLoading(true);

    const baseOptions =
      pass === "tone"
        ? { audience: toneAudience, tone: toneTone }
        : undefined;

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            pass,
            genre,
            options: baseOptions,
            customPrompt: promptA,
          }),
        }).then((r) => r.json()),
        fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            pass,
            genre,
            options: baseOptions,
            customPrompt: promptB,
          }),
        }).then((r) => r.json()),
      ]);

      setResultA(resA);
      setResultB(resB);
    } catch (err) {
      console.error("Playground error:", err);
    } finally {
      setLoading(false);
    }
  }

  function renderResult(result: RefineResponse | null, label: string) {
    if (!result) {
      return (
        <div className="text-sm text-stone-400 italic p-4">
          Run comparison to see results for {label}
        </div>
      );
    }

    if (result.structure) {
      return <StructureView analysis={result.structure} />;
    }

    return (
      <div className="space-y-2">
        <div className="text-xs text-stone-500">
          {result.suggestions.length} suggestions | Words:{" "}
          {result.meta.wordCountOriginal} → {result.meta.wordCountRevised} |
          Tokens: {result.meta.tokensUsed}
        </div>
        {result.suggestions.map((s, i) => (
          <SuggestionCard
            key={i}
            suggestion={s}
            index={i}
            accepted={false}
            onToggle={() => {}}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-stone-500">
        Prompt Playground — Edit and compare prompts side by side.
        Currently viewing: <strong>{template.name}</strong>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Prompt A */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-600">
            Prompt A (Default)
          </label>
          <textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            className="w-full h-48 p-3 text-xs font-mono bg-stone-900 text-green-400 rounded-lg border border-stone-700 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Prompt B */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-600">
            Prompt B (Your Variant)
          </label>
          <textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            className="w-full h-48 p-3 text-xs font-mono bg-stone-900 text-green-400 rounded-lg border border-stone-700 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <button
        onClick={runComparison}
        disabled={loading || !text.trim()}
        className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Running comparison..." : "Compare Prompts"}
      </button>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
          <h3 className="text-xs font-semibold text-stone-500 mb-2">
            Result A
          </h3>
          {renderResult(resultA, "Prompt A")}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
          <h3 className="text-xs font-semibold text-stone-500 mb-2">
            Result B
          </h3>
          {renderResult(resultB, "Prompt B")}
        </div>
      </div>
    </div>
  );
}
