"use client";

import { useState } from "react";

interface PromptInspectorProps {
  promptUsed: string;
}

export function PromptInspector({ promptUsed }: PromptInspectorProps) {
  const [open, setOpen] = useState(false);

  if (!promptUsed) return null;

  return (
    <div className="border-t border-stone-200 mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700 py-2 transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>Prompt Inspector — see the exact prompt sent to the API</span>
      </button>
      {open && (
        <pre className="text-xs bg-stone-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
          {promptUsed}
        </pre>
      )}
    </div>
  );
}
