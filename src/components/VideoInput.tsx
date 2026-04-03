"use client";

import { useState, useRef, useCallback } from "react";
import type { VideoSource } from "@/lib/types";

interface Props {
  onVideoSelected: (source: VideoSource) => void;
  currentSource: VideoSource | null;
}

export default function VideoInput({ onVideoSelected, currentSource }: Props) {
  const [url, setUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onVideoSelected({ type: "url", url: url.trim() });
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        alert("Please select a video file");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      onVideoSelected({ type: "upload", file, previewUrl });
    },
    [onVideoSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Video Source</h2>

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube or video URL..."
          className="flex-1 rounded-lg bg-surface border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load
        </button>
      </form>

      <div className="flex items-center gap-3 text-foreground/30 text-xs uppercase tracking-wider">
        <div className="flex-1 h-px bg-border" />
        or
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* File Upload / Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors
          ${dragActive ? "border-accent bg-accent/5" : "border-border hover:border-foreground/20 hover:bg-surface/50"}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm text-foreground/60">
          Drop a video here or <span className="text-accent underline">browse</span>
        </p>
        <p className="text-xs text-foreground/30 mt-1">MP4, MOV, WebM, AVI supported</p>
      </div>

      {/* Current Source Preview */}
      {currentSource && (
        <div className="rounded-lg bg-surface border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-accent uppercase tracking-wider">
              {currentSource.type === "url" ? "URL Source" : "Uploaded File"}
            </span>
            <button
              onClick={() => onVideoSelected(null!)}
              className="text-xs text-foreground/40 hover:text-error transition-colors"
            >
              Clear
            </button>
          </div>
          {currentSource.type === "url" ? (
            <p className="text-sm text-foreground/70 truncate">{currentSource.url}</p>
          ) : (
            <video
              src={currentSource.previewUrl}
              controls
              className="w-full rounded-md max-h-64 bg-black"
            />
          )}
        </div>
      )}
    </div>
  );
}
