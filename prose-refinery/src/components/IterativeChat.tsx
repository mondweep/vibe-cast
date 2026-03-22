"use client";

import { useState } from "react";
import { ConversationMessage, Genre, Suggestion } from "@/lib/types";
import { SuggestionCard } from "./SuggestionCard";

interface IterativeChatProps {
  originalText: string;
  genre: Genre;
}

interface ChatTurn {
  feedback: string;
  suggestions: Suggestion[];
  tokensUsed: number;
}

export function IterativeChat({ originalText, genre }: IterativeChatProps) {
  const [feedback, setFeedback] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({});

  const conversationHistory: ConversationMessage[] = turns.flatMap((turn) => [
    { role: "user" as const, content: turn.feedback },
    {
      role: "assistant" as const,
      content: turn.suggestions
        .map((s) => `Changed "${s.original}" to "${s.revised}" because: ${s.explanation}`)
        .join("\n"),
    },
  ]);

  const totalTokens = turns.reduce((sum, t) => sum + t.tokensUsed, 0);

  async function handleSend() {
    if (!feedback.trim() || !originalText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalText,
          pass: "iterate",
          genre,
          options: {
            conversation: [
              ...conversationHistory,
              { role: "user", content: feedback },
            ],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTurns((prev) => [
        ...prev,
        {
          feedback,
          suggestions: data.suggestions,
          tokensUsed: data.meta.tokensUsed,
        },
      ]);
      setFeedback("");
    } catch (err) {
      console.error("Iterate error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-stone-500 flex justify-between">
        <span>Iterative Refinement — Multi-Turn Context Management</span>
        <span>Total tokens used: {totalTokens.toLocaleString()}</span>
      </div>

      {/* Conversation history */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {turns.map((turn, turnIdx) => (
          <div key={turnIdx} className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-xs font-medium text-blue-700">
                Your feedback:
              </span>
              <p className="text-sm text-blue-900 mt-1">{turn.feedback}</p>
            </div>
            <div className="space-y-2 pl-4 border-l-2 border-amber-300">
              {turn.suggestions.map((s, sIdx) => {
                const key = `${turnIdx}-${sIdx}`;
                return (
                  <SuggestionCard
                    key={key}
                    suggestion={s}
                    index={sIdx}
                    accepted={!!acceptedMap[key]}
                    onToggle={() =>
                      setAcceptedMap((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={
            turns.length === 0
              ? "Describe how you'd like to refine this passage..."
              : "Push back, add constraints, or ask for alternatives..."
          }
          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          disabled={loading || !originalText.trim()}
        />
        <button
          onClick={handleSend}
          disabled={loading || !feedback.trim() || !originalText.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refining..." : "Send"}
        </button>
      </div>
    </div>
  );
}
