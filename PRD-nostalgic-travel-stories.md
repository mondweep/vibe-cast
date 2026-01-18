# Product Requirements Document (PRD)
# Nostalgic Travel Stories Video Creator

**Version**: 1.0
**Date**: January 2026
**Project Branch**: `claude/video-story-nostalgic-traveler-5MQl0`
**Status**: Draft

---

## 1. Executive Summary

A web application that generates nostalgic, emotionally resonant video stories about personal journeys and travels. The app transforms brief user inputs about a trip into evocative multimedia narratives that capture the bittersweet feelings of revisiting familiar routes, places, and memories from one's past.

### Primary Use Case
A busy professional traveling from **Jorhat to Guwahati** who, despite time constraints, feels waves of nostalgia about childhood memories, past journeys on this route, and emotional connections to these Assamese cities.

---

## 2. Problem Statement

### The Challenge
Modern professionals often travel familiar routes without time to reflect on the deep personal connections they have with these places. They want to:
- Capture and preserve nostalgic feelings about journeys
- Create shareable stories that convey emotional depth
- Document the contrast between busy present-day travel and leisurely childhood memories
- Generate video content without extensive video editing skills

### The Opportunity
Create an AI-powered tool that transforms simple trip details and nostalgic memories into compelling video stories that can be:
- Shared with family and friends
- Used for social media content
- Preserved as personal memory archives
- Extended to cover various story topics beyond travel

---

## 3. User Personas

### Primary Persona: The Nostalgic Traveler
- **Name**: Anjan (35, Software Architect)
- **Location**: Bangalore, originally from Jorhat, Assam
- **Context**: Frequently travels home to visit family
- **Pain Points**:
  - No time to document feelings during travel
  - Memories of childhood journeys fading
  - Wants to share experiences but lacks video skills
- **Goals**:
  - Capture the emotional essence of familiar journeys
  - Create content that resonates with others from the same region
  - Preserve stories for future generations

### Secondary Persona: The Content Creator
- **Name**: Priya (28, Travel Blogger)
- **Context**: Creates regional travel content
- **Goals**:
  - Generate authentic, emotionally-rich content quickly
  - Tell stories that go beyond typical travel vlogs
  - Connect viewers to cultural and personal narratives

---

## 4. Feature Requirements

### 4.1 Core Features (MVP)

#### Story Input Interface
| Feature | Description | Priority |
|---------|-------------|----------|
| Journey Details Form | Origin, destination, mode of transport, date | P0 |
| Nostalgia Prompts | Guided questions about childhood memories | P0 |
| Mood Selector | Choose emotional tone (bittersweet, joyful, reflective) | P0 |
| Time Context | Current situation (busy, reflective, rushed) | P1 |

#### AI Story Generation
| Feature | Description | Priority |
|---------|-------------|----------|
| Narrative Script | AI-generated story script with emotional arc | P0 |
| Scene Breakdown | Auto-divide story into visual scenes | P0 |
| Voice-over Text | Optimized text for narration | P0 |
| Regional Context | Include culturally relevant references | P1 |

#### Video Assembly
| Feature | Description | Priority |
|---------|-------------|----------|
| Stock Media Integration | Source relevant images/videos | P0 |
| Text Overlays | Stylized text for key moments | P0 |
| Background Music | Mood-appropriate audio tracks | P0 |
| AI Voice Narration | Text-to-speech narration | P0 |
| Export Options | MP4, WebM, social media formats | P0 |

### 4.2 Enhanced Features (Post-MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| User Media Upload | Add personal photos/videos | P2 |
| Multiple Languages | Assamese, Hindi, English narration | P2 |
| Template Library | Pre-made story templates by theme | P2 |
| Collaboration | Share drafts for family input | P3 |
| Story Series | Connect multiple journey stories | P3 |

---

## 5. Sample Story: Jorhat to Guwahati

### Story Input Example
```json
{
  "journey": {
    "origin": "Jorhat",
    "destination": "Guwahati",
    "distance": "~310 km",
    "mode": "Flight (current) / Bus (childhood memory)",
    "duration": "45 min flight / 7-8 hours bus"
  },
  "traveler": {
    "currentMood": "busy, rushed, checking emails",
    "emotionalState": "nostalgic, reflective between tasks"
  },
  "memories": {
    "childhoodTransport": "Assam State Transport bus, Network Travels",
    "landmarks": [
      "Kaziranga crossing",
      "Brahmaputra glimpses",
      "Nagaon town",
      "Tea gardens along NH37"
    ],
    "sensoryMemories": [
      "Smell of bus seats mixed with tea gardens",
      "Highway dhabas serving pitha and tea",
      "Sound of bus horn echoing through valleys"
    ],
    "emotionalMoments": [
      "Excitement of going to 'big city' Guwahati",
      "Father pointing out landmarks",
      "Counting tea gardens to pass time",
      "Arriving at Paltan Bazaar bus stand at dusk"
    ]
  }
}
```

