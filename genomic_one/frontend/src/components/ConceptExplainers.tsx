"use client";

import { useState } from "react";

export default function ConceptExplainers() {
  const [activeTab, setActiveTab] = useState<"v1" | "v2">("v1");

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center gap-4 bg-surface-2 p-1 rounded-lg w-fit self-center">
        <button
          onClick={() => setActiveTab("v1")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "v1"
              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Scientific Fundamentals (V1)
        </button>
        <button
          onClick={() => setActiveTab("v2")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "v2"
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Standalone Mastery (V2)
        </button>
      </div>

      <div className="bg-surface rounded-xl overflow-hidden border border-zinc-800/50 shadow-2xl h-[800px]">
        <iframe
          key={activeTab}
          src={activeTab === "v1" ? "/explainer-v1.html" : "/explainer-v2.html"}
          className="w-full h-full border-none"
          title="Genomic One Explainer"
        />
      </div>
      
      <div className="text-center text-xs text-zinc-500 italic">
        * Interactive genomic theory and platform blueprints.
      </div>
    </div>
  );
}
