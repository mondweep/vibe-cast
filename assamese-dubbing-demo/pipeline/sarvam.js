/**
 * Sarvam AI Integration — Live API calls
 *
 * API docs: https://docs.sarvam.ai
 * Auth header: api-subscription-key: YOUR_KEY
 *
 * Assamese support:
 *   STT (Saaras v3): YES — as-IN
 *   Translate (sarvam-translate:v1): YES — as-IN (formal mode only)
 *   TTS (Bulbul v3): NO — 11 languages, Assamese not included
 */

const SARVAM_BASE = 'https://api.sarvam.ai';

// Language code mapping: simple code → BCP-47
const LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  od: 'od-IN',
  pa: 'pa-IN',
};

/**
 * Speech-to-Text via Saaras v3
 *
 * @param {Buffer} audioBuffer - Raw audio file bytes
 * @param {string} apiKey
 * @param {object} options - { language, model, mode }
 * @returns {object} - { transcript, language_code, timestamps }
 */
async function sarvamTranscribe(audioBuffer, apiKey, options = {}) {
  const {
    language = 'en-IN',
    model = 'saaras:v3',
    mode = 'transcribe',
    filename = 'audio.wav',
  } = options;

  // Build multipart form data manually for Node.js
  const boundary = '----SarvamBoundary' + Date.now().toString(36);
  const parts = [];

  // File part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`
  );
  parts.push(audioBuffer);
  parts.push('\r\n');

  // Model part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="model"\r\n\r\n` +
    `${model}\r\n`
  );

  // Language part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="language_code"\r\n\r\n` +
    `${language}\r\n`
  );

  // Mode part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="mode"\r\n\r\n` +
    `${mode}\r\n`
  );

  parts.push(`--${boundary}--\r\n`);

  // Concatenate all parts into a single Buffer
  const bodyParts = parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf-8'));
  const body = Buffer.concat(bodyParts);

  const response = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam STT error (${response.status}): ${err}`);
  }

  return await response.json();
}

/**
 * Translate via sarvam-translate:v1
 *
 * @param {string} text - Text to translate (max 2000 chars)
 * @param {string} apiKey
 * @param {object} options
 * @returns {object} - { translated_text, source_language_code }
 */
async function sarvamTranslate(text, apiKey, options = {}) {
  const {
    sourceLanguage = 'en-IN',
    targetLanguage = 'as-IN',
    model = 'sarvam-translate:v1',
  } = options;

  const response = await fetch(`${SARVAM_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      model,
      mode: 'formal',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam Translate error (${response.status}): ${err}`);
  }

  return await response.json();
}

/**
 * Text-to-Speech via Sarvam Bulbul
 *
 * Assamese (as-IN) is NOT directly supported in Bulbul v2 or v3.
 * Bengali (bn-IN) is used as the closest fallback — same script family.
 *
 * Supported languages: bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN, mr-IN,
 *                      od-IN, pa-IN, ta-IN, te-IN
 *
 * @param {string} text
 * @param {string} apiKey
 * @param {object} options
 * @returns {object} - { audios: [base64_string] }
 */
async function sarvamTTS(text, apiKey, options = {}) {
  const {
    targetLanguage = 'bn-IN',
    model = 'bulbul:v2',
    speaker = 'anushka',
    pace = 1.0,
    temperature = 0.6,
    sampleRate = '24000',
    outputCodec = 'wav',
  } = options;

  const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      text,
      target_language_code: targetLanguage,
      model,
      speaker,
      pace,
      temperature,
      speech_sample_rate: sampleRate,
      output_audio_codec: outputCodec,
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam TTS error (${response.status}): ${err}`);
  }

  return await response.json();
}

module.exports = {
  sarvamTranscribe,
  sarvamTranslate,
  sarvamTTS,
  LANG_MAP,
};