### Generated Story Outline
```
SCENE 1: Present Day - Airport
- Visual: Busy professional at Jorhat Airport
- Narration: "The flight takes 45 minutes. Just enough time to
  answer three emails. But somewhere between takeoff and landing,
  the mind wanders..."

SCENE 2: Memory Trigger
- Visual: Looking out plane window at tea gardens below
- Narration: "Those endless green carpets below... they used to
  pass by the bus window for hours, not minutes."

SCENE 3: Childhood Journey
- Visual: Vintage bus imagery, NH37 landscapes
- Narration: "The Assam State Transport bus. Seven hours that
  felt like an adventure. Father would wake us up for Kaziranga..."

SCENE 4: Sensory Memories
- Visual: Tea gardens, dhaba scenes, Brahmaputra
- Narration: "The smell of strong Assamese tea at highway stops.
  The excitement when we first spotted the Brahmaputra..."

SCENE 5: Contrast
- Visual: Split screen - modern flight / old bus journey
- Narration: "Now the journey is efficient. Optimized.
  But something precious was lost when we gained those hours back."

SCENE 6: Arrival
- Visual: Guwahati skyline, Kamakhya hills
- Narration: "Guwahati. Still the 'big city' in the heart of
  that child who counted tea gardens to pass the time."
```

---

## 6. Technical Architecture

### 6.1 System Overview

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   Frontend       |---->|   Backend API     |---->|   AI Services    |
|   (React/Vite)   |     |   (Netlify Fn)    |     |   (Claude, etc.) |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |                  |
                         |  Media Services  |
                         |  (Video/Audio)   |
                         |                  |
                         +------------------+
```

### 6.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite | User interface |
| Styling | TailwindCSS | Responsive design |
| Backend | Netlify Functions | Serverless API |
| AI Text | Anthropic Claude API | Story generation |
| AI Voice | ElevenLabs / PlayHT | Voice narration |
| Video | Remotion / FFmpeg.wasm | Video assembly |
| Media | Pexels / Unsplash API | Stock imagery |
| Storage | Cloudinary | Media hosting |
| Deployment | Netlify | Hosting & CI/CD |

### 6.3 API Integrations

#### Required API Keys (Netlify Environment Variables)

```bash
# Story Generation
ANTHROPIC_API_KEY=sk-ant-...        # Claude API for narrative generation

# Voice Synthesis (choose one)
ELEVENLABS_API_KEY=...              # ElevenLabs for premium voices
PLAYHT_API_KEY=...                  # PlayHT alternative

# Media Sources
PEXELS_API_KEY=...                  # Stock video/images
UNSPLASH_ACCESS_KEY=...             # Stock images

# Media Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Optional: Music
EPIDEMIC_SOUND_API_KEY=...          # Licensed background music
```

#### Netlify Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  node_bundler = "esbuild"

# Environment variables set in Netlify Dashboard:
# - ANTHROPIC_API_KEY
# - ELEVENLABS_API_KEY
# - PEXELS_API_KEY
# - CLOUDINARY_* credentials
```

---

## 7. User Flow

### 7.1 Story Creation Flow

```
[Start]
    |
    v
[Enter Journey Details]
    - Origin: Jorhat
    - Destination: Guwahati
    - When: Present day
    |
    v
[Answer Nostalgia Prompts]
    - "How did you travel this route as a child?"
    - "What do you remember seeing?"
    - "Any special memories with family?"
    |
    v
[Select Mood & Style]
    - Emotional tone: Bittersweet
    - Visual style: Warm, vintage tones
    - Music mood: Reflective
    |
    v
[AI Generates Story Script]
    - Review generated narrative
    - Edit/customize if needed
    |
    v
[Preview Scenes]
    - See AI-selected visuals
    - Hear voice narration preview
    - Adjust timing/music
    |
    v
[Generate Final Video]
    - Processing (2-5 minutes)
    - Progress indicator
    |
    v
[Export & Share]
    - Download MP4
    - Share to social media
    - Save to library
```

### 7.2 API Flow for Story Generation

