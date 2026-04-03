"use client";

import { useState } from "react";
import type { VideoSource } from "@/lib/types";
import VideoInput from "@/components/VideoInput";
import FeaturePanel from "@/components/FeaturePanel";
import ConnectionStatus from "@/components/ConnectionStatus";
import UseCasesPanel from "@/components/UseCasesPanel";

export default function Home() {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [activeTab, setActiveTab] = useState<"features" | "usecases">("features");

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">
              <span className="text-accent">Vibe</span>Cast
            </h1>
            <span className="text-xs text-foreground/30 bg-surface-light px-2 py-0.5 rounded-full">
              ClipCannon Testing
            </span>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto w-full px-4 py-6 space-y-6 flex-1">
        {/* Video Source */}
        <section>
          <VideoInput onVideoSelected={setVideoSource} currentSource={videoSource} />
        </section>

        {/* Tab Switcher */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("features")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "features"
                ? "border-accent text-accent"
                : "border-transparent text-foreground/40 hover:text-foreground/70"
            }`}
          >
            Feature Testing
          </button>
          <button
            onClick={() => setActiveTab("usecases")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "usecases"
                ? "border-accent text-accent"
                : "border-transparent text-foreground/40 hover:text-foreground/70"
            }`}
          >
            Use Cases & Workflows
          </button>
        </div>

        {/* Tab Content */}
        <section>
          {activeTab === "features" ? (
            <FeaturePanel videoSource={videoSource} />
          ) : (
            <UseCasesPanel />
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/30 py-4">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground/30">
          <div>
            VibeCast &mdash; Testing interface for{" "}
            <a
              href="https://github.com/mondweep/clipcannon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              ClipCannon
            </a>
          </div>
          <div className="flex gap-4">
            <a
              href="https://driftwise-mmp.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/60 transition-colors"
            >
              Driftwise
            </a>
            <a
              href="https://github.com/mondweep/clipcannon"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/60 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
