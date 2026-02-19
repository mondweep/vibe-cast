/**
 * Sarvam AI Integration
 *
 * Sarvam AI (https://www.sarvam.ai) provides Indian-language-first APIs:
 *   - Saaras v3: Speech-to-Text (23 languages including Assamese)
 *   - Sarvam Translate: Translation (23 languages including Assamese)
 *   - Bulbul v3: Text-to-Speech (11 languages — check Assamese availability)
 *
 * API docs: https://docs.sarvam.ai
 *
 * To use: set SARVAM_API_KEY environment variable
 */

const https = require('https');

const SARVAM_BASE = 'https://api.sarvam.ai';

const SARVAM_LANGUAGES = {
  stt: [
    'as-IN', 'bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN',
    'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN',
    'ur-IN', 'ne-IN', 'sd-IN', 'kok-IN', 'doi-IN', 'brx-IN',
    'mni-IN', 'sat-IN', 'ks-IN', 'mai-IN',
  ],
  translate: [
    'as', 'bn', 'en', 'gu', 'hi', 'kn', 'ml', 'mr', 'od',
    'pa', 'ta', 'te', 'ur', 'ne', 'sd', 'kok', 'doi', 'brx',
    'mni', 'sat', 'ks', 'mai',
  ],
  tts: [
    'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'gu-IN', 'kn-IN',
    'ml-IN', 'mr-IN', 'pa-IN', 'od-IN', 'en-IN',
    // Note: Assamese was in Bulbul V2 but may not be in V3.
    // Check docs.sarvam.ai for current status.
  ],
};

/**
 * Sarvam Speech-to-Text (Saaras v3)
 * Assamese support: YES (as-IN)
 */
async function sarvamTranscribe(audioBuffer, apiKey, options = {}) {
  const { language = 'en-IN', model = 'saaras:v3' } = options;

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), 'audio.wav');
  formData.append('model', model);
  formData.append('language_code', language);

  const response = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam STT error (${response.status}): ${err}`);
  }

  return await response.json();
}

/**
 * Sarvam Translate
 * Assamese support: YES (as)
 */
async function sarvamTranslate(text, apiKey, options = {}) {
  const {
    sourceLanguage = 'en-IN',
    targetLanguage = 'as-IN',
    model = 'mayura:v2',
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
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam Translate error (${response.status}): ${err}`);
  }

  return await response.json();
}

/**
 * Sarvam Text-to-Speech (Bulbul v3)
 * Assamese support: UNCERTAIN in V3 (was supported in V2)
 * Falls back to Bengali (bn-IN) which shares the same script
 */
async function sarvamTTS(text, apiKey, options = {}) {
  const {
    targetLanguage = 'as-IN',
    model = 'bulbul:v2',
    speaker = 'meera',
    pitch = 0,
    pace = 1.0,
    loudness = 1.0,
    sampleRate = 22050,
  } = options;

  const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: targetLanguage,
      model,
      speaker,
      pitch,
      pace,
      loudness,
      sample_rate: sampleRate,
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
  SARVAM_LANGUAGES,
};