```javascript
// netlify/functions/generate-story.js

export async function handler(event) {
  const { journey, memories, mood } = JSON.parse(event.body);

  // 1. Generate narrative with Claude
  const narrative = await generateNarrative(journey, memories, mood);

  // 2. Break into scenes
  const scenes = await breakIntoScenes(narrative);

  // 3. Find relevant media for each scene
  const mediaScenes = await Promise.all(
    scenes.map(scene => findMediaForScene(scene))
  );

  // 4. Generate voice narration
  const audioUrls = await Promise.all(
    scenes.map(scene => generateVoice(scene.narration))
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      narrative,
      scenes: mediaScenes,
      audio: audioUrls
    })
  };
}
```

---

## 8. Story Topics Extension

The platform is designed to support various nostalgic story topics beyond travel:

### Supported Story Templates

| Template | Description | Key Prompts |
|----------|-------------|-------------|
| **Journey Stories** | Travel between places | Route, childhood transport, landmarks |
| **Hometown Returns** | Visiting birthplace | Changes noticed, unchanged places, old friends |
| **Festival Memories** | Cultural celebrations | Childhood rituals, family traditions, food |
| **School Days** | Educational journey | Teachers, friends, defining moments |
| **Family Gatherings** | Reunion stories | Relatives, family home, traditions |
| **Food & Markets** | Culinary nostalgia | Childhood favorites, market visits, recipes |
| **Seasonal Changes** | Weather/nature memories | Monsoon, winter, harvest time memories |

### Template Configuration

```javascript
// templates/journey-story.js
export const journeyTemplate = {
  id: 'journey-nostalgia',
  name: 'Journey Between Cities',
  prompts: [
    {
      id: 'childhood-transport',
      question: 'How did you travel this route as a child?',
      type: 'text',
      examples: ['Bus', 'Train', 'Family car', 'On foot']
    },
    {
      id: 'landmarks',
      question: 'What landmarks do you remember passing?',
      type: 'list',
      hint: 'Rivers, temples, markets, hills...'
    },
    {
      id: 'sensory',
      question: 'What smells, sounds, or feelings come back?',
      type: 'text',
      hint: 'Bus seats, tea stalls, engine sounds...'
    },
    {
      id: 'companion',
      question: 'Who traveled with you? Any special moments?',
      type: 'text'
    }
  ],
  moods: ['bittersweet', 'joyful', 'reflective', 'melancholic'],
  defaultMusic: 'acoustic-reflective'
};
```

---

## 9. Data Models

### Story Model

```typescript
interface Story {
  id: string;
  userId: string;
  template: StoryTemplate;

  // Input data
  journey: {
    origin: string;
    destination: string;
    currentMode: string;
    childhoodMode: string;
  };

  memories: {
    landmarks: string[];
    sensoryDetails: string[];
    emotionalMoments: string[];
    companions: string[];
  };

  // Generated content
  narrative: {
    fullScript: string;
    scenes: Scene[];
  };

  // Output
  video: {
    url: string;
    duration: number;
    format: 'mp4' | 'webm';
    resolution: '720p' | '1080p';
  };

  // Metadata
  createdAt: Date;
  status: 'draft' | 'generating' | 'complete' | 'failed';
}

interface Scene {
  id: string;
  order: number;
  narration: string;
  duration: number;
  media: {
    type: 'image' | 'video';
    url: string;
    source: 'pexels' | 'unsplash' | 'user';
  };
  textOverlay?: string;
  musicSegment: string;
}
```

---

## 10. UI/UX Guidelines

### Design Principles

1. **Warmth**: Interface should feel warm and inviting, not clinical
2. **Simplicity**: Complex video creation hidden behind simple inputs
3. **Emotional**: Design should evoke nostalgia through colors and imagery
4. **Progressive**: Reveal complexity gradually as users engage

### Color Palette

```css
:root {
  /* Warm, nostalgic tones */
  --color-sepia: #704214;
  --color-warm-cream: #F5E6D3;
  --color-sunset-orange: #E07A5F;
  --color-deep-brown: #3D2914;
  --color-misty-green: #81B29A;

  /* Accent for Assam context */
  --color-tea-green: #5A7D4C;
  --color-brahmaputra-blue: #457B9D;
}
```

### Key Screens

