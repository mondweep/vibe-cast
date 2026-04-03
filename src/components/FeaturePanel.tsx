"use client";

import { useState } from "react";
import type { FeatureCard, FeatureCategory, VideoSource } from "@/lib/types";
import { FEATURES } from "@/lib/types";
import { callTool, ingestUrl, uploadVideo } from "@/lib/clipcannon-client";

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  analyze: "Analysis & Discovery",
  voice: "Voice Cloning & TTS",
  audio: "Audio & Music",
  edit: "Editing Tools",
  render: "Rendering & Avatar",
  driftwise: "Driftwise Integration",
};

const CATEGORY_ORDER: FeatureCategory[] = [
  "analyze",
  "voice",
  "audio",
  "edit",
  "render",
  "driftwise",
];

interface Props {
  videoSource: VideoSource | null;
}

function FeatureCardComponent({
  feature,
  videoSource,
}: {
  feature: FeatureCard;
  videoSource: VideoSource | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const paramFields = getParamFields(feature);

  async function handleRun() {
    if (!videoSource && feature.category !== "voice" && feature.id !== "voice-profiles") {
      setResult("Error: Please select a video source first.");
      return;
    }
    setRunning(true);
    setResult(null);

    try {
      let projectId = "demo";

      // If we have a video source, set up the project first
      if (videoSource) {
        if (videoSource.type === "url") {
          const res = await ingestUrl(videoSource.url);
          projectId = res.projectId;
        } else {
          const res = await uploadVideo(videoSource.file);
          projectId = res.projectId;
        }
      }

      const toolParams: Record<string, unknown> = {
        project_id: projectId,
        ...params,
      };

      const res = await callTool({ tool: feature.tool, params: toolParams });
      setResult(
        res.success
          ? JSON.stringify(res.data, null, 2)
          : `Error: ${res.error}`
      );
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-light transition-colors"
      >
        <span className="text-2xl">{feature.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
          <p className="text-xs text-foreground/50 truncate">{feature.description}</p>
        </div>
        <span
          className={`text-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <p className="text-sm text-foreground/60">{feature.description}</p>
          <div className="text-xs text-foreground/30 font-mono">
            MCP Tool: {feature.tool}
          </div>

          {/* Dynamic Parameter Inputs */}
          {paramFields.length > 0 && (
            <div className="space-y-2">
              {paramFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs text-foreground/50 mb-1">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={params[field.name] || ""}
                      onChange={(e) =>
                        setParams({ ...params, [field.name]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={params[field.name] || ""}
                      onChange={(e) =>
                        setParams({ ...params, [field.name]: e.target.value })
                      }
                      className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={params[field.name] || ""}
                      onChange={(e) =>
                        setParams({ ...params, [field.name]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={running}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <span className="animate-spin">⏳</span> Running...
              </>
            ) : (
              <>Run {feature.title}</>
            )}
          </button>

          {result && (
            <pre className="rounded-md bg-background border border-border p-3 text-xs text-foreground/70 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface ParamField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "url";
  placeholder?: string;
  options?: string[];
}

function getParamFields(feature: FeatureCard): ParamField[] {
  switch (feature.id) {
    case "search":
      return [
        { name: "query", label: "Search Query", type: "text", placeholder: "Find emotionally intense moments..." },
        { name: "mode", label: "Search Mode", type: "select", options: ["semantic", "text", "visual"] },
      ];
    case "moments":
      return [
        { name: "purpose", label: "Purpose", type: "select", options: ["hook", "highlight", "cta", "tutorial_step"] },
        { name: "count", label: "Number of Moments", type: "number", placeholder: "5" },
      ];
    case "voice-clone":
      return [
        { name: "reference_url", label: "Reference Audio URL (10-15s)", type: "url", placeholder: "https://..." },
        { name: "name", label: "Voice Profile Name", type: "text", placeholder: "My Voice" },
      ];
    case "speak":
    case "speak-optimized":
      return [
        { name: "text", label: "Text to Speak", type: "textarea", placeholder: "Hello, this is my cloned voice..." },
        { name: "voice_profile", label: "Voice Profile ID", type: "text", placeholder: "profile-id" },
      ];
    case "gen-music":
      return [
        { name: "prompt", label: "Music Prompt", type: "textarea", placeholder: "Upbeat lo-fi chill with soft piano..." },
        { name: "duration", label: "Duration (seconds)", type: "number", placeholder: "30" },
      ];
    case "compose-midi":
      return [
        { name: "preset", label: "MIDI Preset", type: "select", options: ["ambient_pad", "upbeat_pop", "lo_fi_chill", "cinematic", "corporate", "dramatic", "gentle_acoustic", "funk", "jazz", "electronic", "orchestral", "minimal"] },
        { name: "duration", label: "Duration (seconds)", type: "number", placeholder: "30" },
      ];
    case "sfx":
      return [
        { name: "effect", label: "Effect Type", type: "select", options: ["whoosh", "riser", "impact", "chime", "stinger", "transition", "glitch", "sweep", "drop", "notification", "click", "sparkle", "boom"] },
      ];
    case "audio-cleanup":
      return [
        { name: "noise_reduction", label: "Noise Reduction", type: "select", options: ["off", "light", "medium", "heavy"] },
        { name: "de_hum", label: "De-Hum Frequency", type: "select", options: ["off", "50hz", "60hz"] },
      ];
    case "create-edit":
      return [
        { name: "instructions", label: "Edit Instructions", type: "textarea", placeholder: "Create a 60-second highlight reel focusing on emotional moments..." },
        { name: "platform", label: "Target Platform", type: "select", options: ["tiktok", "instagram_reels", "youtube_shorts", "youtube_standard", "youtube_long", "facebook", "linkedin"] },
      ];
    case "auto-trim":
      return [
        { name: "remove_filler", label: "Remove Filler Words", type: "select", options: ["true", "false"] },
        { name: "silence_threshold", label: "Silence Threshold (ms)", type: "number", placeholder: "500" },
      ];
    case "color-adjust":
      return [
        { name: "brightness", label: "Brightness (-1 to 1)", type: "number", placeholder: "0" },
        { name: "contrast", label: "Contrast (-1 to 1)", type: "number", placeholder: "0" },
        { name: "saturation", label: "Saturation (-1 to 1)", type: "number", placeholder: "0" },
      ];
    case "render":
      return [
        { name: "platform", label: "Platform Profile", type: "select", options: ["tiktok", "instagram_reels", "youtube_shorts", "youtube_standard", "youtube_long", "facebook", "linkedin"] },
      ];
    case "driftwise-tts":
    case "driftwise-narrator":
      return [
        { name: "text", label: "Discovery Text", type: "textarea", placeholder: "In 1842, this very crossroads was the site of..." },
        { name: "voice_profile", label: "Your Voice Profile ID", type: "text", placeholder: "profile-id" },
      ];
    case "voice-singing":
      return [
        { name: "lyrics", label: "Lyrics / Melody Description", type: "textarea", placeholder: "Gentle humming melody about the open road..." },
        { name: "voice_profile", label: "Voice Profile ID", type: "text", placeholder: "profile-id" },
        { name: "style", label: "Music Style", type: "text", placeholder: "lo-fi acoustic" },
      ];
    default:
      return [];
  }
}

export default function FeaturePanel({ videoSource }: Props) {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>("analyze");

  const filteredFeatures = FEATURES.filter((f) => f.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${activeCategory === cat
                ? "bg-accent text-white"
                : "bg-surface text-foreground/50 hover:text-foreground/80 hover:bg-surface-light"
              }
            `}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="space-y-2">
        {filteredFeatures.map((feature) => (
          <FeatureCardComponent
            key={feature.id}
            feature={feature}
            videoSource={videoSource}
          />
        ))}
      </div>
    </div>
  );
}
