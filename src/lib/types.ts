export type VideoSource =
  | { type: "url"; url: string }
  | { type: "upload"; file: File; previewUrl: string };

export type FeatureCategory =
  | "analyze"
  | "voice"
  | "audio"
  | "edit"
  | "render"
  | "driftwise";

export interface JobStatus {
  id: string;
  feature: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  message: string;
  result?: unknown;
}

export interface VoiceProfile {
  id: string;
  name: string;
  sampleUrl?: string;
  created: string;
}

export interface FeatureCard {
  id: string;
  category: FeatureCategory;
  title: string;
  description: string;
  tool: string;
  icon: string;
  params?: Record<string, unknown>;
}

export const FEATURES: FeatureCard[] = [
  // Analysis
  {
    id: "ingest",
    category: "analyze",
    title: "Ingest & Analyze",
    description: "Run the full 22-stage analysis pipeline: transcription, emotion, scene detection, visual embeddings, and more.",
    tool: "clipcannon_ingest",
    icon: "🔬",
  },
  {
    id: "transcript",
    category: "analyze",
    title: "Get Transcript",
    description: "Retrieve the full transcript with speaker labels, timestamps, and word-level alignment.",
    tool: "clipcannon_get_transcript",
    icon: "📝",
  },
  {
    id: "search",
    category: "analyze",
    title: "Search Content",
    description: "Semantic or text-based search across video content using 5 embedding spaces.",
    tool: "clipcannon_search_content",
    icon: "🔍",
  },
  {
    id: "moments",
    category: "analyze",
    title: "Find Best Moments",
    description: "Discover highlights by purpose: hooks, emotional peaks, CTA moments, tutorial steps.",
    tool: "clipcannon_find_best_moments",
    icon: "⭐",
  },
  // Voice
  {
    id: "voice-clone",
    category: "voice",
    title: "Clone Voice",
    description: "Create a voice profile from 10-15 seconds of reference audio. Uses Qwen3-TTS with speaker verification.",
    tool: "clipcannon_prepare_voice_data",
    icon: "🎤",
  },
  {
    id: "speak",
    category: "voice",
    title: "Text-to-Speech",
    description: "Generate speech using a cloned voice with prosody control and best-of-N selection.",
    tool: "clipcannon_speak",
    icon: "🗣️",
  },
  {
    id: "speak-optimized",
    category: "voice",
    title: "Optimized TTS",
    description: "Best-of-N candidate selection scored against voice fingerprint for highest fidelity.",
    tool: "clipcannon_speak_optimized",
    icon: "✨",
  },
  {
    id: "voice-profiles",
    category: "voice",
    title: "Voice Profiles",
    description: "Manage your cloned voice profiles - list, create, update, and delete.",
    tool: "clipcannon_voice_profiles",
    icon: "👤",
  },
  // Audio
  {
    id: "gen-music",
    category: "audio",
    title: "Generate Music",
    description: "AI music generation via ACE-Step or MusicGen from text prompts.",
    tool: "clipcannon_generate_music",
    icon: "🎵",
  },
  {
    id: "compose-midi",
    category: "audio",
    title: "Compose MIDI",
    description: "12 MIDI presets: ambient pad, upbeat pop, lo-fi chill, cinematic, and more.",
    tool: "clipcannon_compose_midi",
    icon: "🎹",
  },
  {
    id: "sfx",
    category: "audio",
    title: "Sound Effects",
    description: "13 DSP sound effects: whoosh, riser, impact, chime, stinger, and more.",
    tool: "clipcannon_generate_sfx",
    icon: "💥",
  },
  {
    id: "audio-cleanup",
    category: "audio",
    title: "Audio Cleanup",
    description: "Noise reduction, de-hum, de-ess, and loudness normalization.",
    tool: "clipcannon_audio_cleanup",
    icon: "🧹",
  },
  // Editing
  {
    id: "create-edit",
    category: "edit",
    title: "Create Edit",
    description: "Create an EDL with segments, captions, smart crop, and audio mixing.",
    tool: "clipcannon_create_edit",
    icon: "✂️",
  },
  {
    id: "auto-trim",
    category: "edit",
    title: "Auto Trim",
    description: "Remove filler words and silence gaps automatically.",
    tool: "clipcannon_auto_trim",
    icon: "📐",
  },
  {
    id: "color-adjust",
    category: "edit",
    title: "Color Grading",
    description: "Adjust brightness, contrast, saturation, gamma, and hue shift.",
    tool: "clipcannon_color_adjust",
    icon: "🎨",
  },
  {
    id: "add-motion",
    category: "edit",
    title: "Add Motion",
    description: "Zoom, pan, and Ken Burns effects on segments.",
    tool: "clipcannon_add_motion",
    icon: "🎥",
  },
  // Rendering
  {
    id: "preview",
    category: "render",
    title: "Preview (540p)",
    description: "Quick preview render at 540p for review before final output.",
    tool: "clipcannon_preview",
    icon: "👁️",
  },
  {
    id: "render",
    category: "render",
    title: "Render Final",
    description: "Full render with platform-specific profiles: TikTok, YouTube, Instagram, LinkedIn, Facebook.",
    tool: "clipcannon_render",
    icon: "🎬",
  },
  {
    id: "lip-sync",
    category: "render",
    title: "Lip Sync Avatar",
    description: "Generate talking-head avatars with LatentSync 1.6. Requires ~18GB VRAM.",
    tool: "clipcannon_lip_sync",
    icon: "🤖",
  },
  // Driftwise Integration
  {
    id: "driftwise-tts",
    category: "driftwise",
    title: "Driftwise Voice",
    description: "Clone your voice and generate TTS audio compatible with Driftwise's ElevenLabs/Web Speech API pipeline.",
    tool: "clipcannon_speak",
    icon: "🧭",
  },
  {
    id: "driftwise-narrator",
    category: "driftwise",
    title: "Journey Narrator",
    description: "Generate narration audio for road discoveries using your cloned voice.",
    tool: "clipcannon_speak_optimized",
    icon: "🛣️",
  },
  {
    id: "voice-singing",
    category: "driftwise",
    title: "Voice Singing",
    description: "Combine your cloned voice with AI music generation to create singing output.",
    tool: "clipcannon_generate_music",
    icon: "🎶",
  },
];