1. **Home**: Template selection with visual previews
2. **Journey Input**: Multi-step form with progress indicator
3. **Memory Prompts**: Conversational UI with guided questions
4. **Preview**: Scene-by-scene preview with editing
5. **Export**: Processing view with share options

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Story Completion Rate | >60% | Users who finish creating a story |
| Generation Success | >95% | Videos successfully generated |
| Time to First Video | <10 min | From start to first export |
| User Return Rate | >40% | Users who create 2+ stories |
| Share Rate | >25% | Stories shared to social media |
| NPS Score | >50 | Net Promoter Score |

---

## 12. Development Phases

### Phase 1: Foundation (MVP)
- [ ] Project setup (React + Vite + TailwindCSS)
- [ ] Netlify Functions configuration
- [ ] Claude API integration for story generation
- [ ] Basic journey input form
- [ ] Story script generation and display
- [ ] Simple scene breakdown visualization

### Phase 2: Media Integration
- [ ] Pexels/Unsplash API integration
- [ ] Automatic scene-to-media matching
- [ ] ElevenLabs voice synthesis integration
- [ ] Basic video assembly with Remotion

### Phase 3: Polish & Export
- [ ] Full video generation pipeline
- [ ] Export to MP4/WebM
- [ ] Social media sharing
- [ ] User story library

### Phase 4: Enhancement
- [ ] Multiple story templates
- [ ] User media uploads
- [ ] Multiple language support
- [ ] Collaborative editing

---

## 13. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API costs exceed budget | High | Medium | Implement usage limits, caching |
| Media matching poor quality | Medium | Medium | Human curation fallback, user uploads |
| Video generation slow | Medium | High | Background processing, progress feedback |
| Regional content gaps | Medium | Medium | Build regional media library over time |
| Voice quality issues | Medium | Low | Multiple TTS options, user voice upload |

---

## 14. Environment Setup

### Local Development

```bash
# Clone and setup
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git checkout claude/video-story-nostalgic-traveler-5MQl0

# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local

# Add your API keys to .env.local
# ANTHROPIC_API_KEY=sk-ant-...
# ELEVENLABS_API_KEY=...
# PEXELS_API_KEY=...

# Run development server
npm run dev

# Run with Netlify Functions locally
netlify dev
```

### Netlify Deployment

1. Connect repository to Netlify
2. Set build branch: `claude/video-story-nostalgic-traveler-5MQl0`
3. Add environment variables in Netlify Dashboard:
   - `ANTHROPIC_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `PEXELS_API_KEY`
   - `CLOUDINARY_*` credentials
4. Deploy

---

## 15. Appendix

### A. Sample Claude Prompt for Story Generation

```
You are a nostalgic storyteller creating emotionally resonant narratives
about personal journeys. Given the following details about a trip and
associated memories, create a 6-scene video story script.

Journey: ${journey.origin} to ${journey.destination}
Current travel mode: ${journey.currentMode}
Childhood travel mode: ${journey.childhoodMode}
Landmarks remembered: ${memories.landmarks.join(', ')}
Sensory memories: ${memories.sensoryDetails.join(', ')}
Emotional moments: ${memories.emotionalMoments.join(', ')}
Mood: ${mood}

Requirements:
1. Create exactly 6 scenes with clear visual descriptions
2. Each scene should have narration text (30-45 seconds when read)
3. Balance present-day reality with childhood memories
4. Include sensory details that evoke nostalgia
5. End with a reflective, emotionally satisfying conclusion
6. Use second person ("you") for intimate connection

Output as JSON with this structure:
{
  "title": "...",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "...",
      "visualDescription": "...",
      "narration": "...",
      "mood": "...",
      "suggestedMedia": ["keyword1", "keyword2"]
    }
  ]
}
```

### B. Recommended Voice Settings (ElevenLabs)

```javascript
const voiceSettings = {
  voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - warm, reflective
  modelId: 'eleven_multilingual_v2',
  voiceSettings: {
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.5,
    useSpeakerBoost: true
  }
};
```

### C. Media Search Keywords by Scene Type

| Scene Type | Search Keywords |
|------------|-----------------|
| Airport/Modern Travel | "airport terminal", "businessman phone", "modern travel" |
| Bus Journey | "vintage bus india", "highway bus", "long distance travel" |
| Tea Gardens | "assam tea garden", "tea plantation", "green hills india" |
| River/Brahmaputra | "brahmaputra river", "indian river", "river sunset" |
| City Arrival | "indian city dusk", "bus station", "city lights india" |
| Nostalgic Family | "indian family travel", "father child", "vintage india" |

---

**Document maintained by**: Development Team
**Last updated**: January 2026
**Next review**: After Phase 1 completion
