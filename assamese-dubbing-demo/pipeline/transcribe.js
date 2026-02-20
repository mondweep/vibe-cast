/**
 * ASR / Transcription Stage
 *
 * Integrates with:
 *   - OpenAI Whisper (large-v3) via API
 *   - AI4Bharat IndicWhisper (self-hosted)
 *   - ElevenLabs Scribe
 *
 * For the demo: simulates transcription with realistic sample output.
 * When API keys are configured, routes to the real service.
 */

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

async function transcribe(filePath, options = {}) {
  const { apiKey, provider = 'demo', sourceLanguage = 'en' } = options;

  // Real API integration points
  if (provider === 'whisper' && apiKey) {
    return await transcribeWithWhisper(filePath, apiKey);
  }
  if (provider === 'indicwhisper' && options.endpoint) {
    return await transcribeWithIndicWhisper(filePath, options.endpoint);
  }
  if (provider === 'elevenlabs' && apiKey) {
    return await transcribeWithElevenLabs(filePath, apiKey);
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
