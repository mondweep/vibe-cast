"use client";

import { Genre } from "@/lib/types";

const genres: { value: Genre; label: string; description: string }[] = [
  { value: "essay", label: "Essay / Opinion", description: "Argument strength, rhetorical flow" },
  { value: "technical", label: "Technical / Docs", description: "Precision, scannability" },
  { value: "journalism", label: "Journalism", description: "Objectivity, attribution" },
  { value: "academic", label: "Academic", description: "Formal register, hedging" },
  { value: "business", label: "Business / Memo", description: "Brevity, action-orientation" },
];

interface GenreSelectorProps {
  value: Genre;
  onChange: (genre: Genre) => void;
}

export function GenreSelector({ value, onChange }: GenreSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {genres.map((g) => (
        <button
          key={g.value}
          onClick={() => onChange(g.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === g.value
              ? "bg-stone-800 text-white"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          }`}
          title={g.description}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
