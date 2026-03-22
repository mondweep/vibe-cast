"use client";

import { useState } from "react";
import { Pass, Genre, RefineResponse } from "@/lib/types";
import { GenreSelector } from "@/components/GenreSelector";
import { PassSelector } from "@/components/PassSelector";
import { ToneOptions } from "@/components/ToneOptions";
import { SuggestionCard } from "@/components/SuggestionCard";
import { StructureView } from "@/components/StructureView";
import { PromptInspector } from "@/components/PromptInspector";
import { IterativeChat } from "@/components/IterativeChat";
import { PromptPlayground } from "@/components/PromptPlayground";
import { AboutView } from "@/components/AboutView";
import { VerifiedView } from "@/components/VerifiedView";

type View = "refine" | "playground" | "about" | "verified";

export default function Home() {
  const [text, setText] = useState("");
  const [genre, setGenre] = useState<Genre>("essay");
  const [pass, setPass] = useState<Pass>("conciseness");
  const [audience, setAudience] = useState("General audience");
  const [tone, setTone] = useState("general-audience");
  const [view, setView] = useState<View>("refine");

  const [result, setResult] = useState<RefineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedMap, setAcceptedMap] = useState<Record<number, boolean>>({});

  async function handleRefine() {
    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setAcceptedMap({});

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          pass,
          genre,
          options: pass === "tone" ? { audience, tone } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptAll() {
    if (!result) return;
    const map: Record<number, boolean> = {};
    result.suggestions.forEach((_, i) => {
      map[i] = true;
    });
    setAcceptedMap(map);
  }

  function applyAccepted() {
    if (!result) return;
    let newText = text;
    // Apply in reverse order to preserve positions
    const accepted = result.suggestions
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => acceptedMap[s.idx])
      .sort((a, b) => b.position.start - a.position.start);

    for (const s of accepted) {
      newText =
        newText.slice(0, s.position.start) +
        s.revised +
        newText.slice(s.position.end);
    }

    setText(newText);
    setResult(null);
    setAcceptedMap({});
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              Prose Refinery
            </h1>
            <p className="text-xs text-stone-500">
              Refine non-fiction writing — one pass at a time
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("refine")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "refine"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              Refine
            </button>
            <button
              onClick={() => setView("playground")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "playground"
                  ? "bg-purple-600 text-white"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              Prompt Playground
            </button>
            <button
              onClick={() => setView("about")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "about"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              About
            </button>
            <button
              onClick={() => setView("verified")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "verified"
                  ? "bg-green-600 text-white"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              Verified
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      {(view === "refine" || view === "playground") && <div className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-stone-500 w-12">
              Genre:
            </span>
            <GenreSelector value={genre} onChange={setGenre} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-stone-500 w-12">
              Pass:
            </span>
            <PassSelector value={pass} onChange={setPass} />
          </div>
          {pass === "tone" && (
            <ToneOptions
              audience={audience}
              tone={tone}
              onAudienceChange={setAudience}
              onToneChange={setTone}
            />
          )}
        </div>
      </div>}

      {/* Main content */}
      <main className="flex-1 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {view === "about" ? (
            <AboutView />
          ) : view === "verified" ? (
            <VerifiedView />
          ) : view === "playground" ? (
            <PromptPlayground
              text={text}
              pass={pass}
              genre={genre}
              toneAudience={audience}
              toneTone={tone}
            />
          ) : pass === "iterate" ? (
            <div className="grid grid-cols-2 gap-6 h-[calc(100vh-220px)]">
              {/* Input */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-stone-500">
                    Your Text
                  </span>
                  <span className="text-xs text-stone-400">
                    {wordCount} words
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your non-fiction draft here..."
                  className="flex-1 p-4 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm leading-relaxed"
                />
              </div>
              {/* Iterative chat */}
              <div className="flex flex-col">
                <IterativeChat originalText={text} genre={genre} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 h-[calc(100vh-220px)]">
              {/* Input pane */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-stone-500">
                    Your Text
                  </span>
                  <span className="text-xs text-stone-400">
                    {wordCount} words
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your non-fiction draft here..."
                  className="flex-1 p-4 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm leading-relaxed"
                />
              </div>

              {/* Output pane */}
              <div className="flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-stone-500">
                    Suggestions
                  </span>
                  {result && (
                    <span className="text-xs text-stone-400">
                      {result.meta.wordCountOriginal} →{" "}
                      {result.meta.wordCountRevised} words |{" "}
                      {result.meta.tokensUsed} tokens
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {loading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-sm text-stone-500 animate-pulse">
                        Running {pass} pass...
                      </div>
                    </div>
                  )}

                  {result?.structure && (
                    <StructureView analysis={result.structure} />
                  )}

                  {result?.suggestions.map((s, i) => (
                    <SuggestionCard
                      key={i}
                      suggestion={s}
                      index={i}
                      accepted={!!acceptedMap[i]}
                      onToggle={() =>
                        setAcceptedMap((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                    />
                  ))}
                </div>

                {result && (
                  <PromptInspector promptUsed={result.meta.promptUsed} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer actions */}
      {view === "refine" && pass !== "iterate" && (
        <div className="border-t border-stone-200 bg-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <button
              onClick={handleRefine}
              disabled={loading || !text.trim()}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Refining..." : "Refine"}
            </button>
            <div className="flex gap-2">
              {result && result.suggestions.length > 0 && (
                <>
                  <button
                    onClick={handleAcceptAll}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={applyAccepted}
                    disabled={
                      !Object.values(acceptedMap).some(Boolean)
                    }
                    className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Selected
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credits footer */}
      <footer className="border-t border-stone-200 bg-stone-50 px-6 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-stone-500">
          <span>
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/mondweepchakravorty/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-700 hover:text-stone-900 underline"
            >
              Mondweep Chakravorty
            </a>
          </span>
          <a
            href="https://github.com/mondweep/vibe-cast/tree/claude/nonfiction-writing-refinement-session-O2dnP"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-700 hover:text-stone-900 underline"
          >
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
