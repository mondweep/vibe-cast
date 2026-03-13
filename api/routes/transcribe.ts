// Audio transcription route
// Uses Whisper API for Sanskrit speech-to-text
import fs from 'fs'

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'https://api.groq.com/openai/v1/audio/transcriptions'

export interface TranscriptionResult {
  text: string
  segments: {
    start: number
    end: number
    text: string
  }[]
  language: string
}

export async function transcribeAudio(
  audioInput: ArrayBuffer | Buffer,
  language: string = 'sa' // Sanskrit ISO 639-1
): Promise<TranscriptionResult> {
  const formData = new FormData()
  
  const blob = new Blob([audioInput as any], { type: 'audio/webm' })
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', language)
  formData.append('response_format', 'verbose_json')
  formData.append('prompt', 'Transcribe the Sanskrit audio accurately, preserving Devanagari script. Focus on Vedic chants or classical Sanskrit stotras.')

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    text: data.text,
    segments: data.segments.map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
    language: data.language,
  }
}

// Fetch YouTube auto-generated captions as fallback
export async function fetchYouTubeCaptions(videoId: string): Promise<TranscriptionResult | null> {
  try {
    // YouTube timedtext API (unofficial but widely used)
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=sa&fmt=json3`
    )

    if (!response.ok) {
      // Try Hindi captions as fallback (many Sanskrit songs have Hindi captions)
      const hindiFallback = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=hi&fmt=json3`
      )
      if (!hindiFallback.ok) return null
      const data = await hindiFallback.json()
      return parseTimedText(data)
    }

    const data = await response.json()
    return parseTimedText(data)
  } catch {
    return null
  }
}

function parseTimedText(data: any): TranscriptionResult {
  const events = data.events || []
  const segments = events
    .filter((e: any) => e.segs)
    .map((e: any) => ({
      start: (e.tStartMs || 0) / 1000,
      end: ((e.tStartMs || 0) + (e.dDurationMs || 3000)) / 1000,
      text: e.segs.map((s: any) => s.utf8).join(''),
    }))

  return {
    text: segments.map((s: any) => s.text).join(' '),
    segments,
    language: 'sa',
  }
}
