"use client";

import { useState } from "react";

interface UseCase {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: string[];
  tools: string[];
}

const USE_CASES: UseCase[] = [
  {
    id: "voice-clone-sing",
    title: "Clone Your Voice to Sing",
    icon: "🎤",
    description:
      "Record or upload a short voice sample, then use ClipCannon's voice cloning + music generation to create singing output in your voice.",
    steps: [
      "Upload 10-15 seconds of your voice (clear speech, no background noise)",
      "ClipCannon creates a voice profile using Qwen3-TTS with ECAPA-TDNN fingerprinting",
      "Generate music with ACE-Step or MusicGen from a text prompt",
      "Combine your cloned voice with the generated melody",
      "Use HTDemucs source separation to isolate and remix tracks",
      "Render final audio with broadcast-quality enhancement",
    ],
    tools: [
      "clipcannon_prepare_voice_data",
      "clipcannon_voice_profiles",
      "clipcannon_generate_music",
      "clipcannon_speak_optimized",
      "clipcannon_audio_cleanup",
    ],
  },
  {
    id: "driftwise-tts",
    title: "Custom Voice for Driftwise",
    icon: "🧭",
    description:
      "Replace Driftwise's ElevenLabs TTS with your own cloned voice. Generate audio files that Driftwise can serve as its premium TTS provider.",
    steps: [
      "Record your voice reading a few sample discovery texts",
      "Create a ClipCannon voice profile from the samples",
      "Set up an API endpoint that accepts text and returns audio blobs",
      "Configure Driftwise to call your endpoint instead of ElevenLabs",
      "Audio is generated locally — no per-request cloud costs",
    ],
    tools: [
      "clipcannon_prepare_voice_data",
      "clipcannon_speak_optimized",
      "clipcannon_voice_profiles",
    ],
  },
  {
    id: "video-highlights",
    title: "Auto-Generate Video Highlights",
    icon: "⭐",
    description:
      "Point ClipCannon at a YouTube video and automatically create platform-specific highlight reels.",
    steps: [
      "Paste a YouTube URL or upload a video",
      "Run the 22-stage analysis pipeline (transcription, emotion, scene detection)",
      "Find best moments for hooks, highlights, and CTAs",
      "Auto-create an EDL with smart cropping and captions",
      "Preview at 540p, then render for TikTok, YouTube Shorts, or Instagram",
    ],
    tools: [
      "clipcannon_ingest",
      "clipcannon_find_best_moments",
      "clipcannon_create_edit",
      "clipcannon_preview",
      "clipcannon_render",
    ],
  },
  {
    id: "lip-sync-avatar",
    title: "Talking Head Avatar",
    icon: "🤖",
    description:
      "Generate a lip-synced avatar that speaks with your cloned voice. Great for social media content without being on camera.",
    steps: [
      "Upload a photo or short video of a face",
      "Clone your voice from a reference audio sample",
      "Generate speech from text using your voice",
      "Apply LatentSync 1.6 to create lip-synced animation",
      "Render final video with optional background and overlays",
    ],
    tools: [
      "clipcannon_prepare_voice_data",
      "clipcannon_speak",
      "clipcannon_lip_sync",
      "clipcannon_extract_webcam",
      "clipcannon_render",
    ],
  },
  {
    id: "journey-narrator",
    title: "Road Journey Narrator",
    icon: "🛣️",
    description:
      "Enhance Driftwise by pre-generating narration packs for popular routes using your cloned voice with emotional prosody.",
    steps: [
      "Define a route with GPS waypoints",
      "Generate discovery facts for each location via Gemini",
      "Use ClipCannon to narrate each fact in your cloned voice",
      "Apply prosody control for natural storytelling cadence",
      "Bundle audio files for offline playback in Driftwise",
    ],
    tools: [
      "clipcannon_speak_optimized",
      "clipcannon_voice_profiles",
      "clipcannon_generate_sfx",
    ],
  },
];

export default function UseCasesPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Use Cases</h2>
      {USE_CASES.map((uc) => (
        <div
          key={uc.id}
          className="rounded-lg bg-surface border border-border overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === uc.id ? null : uc.id)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-light transition-colors"
          >
            <span className="text-2xl">{uc.icon}</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">{uc.title}</h3>
              <p className="text-xs text-foreground/50">{uc.description}</p>
            </div>
            <span
              className={`text-foreground/30 transition-transform ${
                expandedId === uc.id ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {expandedId === uc.id && (
            <div className="border-t border-border p-4 space-y-3">
              <h4 className="text-xs font-medium text-accent uppercase tracking-wider">
                Workflow Steps
              </h4>
              <ol className="space-y-2">
                {uc.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/70">
                    <span className="text-accent font-mono text-xs mt-0.5">
                      {i + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <h4 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mt-3">
                ClipCannon Tools Used
              </h4>
              <div className="flex flex-wrap gap-1">
                {uc.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-mono text-accent"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
