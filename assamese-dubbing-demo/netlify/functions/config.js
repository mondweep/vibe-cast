const { VOICES } = require('../../pipeline/synthesize');
const { LIPSYNC_ENGINES } = require('../../pipeline/lipsync');

exports.handler = async (event) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAzureTTS = !!process.env.AZURE_SPEECH_KEY;
  const hasAzureTranslator = !!process.env.AZURE_TRANSLATOR_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasSarvam = !!process.env.SARVAM_API_KEY;
  const hasIndicWhisper = !!process.env.INDICWHISPER_ENDPOINT;
  const hasIndicTrans2 = !!process.env.INDICTRANS2_ENDPOINT;
  const hasIndicTTS = !!process.env.INDIC_TTS_ENDPOINT;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
    }),
  };
};
