# Assamese Video Dubbing Pipeline

AI-powered English-to-Assamese video dubbing pipeline using [Sarvam AI](https://www.sarvam.ai/) and other Indian language AI providers.

Upload an audio/video file or provide a YouTube URL — the pipeline transcribes English speech, translates to Assamese, generates dubbed audio, simulates lip-sync, and produces the final mix. Everything runs through a polished web UI with real-time pipeline visualization.

## Pipeline Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Stage 1       │    │    Stage 2       │    │    Stage 3       │    │    Stage 4       │    │    Stage 5       │
│  Transcription  │───▶│  Translation     │───▶│  TTS Synthesis   │───▶│  Lip Sync        │───▶│  Mix & Export    │
│  (ASR)          │    │  (EN → AS)       │    │  (Assamese)      │    │  (Wav2Lip)       │    │  (FFmpeg)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

| Stage | Provider(s) | Models | Status |
|-------|------------|--------|--------|
| 1 - Transcription | Sarvam AI, OpenAI Whisper, AI4Bharat IndicWhisper, ElevenLabs Scribe | `saaras:v3` | Live (Sarvam) + Demo fallback |
| 2 - Translation | Sarvam AI, AI4Bharat IndicTrans2, Azure Translator | `sarvam-translate:v1` | Live (Sarvam) + Demo fallback |
| 3 - TTS Synthesis | Sarvam Bulbul, AI4Bharat Parler-TTS/IndicF5, Azure (Yashica), ElevenLabs | `bulbul:v3` | Live (Bengali fallback*) + Demo |
| 4 - Lip Sync | Wav2Lip, Sync.so | — | Demo (simulated) |
| 5 - Mix & Export | Demucs + FFmpeg | — | Demo (simulated) |

> *Sarvam Bulbul v3 supports 11 Indian languages but does not yet include Assamese directly. Bengali (`bn-IN`) is used as the closest fallback.

## Tech Stack

- **Backend:** Node.js / Express with modular pipeline stages
- **Frontend:** Vanilla HTML/CSS/JS — dark theme with pipeline step visualization, collapsible result cards
- **AI APIs:** [Sarvam AI](https://www.sarvam.ai/) (STT Saaras v3, Translate v1, TTS Bulbul v3)
- **Audio Download:** yt-dlp (YouTube) + direct URL fetch + file upload
- **Proxy Support:** undici ProxyAgent for cloud/CI environments behind HTTP proxies
- **Deployment:** Netlify Functions support included, or any Node.js host
- **Testing:** Playwright E2E tests

## Quick Start

### Prerequisites

- **Node.js** 18+
- **yt-dlp** (optional, for YouTube URL support) — `pip install yt-dlp`
- **ffmpeg** (optional, for audio conversion) — `sudo apt install ffmpeg`
- **Sarvam AI API Key** — Sign up at [dashboard.sarvam.ai](https://dashboard.sarvam.ai)

### Setup

```bash
# Clone and navigate to this project
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git checkout claude/mk3-dcoa-tinkering-mdlQx
cd assamese-dubbing-demo

# Install dependencies
npm install

# Configure environment (see .env.example for all options)
cp .env.example .env
# Edit .env — at minimum set SARVAM_API_KEY

# Start the server
npm start
```

Open http://localhost:3000 in your browser.

### Usage

1. **Upload Tab** — Click the upload area or drag & drop a WAV/MP3/MP4 file
2. **Video URL Tab** — Paste a YouTube URL (audio extracted server-side via yt-dlp)
3. **Demo Sample Tab** — Use the built-in demo with pre-transcribed segments
4. Select source language (English/Hindi) and TTS voice
5. Click **"Run Dubbing Pipeline"** — watch the pipeline steps animate in real-time
6. Expand result cards to see transcription segments, Assamese translations with character expansion ratios, TTS timing analysis, lip-sync notes, and audio mixing details

## Project Structure

```
assamese-dubbing-demo/
├── server.js                    # Express server — routes, pipeline orchestration
├── package.json
├── .env.example                 # All supported environment variables
├── .gitignore
├── netlify.toml                 # Netlify Functions deployment config
├── playwright.config.js         # Playwright test configuration
├── pipeline/
│   ├── sarvam.js                # Sarvam AI API client (STT, Translate, TTS)
│   ├── transcribe.js            # Stage 1: ASR with multi-provider support
│   ├── translate.js             # Stage 2: Translation with demo + live modes
│   ├── synthesize.js            # Stage 3: TTS with voice selection
│   ├── lipsync.js               # Stage 4: Lip sync (simulated)
│   ├── mix.js                   # Stage 5: Audio mixing (simulated)
│   └── download.js              # YouTube/URL audio extraction via yt-dlp
├── public/
│   ├── index.html               # UI with pipeline visualization & DCOA context
│   ├── styles.css               # Dark theme with responsive design
│   └── app.js                   # Frontend: tabs, drag-drop, pipeline animation, result rendering
├── netlify/
│   └── functions/               # Netlify serverless function wrappers
└── tests/
    └── dubbing-pipeline.spec.js # Playwright E2E test suite
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Provider configuration — shows available APIs and their status |
| `POST` | `/api/dub` | Run dubbing pipeline. Accepts `multipart/form-data` (file) or JSON `{ sourceUrl, sourceLanguage, providers }` |
| `GET` | `/api/health` | Health check |

### Example: File Upload

```bash
curl -X POST http://localhost:3000/api/dub \
  -F "file=@speech.wav" \
  -F "sourceLanguage=en"
```

### Example: YouTube URL

```bash
curl -X POST http://localhost:3000/api/dub \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl": "https://youtu.be/RKzp4OfCgBA", "sourceLanguage": "en"}'
```

### Example: Demo Mode (no API key needed)

```bash
curl -X POST http://localhost:3000/api/dub \
  -H "Content-Type: application/json" \
  -d '{"sourceLanguage": "en"}'
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SARVAM_API_KEY` | For live mode | Sarvam AI — STT + Translation + TTS |
| `OPENAI_API_KEY` | Optional | OpenAI Whisper transcription |
| `AZURE_SPEECH_KEY` | Optional | Azure TTS (Yashica voice) |
| `AZURE_TRANSLATOR_KEY` | Optional | Azure Translator |
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs multilingual STT/TTS |
| `INDICWHISPER_ENDPOINT` | Optional | AI4Bharat IndicWhisper self-hosted |
| `INDICTRANS2_ENDPOINT` | Optional | AI4Bharat IndicTrans2 self-hosted |
| `INDIC_TTS_ENDPOINT` | Optional | AI4Bharat TTS self-hosted |
| `PORT` | Optional | Server port (default: 3000) |

Without any API keys, the app runs in **demo mode** with pre-translated Assamese samples — useful for UI development and testing.

## Testing

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run tests
npm test

# Run tests with browser visible
npm run test:headed
```

The test suite covers:
- Page load and pipeline step UI elements
- Tab switching (Upload / URL / Demo)
- File upload drag & drop interaction
- YouTube URL input validation
- Health endpoint
- Full pipeline E2E with live Sarvam APIs (when `SARVAM_API_KEY` is set)

## Current Status

### Working
- Full 5-stage modular pipeline with per-stage provider selection
- Live Sarvam AI integration: STT (Saaras v3), Translation (sarvam-translate:v1)
- TTS via Sarvam Bulbul v3 (Bengali `bn-IN` fallback for Assamese)
- File upload → live transcription → live translation → demo TTS/sync/mix
- YouTube URL audio extraction via yt-dlp (works on local machines)
- Demo mode with pre-translated Assamese segments (no API key needed)
- Dark-themed responsive UI with animated pipeline steps
- Collapsible result cards with segment-level detail
- Provider reference section and DCOA context explanation
- Netlify Functions deployment support
- Playwright E2E test suite

### Known Limitations
- **YouTube downloads blocked on cloud/CI** — `yt-dlp` gets HTTP 403 from YouTube on datacenter IPs. Works perfectly on local machines with residential IPs. For cloud hosting, use the file upload path.
- **Assamese TTS** — Sarvam Bulbul v3 doesn't support Assamese directly yet. Bengali is used as the closest available language. AI4Bharat Parler-TTS and IndicF5 support Assamese natively but require self-hosting.
- **Lip Sync & Mix** — Stages 4-5 are simulated (demo mode). Production implementation would use Wav2Lip (GPU required) and FFmpeg/Demucs.
- **Sarvam Translate mode** — Only "formal" mode is supported for Assamese (`as-IN`); "code-mixed" mode is not available.

## Connection to MK3 / DCOA

This dubbing pipeline demonstrates the multilingual orchestration that MK3's Dynamic Context Orchestration Algorithm (DCOA) targets:

- **Context Graph** — ASR + timing alignment maintains coherence across segment boundaries
- **Probabilistic Orchestration** — Dynamic provider selection per stage (Sarvam for STT, AI4Bharat for TTS, etc.)
- **Language-Agnostic Embeddings** — Translation uses semantic representations via IndicTrans2/Sarvam to preserve meaning
- **Affective Tone Control** — TTS pitch, pace, and emotion parameters map to DCOA's affective space navigation

## Available Providers for Assamese

| Provider | Type | STT | Translate | TTS | Notes |
|----------|------|-----|-----------|-----|-------|
| Sarvam AI | Commercial | Saaras v3 (as-IN) | sarvam-translate:v1 | Bulbul v3 (no as-IN*) | *Bengali fallback |
| AI4Bharat | Open-source | IndicWhisper | IndicTrans2 | Parler-TTS, IndicF5 | MIT licensed, voice cloning |
| Azure | Commercial | — | Translator | Yashica (as-IN) | SSML control |
| ElevenLabs | Commercial | Scribe (as) | — | Multilingual v2 | Voice cloning |
| OpenAI | Open-source | Whisper large-v3 | — | — | WER ~25-50% for Assamese |

## Deployment

### Local Machine (Recommended)
Full pipeline works including YouTube downloads. Best for development and demo.

### Render.com / Railway / Fly.io
```bash
# Build: npm install
# Start: npm start
# Env: SARVAM_API_KEY=your_key
```
File upload path works; YouTube blocked by IP restrictions.

### Netlify
Static frontend + serverless functions. See `netlify.toml` and `netlify/functions/`.

## License

MIT — See [LICENSE](../LICENSE)
