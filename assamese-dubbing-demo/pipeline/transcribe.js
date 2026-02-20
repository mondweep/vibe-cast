/**
 * ASR / Transcription Stage
 *
 * Integrates with:
 *   - Sarvam Saaras v3 (23 Indian languages incl. Assamese)
 *   - OpenAI Whisper (large-v3) via API
 *   - AI4Bharat IndicWhisper (self-hosted)
 *   - ElevenLabs Scribe
 *
 * For the demo: simulates transcription with realistic sample output.
 * When API keys are configured, routes to the real service.
 */

const { sarvamTranscribe, LANG_MAP } = require('./sarvam');

const SAMPLE_TRANSCRIPTS = {
  en: {
    language: 'English',
    segments: [
      { start: 0.0, end: 3.2, text: 'Welcome to this demonstration of our new product.' },
      { start: 3.5, end: 7.1, text: 'Today we will show you how artificial intelligence can bridge language barriers.' },
      { start: 7.4, end: 11.8, text: 'Our goal is to make technology accessible to everyone, regardless of the language they speak.' },
      { start: 12.1, end: 15.5, text: 'Let us begin with a simple example of how this works.' },
      { start: 15.9, end: 19.3, text: 'The system listens, understands, translates, and speaks — all in real time.' },
    ],
  },
  hi: {
    language: 'Hindi',
    segments: [
      { start: 0.0, end: 3.5, text: 'हमारे नए उत्पाद के इस प्रदर्शन में आपका स्वागत है।' },
      { start: 3.8, end: 7.4, text: 'आज हम आपको दिखाएंगे कि कृत्रिम बुद्धिमत्ता भाषा की बाधाओं को कैसे पार कर सकती है।' },
      { start: 7.7, end: 12.0, text: 'हमारा लक्ष्य प्रौद्योगिकी को सभी के लिए सुलभ बनाना है।' },
      { start: 12.3, end: 15.8, text: 'आइए एक सरल उदाहरण से शुरू करते हैं।' },
      { start: 16.1, end: 19.5, text: 'सिस्टम सुनता है, समझता है, अनुवाद करता है, और बोलता है।' },
    ],
  },
};

async function transcribe(fileOrMeta, options = {}) {
  const { apiKey, provider = 'demo', sourceLanguage = 'en', fileBuffer } = options;

  // Real API integration points
  if (provider === 'sarvam' && apiKey && fileBuffer) {
    return await transcribeWithSarvam(fileBuffer, apiKey, sourceLanguage, fileOrMeta);
  }
  if (provider === 'whisper' && apiKey) {
    return await transcribeWithWhisper(fileOrMeta, apiKey);
  }
  if (provider === 'indicwhisper' && options.endpoint) {
    return await transcribeWithIndicWhisper(fileOrMeta, options.endpoint);
  }
  if (provider === 'elevenlabs' && apiKey) {
    return await transcribeWithElevenLabs(fileOrMeta, apiKey);
  }

  // Demo mode: simulate processing
  await simulateProcessing(800);

  const transcript = SAMPLE_TRANSCRIPTS[sourceLanguage] || SAMPLE_TRANSCRIPTS.en;
  return {
    provider: 'demo',
    ...transcript,
    duration: transcript.segments[transcript.segments.length - 1].end,
    wordCount: transcript.segments.reduce((sum, s) => sum + s.text.split(' ').length, 0),
  };
}

async function transcribeWithSarvam(fileBuffer, apiKey, sourceLanguage, fileMeta) {
  const langCode = LANG_MAP[sourceLanguage] || 'en-IN';
  const filename = (fileMeta && fileMeta.name) || 'audio.wav';

  const result = await sarvamTranscribe(fileBuffer, apiKey, {
    language: langCode,
    filename,
  });

  // Sarvam returns { transcript, language_code, timestamps? }
  // Normalize to pipeline format: { segments: [{ start, end, text }] }
  let segments;
  if (result.timestamps && result.timestamps.length > 0) {
    // Use word-level timestamps to build segments
    segments = buildSegmentsFromTimestamps(result.timestamps, result.transcript);
  } else {
    // No timestamps — treat entire transcript as one segment
    segments = [{ start: 0, end: 30, text: result.transcript }];
  }

  return {
    provider: 'sarvam',
    language: langCode,
    segments,
    transcript: result.transcript,
    duration: segments[segments.length - 1].end,
    wordCount: result.transcript.split(/\s+/).length,
  };
}

/**
 * Build sentence-level segments from Sarvam word-level timestamps.
 * Groups words into segments splitting on sentence-ending punctuation.
 */
function buildSegmentsFromTimestamps(timestamps, fullTranscript) {
  if (!timestamps || timestamps.length === 0) {
    return [{ start: 0, end: 30, text: fullTranscript }];
  }

  const segments = [];
  let currentWords = [];
  let segStart = timestamps[0].start || 0;

  for (const ts of timestamps) {
    currentWords.push(ts.word || ts.text || '');
    const word = currentWords[currentWords.length - 1];

    // Split on sentence-ending punctuation
    if (/[।.!?]$/.test(word) || currentWords.length >= 20) {
      segments.push({
        start: segStart,
        end: ts.end || segStart + 3,
        text: currentWords.join(' ').trim(),
      });
      currentWords = [];
      segStart = ts.end || segStart + 3;
    }
  }

  // Remaining words
  if (currentWords.length > 0) {
    const lastTs = timestamps[timestamps.length - 1];
    segments.push({
      start: segStart,
      end: lastTs.end || segStart + 3,
      text: currentWords.join(' ').trim(),
    });
  }

  return segments;
}

async function transcribeWithWhisper(filePath, apiKey) {
  // Integration point for OpenAI Whisper API
  // In production: POST to https://api.openai.com/v1/audio/transcriptions
  throw new Error(
    'Whisper API integration requires: npm install openai\n' +
    'Set OPENAI_API_KEY in your environment.\n' +
    'Model: whisper-1 (large-v3 equivalent)'
  );
}

async function transcribeWithIndicWhisper(filePath, endpoint) {
  // Integration point for self-hosted AI4Bharat IndicWhisper
  // Typically deployed via: https://github.com/AI4Bharat/IndicWhisper
  throw new Error(
    'IndicWhisper integration requires a running IndicWhisper server.\n' +
    'Deploy: docker run -p 8000:8000 ai4bharat/indicwhisper\n' +
    'Set INDICWHISPER_ENDPOINT in your environment.'
  );
}

async function transcribeWithElevenLabs(filePath, apiKey) {
  // Integration point for ElevenLabs Scribe
  // POST to https://api.elevenlabs.io/v1/speech-to-text
  throw new Error(
    'ElevenLabs Scribe integration requires: set ELEVENLABS_API_KEY\n' +
    'Assamese is in "Good" tier (10-25% WER).'
  );
}

function simulateProcessing(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { transcribe };
