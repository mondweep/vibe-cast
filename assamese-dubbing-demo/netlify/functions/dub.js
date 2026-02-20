const { transcribe } = require('../../pipeline/transcribe');
const { translate } = require('../../pipeline/translate');
const { synthesize } = require('../../pipeline/synthesize');
const { lipsync } = require('../../pipeline/lipsync');
const { mix } = require('../../pipeline/mix');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse body — handle both JSON and multipart (multipart falls back to demo)
  let sourceLanguage = 'en';
  let providers = {};
  let sourceUrl;
  const contentType = (event.headers['content-type'] || '');

  if (contentType.includes('multipart/form-data')) {
    // Netlify Functions don't natively parse multipart — treat as demo with file noted
    sourceLanguage = 'en';
    providers = {};
  } else {
    try {
      const body = JSON.parse(event.body || '{}');
      sourceLanguage = body.sourceLanguage || 'en';
      providers = body.providers || {};
      sourceUrl = body.sourceUrl;
    } catch {
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  }
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const results = { jobId, stages: [], startTime: Date.now() };

  try {
    // Stage 1: Transcription
    const transcribeResult = await transcribe(null, {
      provider: providers.transcription || 'demo',
      sourceLanguage,
      apiKey: process.env.OPENAI_API_KEY || process.env.SARVAM_API_KEY,
    });
    results.stages.push({
      name: 'Transcription (ASR)',
      status: 'complete',
      provider: transcribeResult.provider,
      data: transcribeResult,
    });

    // Stage 2: Translation
    const translateResult = await translate(transcribeResult.segments, {
      provider: providers.translation || 'demo',
      sourceLanguage,
      apiKey: process.env.AZURE_TRANSLATOR_KEY || process.env.SARVAM_API_KEY,
    });
    results.stages.push({
      name: 'Translation to Assamese',
      status: 'complete',
      provider: translateResult.provider,
      data: translateResult,
    });

    // Stage 3: TTS Synthesis
    const synthesizeResult = await synthesize(translateResult.segments, {
      provider: providers.synthesis || 'demo',
      voice: providers.voice || 'ai4bharat-parler',
      apiKey: process.env.AZURE_SPEECH_KEY || process.env.ELEVENLABS_API_KEY || process.env.SARVAM_API_KEY,
    });
    results.stages.push({
      name: 'Assamese TTS Synthesis',
      status: 'complete',
      provider: synthesizeResult.provider,
      data: synthesizeResult,
    });

    // Stage 4: Lip Sync
    const lipsyncResult = await lipsync(null, synthesizeResult.segments, {
      provider: providers.lipsync || 'demo',
      engine: providers.lipsyncEngine || 'wav2lip',
    });
    results.stages.push({
      name: 'Lip Sync',
      status: 'complete',
      provider: lipsyncResult.provider,
      data: lipsyncResult,
    });

    // Stage 5: Audio Mixing
    const mixResult = await mix(synthesizeResult, null, {
      provider: providers.mixing || 'demo',
    });
    results.stages.push({
      name: 'Audio Mixing & Export',
      status: 'complete',
      provider: mixResult.provider,
      data: mixResult,
    });

    results.totalTime = Date.now() - results.startTime;
    results.status = 'complete';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results),
    };
  } catch (err) {
    results.error = err.message;
    results.status = 'error';
    results.totalTime = Date.now() - results.startTime;

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results),
    };
  }
};
