require('dotenv').config();

// Configure global fetch to use HTTP proxy if present
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = require('undici');
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { transcribe } = require('./pipeline/transcribe');
const { translate } = require('./pipeline/translate');
const { synthesize, VOICES } = require('./pipeline/synthesize');
const { lipsync, LIPSYNC_ENGINES } = require('./pipeline/lipsync');
const { mix } = require('./pipeline/mix');
const { downloadAudio } = require('./pipeline/download');

const app = express();
const PORT = process.env.PORT || 3000;

// File upload config — store in memory for demo, disk for production
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are accepted'));
    }
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------------
// Pipeline configuration — shows what providers are available
// -------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAzureTTS = !!process.env.AZURE_SPEECH_KEY;
  const hasAzureTranslator = !!process.env.AZURE_TRANSLATOR_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasSarvam = !!process.env.SARVAM_API_KEY;
  const hasIndicWhisper = !!process.env.INDICWHISPER_ENDPOINT;
  const hasIndicTrans2 = !!process.env.INDICTRANS2_ENDPOINT;
  const hasIndicTTS = !!process.env.INDIC_TTS_ENDPOINT;

  res.json({
    mode: (hasOpenAI || hasAzureTTS || hasElevenLabs || hasSarvam) ? 'hybrid' : 'demo',
    providers: {
      transcription: [
        { id: 'demo', name: 'Demo (simulated)', available: true },
        { id: 'sarvam', name: 'Sarvam Saaras v3 (23 langs incl. Assamese)', available: hasSarvam },
        { id: 'whisper', name: 'OpenAI Whisper', available: hasOpenAI },
        { id: 'indicwhisper', name: 'AI4Bharat IndicWhisper', available: hasIndicWhisper },
        { id: 'elevenlabs', name: 'ElevenLabs Scribe', available: hasElevenLabs },
      ],
      translation: [
        { id: 'demo', name: 'Demo (pre-translated samples)', available: true },
        { id: 'sarvam', name: 'Sarvam Translate (23 langs incl. Assamese)', available: hasSarvam },
        { id: 'indictrans2', name: 'AI4Bharat IndicTrans2', available: hasIndicTrans2 },
        { id: 'azure', name: 'Azure Translator', available: hasAzureTranslator },
      ],
      synthesis: [
        { id: 'demo', name: 'Demo (simulated)', available: true },
        { id: 'sarvam', name: 'Sarvam Bulbul v3 (Indian languages)', available: hasSarvam },
        { id: 'ai4bharat-parler', name: 'AI4Bharat Indic Parler-TTS', available: hasIndicTTS },
        { id: 'ai4bharat-f5', name: 'AI4Bharat IndicF5 (voice cloning)', available: hasIndicTTS },
        { id: 'azure', name: 'Azure TTS (Yashica)', available: hasAzureTTS },
        { id: 'elevenlabs', name: 'ElevenLabs Multilingual', available: hasElevenLabs },
      ],
      lipsync: [
        { id: 'demo', name: 'Demo (simulated)', available: true },
        { id: 'wav2lip', name: 'Wav2Lip (local GPU)', available: false },
        { id: 'sync-so', name: 'Sync.so (cloud API)', available: false },
      ],
      mixing: [
        { id: 'demo', name: 'Demo (simulated)', available: true },
      ],
    },
    voices: VOICES,
    lipsyncEngines: LIPSYNC_ENGINES,
  });
});

// -------------------------------------------------------------------
// Run the full dubbing pipeline
// -------------------------------------------------------------------
app.post('/api/dub', upload.single('file'), async (req, res) => {
  const jobId = uuidv4();

  // Handle both JSON and multipart form data
  let sourceLanguage, providers, sourceUrl, uploadedFile, fileBuffer;
  const hasSarvamKey = !!process.env.SARVAM_API_KEY;

  if (req.file) {
    // Multipart upload — capture the actual buffer for real processing
    sourceLanguage = req.body.sourceLanguage || 'en';
    providers = { voice: req.body.voice || 'ai4bharat-parler' };
    uploadedFile = { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype };
    fileBuffer = req.file.buffer;

    // Auto-select Sarvam as provider when API key is set and file is uploaded
    if (hasSarvamKey) {
      providers.transcription = providers.transcription || 'sarvam';
      providers.translation = providers.translation || 'sarvam';
      providers.synthesis = providers.synthesis || 'sarvam';
    }
  } else {
    sourceLanguage = (req.body && req.body.sourceLanguage) || 'en';
    providers = (req.body && req.body.providers) || {};
    sourceUrl = req.body && req.body.sourceUrl;

    // Download audio from URL if provided
    if (sourceUrl && hasSarvamKey) {
      try {
        const downloaded = await downloadAudio(sourceUrl);
        fileBuffer = downloaded.buffer;
        uploadedFile = { name: downloaded.filename, size: downloaded.buffer.length };
        providers.transcription = providers.transcription || 'sarvam';
        providers.translation = providers.translation || 'sarvam';
        providers.synthesis = providers.synthesis || 'sarvam';
      } catch (dlErr) {
        return res.status(400).json({
          jobId,
          status: 'error',
          error: `Failed to download audio: ${dlErr.message}`,
        });
      }
    }
  }

  const results = { jobId, stages: [], startTime: Date.now() };

  try {
    // Stage 1: Transcription
    const transcribeResult = await transcribe(uploadedFile || null, {
      provider: providers.transcription || 'demo',
      sourceLanguage,
      apiKey: process.env.SARVAM_API_KEY || process.env.OPENAI_API_KEY,
      fileBuffer: fileBuffer || null,
    });
    // Include source info in results
    if (sourceUrl) {
      transcribeResult.source = { type: 'url', url: sourceUrl, downloadedSize: uploadedFile ? uploadedFile.size : null };
    } else if (uploadedFile) {
      transcribeResult.source = { type: 'upload', name: uploadedFile.name, size: uploadedFile.size };
    } else {
      transcribeResult.source = { type: 'demo' };
    }
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
      apiKey: process.env.SARVAM_API_KEY || process.env.AZURE_TRANSLATOR_KEY,
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
      apiKey: process.env.SARVAM_API_KEY || process.env.AZURE_SPEECH_KEY || process.env.ELEVENLABS_API_KEY,
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
    res.json(results);
  } catch (err) {
    results.error = err.message;
    results.status = 'error';
    results.totalTime = Date.now() - results.startTime;
    res.status(500).json(results);
  }
});

// -------------------------------------------------------------------
// Health check
// -------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`\n  Assamese Video Dubbing Demo`);
  console.log(`  ──────────────────────────────`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  Mode: ${process.env.SARVAM_API_KEY ? 'Live (Sarvam)' : 'Demo (simulated)'}`);
  console.log(`\n  To enable live APIs, set environment variables:`);
  console.log(`    SARVAM_API_KEY      > Sarvam AI (STT + Translation + TTS)`);
  console.log(`    OPENAI_API_KEY      > Whisper transcription`);
  console.log(`    AZURE_SPEECH_KEY    > Azure TTS (Yashica)`);
  console.log(`    ELEVENLABS_API_KEY  > ElevenLabs multilingual`);
  console.log();
});
