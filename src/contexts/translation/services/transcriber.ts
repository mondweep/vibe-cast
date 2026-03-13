/**
 * Fetch YouTube caption tracks for a video.
 * Falls back to Whisper transcription if no captions available.
 */
export async function fetchCaptions(videoId: string): Promise<CaptionTrack[]> {
  const response = await fetch(`/api/youtube/captions/${videoId}`);
  if (!response.ok) {
    return []; // No captions available, will fall back to Whisper
  }
  return response.json();
}

/**
 * Transcribe audio using Whisper (via backend proxy).
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('language', 'sa'); // Sanskrit ISO code

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transcribe a full YouTube video's audio using the backend yt-dlp + Whisper pipeline.
 */
export async function transcribeVideoAudio(videoId: string): Promise<TranscriptionResult> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });

  if (!response.ok) {
    throw new Error(`Server transcription failed: ${response.statusText}`);
  }

  return response.json();
}

export interface CaptionTrack {
  lines: CaptionLine[];
  language: string;
}

export interface CaptionLine {
  text: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptionResult {
  text: string;
  segments: {
    text: string;
    start: number;
    end: number;
  }[];
  language: string;
}
