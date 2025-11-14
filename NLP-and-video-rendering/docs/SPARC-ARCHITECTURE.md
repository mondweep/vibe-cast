# SPARC Methodology: System Architecture

## A - ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Interface Layer                        │
│                         (CLI / Configuration)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                      Orchestration Layer                             │
│                  (Agentic-Flow Workflow Engine)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Claude-Flow │  │  Research    │  │  AgentDB     │              │
│  │   (AI Core)  │  │    Swarm     │  │  (Storage)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────┬──────────────┬──────────────┬──────────────┬──────────────┘
         │              │              │              │
┌────────▼──────────────▼──────────────▼──────────────▼──────────────┐
│                     Processing Pipeline Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Document   │  │     NLP      │  │  Interactive │              │
│  │   Parsers    │  │  Processing  │  │   Content    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │    Video     │  │    SCORM     │  │   Quality    │              │
│  │  Rendering   │  │  Packaging   │  │  Assurance   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────┬──────────────┬──────────────┬──────────────┬──────────────┘
         │              │              │              │
┌────────▼──────────────▼──────────────▼──────────────▼──────────────┐
│                      Infrastructure Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  File System │  │   FFmpeg     │  │  TTS Engine  │              │
│  │   Storage    │  │  (Video)     │  │   (Audio)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Orchestration Layer

**Agentic-Flow Workflow Engine**
- Purpose: Coordinate all processing stages
- Responsibilities:
  - Manage workflow execution
  - Handle agent communication
  - Track progress and state
  - Error handling and recovery
  - Parallel task execution

**Claude-Flow Integration**
- Purpose: AI-powered content enhancement
- Responsibilities:
  - Content analysis
  - Question generation
  - Learning objective extraction
  - Content improvement suggestions

**Research-Swarm**
- Purpose: Multi-agent content research
- Responsibilities:
  - Medical terminology validation
  - Evidence-based content verification
  - Best practice recommendations
  - Content gap analysis

**AgentDB**
- Purpose: Data persistence and caching
- Responsibilities:
  - Store processing results
  - Cache API responses
  - Track processing history
  - Manage templates and configurations

#### 2. Document Parser Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Parser Layer                     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            IDocumentParser (Interface)                │  │
│  │  - parse(filePath): Promise<ParsedContent>           │  │
│  │  - validate(filePath): Promise<boolean>              │  │
│  │  - getSupportedFormats(): string[]                   │  │
│  └───────────────┬──────────────┬────────────────────────┘  │
│                  │              │                            │
│      ┌───────────▼──────┐   ┌──▼────────────────┐          │
│      │ PowerPointParser │   │ WordDocumentParser │          │
│      │                  │   │                    │          │
│      │ - extractSlides()│   │ - extractSections()│          │
│      │ - extractNotes() │   │ - extractComments()│          │
│      │ - extractMedia() │   │ - extractMedia()   │          │
│      └──────────────────┘   └────────────────────┘          │
│                                                              │
│  Shared Components:                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐       │
│  │MediaExtractor│ │TextFormatter │  │MetadataUtil │       │
│  └─────────────┘  └──────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**PowerPointParser**
- Library: `pptxgenjs`, `officegen`, or `node-pptx`
- Input: .pptx file
- Output: Structured slide data with notes
- Features:
  - Slide extraction with layout preservation
  - Speaker notes extraction
  - Image/video extraction
  - Chart and table conversion

**WordDocumentParser**
- Library: `mammoth.js`, `docx`
- Input: .docx file
- Output: Structured document sections
- Features:
  - Section detection via headings
  - Comment extraction as speaker notes
  - Table and image extraction
  - Formatting preservation

#### 3. NLP Processing Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    NLP Processing Layer                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NLP Orchestrator                        │   │
│  └────────┬──────────────┬──────────────┬──────────────┘   │
│           │              │              │                   │
│  ┌────────▼────────┐ ┌──▼──────────┐ ┌─▼───────────────┐  │
│  │ Content Analyzer│ │  Question   │ │   Terminology   │  │
│  │                 │ │  Generator  │ │    Extractor    │  │
│  │ - Key concepts  │ │ - MCQ       │ │ - Medical terms │  │
│  │ - Objectives    │ │ - T/F       │ │ - Glossary      │  │
│  │ - Summary       │ │ - Scenarios │ │ - Definitions   │  │
│  └─────────────────┘ └─────────────┘ └─────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          AI Integration (Claude-Flow)               │    │
│  │  - Content enhancement                              │    │
│  │  - Learning objective generation                    │    │
│  │  - Question generation                              │    │
│  │  - Feedback formulation                             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**NLP Components:**
- **Content Analyzer**: Extracts key concepts, generates summaries
- **Question Generator**: Creates assessment items using AI
- **Terminology Extractor**: Identifies medical terms, builds glossary
- **Readability Analyzer**: Assesses content complexity
- **Learning Objective Generator**: Creates SMART objectives

#### 4. Interactive Content Layer

```
┌─────────────────────────────────────────────────────────────┐
│               Interactive Content Generator                  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Activity Factory (Factory Pattern)           │  │
│  └────┬────────┬────────┬────────┬────────┬─────────────┘  │
│       │        │        │        │        │                 │
│  ┌────▼────┐ ┌▼─────┐ ┌▼─────┐ ┌▼─────┐ ┌▼──────────┐    │
│  │   MCQ   │ │ Drag │ │Hotspot│ │Scenario│ │Flashcard │    │
│  │ Builder │ │ Drop │ │Builder│ │Builder │ │ Builder  │    │
│  └─────────┘ └──────┘ └───────┘ └────────┘ └──────────┘    │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            HTML/JS Component Generator                │  │
│  │  - Generates interactive HTML5 components             │  │
│  │  - SCORM API integration                              │  │
│  │  - Progress tracking                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Interactive Types:**
1. **Multiple Choice Questions**: Standard assessment
2. **Drag & Drop**: Matching, sequencing, categorization
3. **Hotspot**: Image-based interactions
4. **Scenarios**: Branching simulations
5. **Flashcards**: Knowledge reinforcement
6. **Knowledge Checks**: Embedded assessments

#### 5. Video Rendering Layer

```
┌─────────────────────────────────────────────────────────────┐
│                   Video Rendering Engine                     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Video Orchestrator                       │  │
│  └────────┬──────────────┬──────────────┬────────────────┘  │
│           │              │              │                   │
│  ┌────────▼────────┐ ┌──▼──────────┐ ┌─▼───────────────┐  │
│  │ Slide Renderer  │ │TTS Generator│ │  Video Composer │  │
│  │                 │ │             │ │                 │  │
│  │ - Canvas/Sharp  │ │ - ElevenLabs│ │ - FFmpeg        │  │
│  │ - Image export  │ │ - Google TTS│ │ - Transitions   │  │
│  │ - Overlays      │ │ - Azure TTS │ │ - Captions      │  │
│  └─────────────────┘ └─────────────┘ └─────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FFmpeg Pipeline                          │  │
│  │  Input → Encode → Effects → Captions → Output        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Video Pipeline:**
1. **Slide Rendering**: Convert slides to images (1080p)
2. **TTS Generation**: Convert speaker notes to audio
3. **Timing Calculation**: Sync audio with slides
4. **Video Composition**: Combine images + audio with FFmpeg
5. **Enhancement**: Add transitions, overlays, branding
6. **Caption Generation**: Create WebVTT captions
7. **Export**: MP4 (H.264) and WebM formats

#### 6. SCORM Packaging Layer

```
┌─────────────────────────────────────────────────────────────┐
│                   SCORM Package Generator                    │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            SCORM Package Builder                      │  │
│  └────────┬──────────────┬──────────────┬────────────────┘  │
│           │              │              │                   │
│  ┌────────▼────────┐ ┌──▼──────────┐ ┌─▼───────────────┐  │
│  │   Manifest      │ │   Player    │ │  SCORM API      │  │
│  │   Generator     │ │  Generator  │ │   Wrapper       │  │
│  │                 │ │             │ │                 │  │
│  │ - imsmanifest   │ │ - HTML5     │ │ - SCORM 1.2     │  │
│  │ - Metadata      │ │ - Responsive│ │ - SCORM 2004    │  │
│  │ - Sequencing    │ │ - Accessible│ │ - Tracking      │  │
│  └─────────────────┘ └─────────────┘ └─────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Asset Manager                            │  │
│  │  - Organizes all media files                         │  │
│  │  - Optimizes file sizes                              │  │
│  │  - Creates ZIP package                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**SCORM Components:**
- **Manifest Generator**: Creates valid imsmanifest.xml
- **Player Generator**: HTML5 responsive player
- **SCORM API Wrapper**: LMS communication layer
- **Asset Manager**: File organization and optimization
- **Package Zipper**: Final ZIP creation

### Data Flow Architecture

```
Input Document (.pptx/.docx)
         │
         ▼
   ┌─────────────┐
   │   Parser    │──────► Parsed Content (JSON)
   └─────────────┘              │
                                ▼
                        ┌───────────────┐
                        │ NLP Processor │──► Enriched Content
                        └───────────────┘         │
                                                  ▼
                    ┌─────────────────────────────────────┐
                    │                                     │
            ┌───────▼────────┐                ┌──────────▼────────┐
            │  Interactive    │                │  Video Renderer   │
            │   Generator     │                └──────────┬────────┘
            └───────┬────────┘                           │
                    │                                    │
                    └──────────┬─────────────────────────┘
                               ▼
                      ┌─────────────────┐
                      │ SCORM Packager  │
                      └────────┬─────────┘
                               ▼
                        SCORM Package (.zip)
```

### Technology Stack

#### Core Technologies
```javascript
{
  "runtime": "Node.js v18+",
  "language": "TypeScript 5.0+",
  "packageManager": "npm",
  "buildTool": "esbuild / webpack"
}
```

#### Key Dependencies
```javascript
{
  "orchestration": [
    "claude-flow@alpha",      // AI orchestration
    "agentdb",                // Data persistence
    "research-swarm",         // Multi-agent research
    "agentic-flow"            // Workflow automation
  ],
  "parsing": [
    "mammoth",                // Word documents
    "pptxgenjs",              // PowerPoint
    "jszip",                  // ZIP handling
    "xml2js"                  // XML parsing
  ],
  "nlp": [
    "@anthropic-ai/sdk",      // Claude AI
    "natural",                // NLP utilities
    "compromise",             // Text analysis
    "sentiment"               // Sentiment analysis
  ],
  "video": [
    "fluent-ffmpeg",          // Video processing
    "canvas",                 // Image rendering
    "sharp",                  // Image processing
    "node-webvtt"             // Caption generation
  ],
  "tts": [
    "@google-cloud/text-to-speech",  // Google TTS
    "elevenlabs"              // ElevenLabs TTS
  ],
  "scorm": [
    "scorm-again",            // SCORM utilities
    "archiver",               // ZIP creation
    "handlebars"              // Template rendering
  ],
  "utilities": [
    "lodash",                 // Utilities
    "winston",                // Logging
    "joi",                    // Validation
    "dotenv"                  // Configuration
  ]
}
```

### File Structure

```
NLP-and-video-rendering/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── cli.ts                      # CLI interface
│   │
│   ├── parsers/
│   │   ├── index.ts
│   │   ├── IDocumentParser.ts      # Parser interface
│   │   ├── PowerPointParser.ts
│   │   ├── WordDocumentParser.ts
│   │   └── MediaExtractor.ts
│   │
│   ├── nlp/
│   │   ├── index.ts
│   │   ├── NLPOrchestrator.ts
│   │   ├── ContentAnalyzer.ts
│   │   ├── QuestionGenerator.ts
│   │   ├── TerminologyExtractor.ts
│   │   └── LearningObjectiveGenerator.ts
│   │
│   ├── interactive/
│   │   ├── index.ts
│   │   ├── ActivityFactory.ts
│   │   ├── MCQBuilder.ts
│   │   ├── DragDropBuilder.ts
│   │   ├── HotspotBuilder.ts
│   │   ├── ScenarioBuilder.ts
│   │   └── ComponentGenerator.ts
│   │
│   ├── video/
│   │   ├── index.ts
│   │   ├── VideoOrchestrator.ts
│   │   ├── SlideRenderer.ts
│   │   ├── TTSGenerator.ts
│   │   ├── VideoComposer.ts
│   │   └── CaptionGenerator.ts
│   │
│   ├── scorm/
│   │   ├── index.ts
│   │   ├── SCORMPackageBuilder.ts
│   │   ├── ManifestGenerator.ts
│   │   ├── PlayerGenerator.ts
│   │   ├── SCORMAPIWrapper.ts
│   │   └── AssetManager.ts
│   │
│   ├── workflows/
│   │   ├── index.ts
│   │   ├── WorkflowOrchestrator.ts
│   │   ├── agents/
│   │   │   ├── DocumentParserAgent.ts
│   │   │   ├── NLPProcessingAgent.ts
│   │   │   ├── InteractiveContentAgent.ts
│   │   │   ├── VideoRenderingAgent.ts
│   │   │   └── SCORMPackagerAgent.ts
│   │   └── pipelines/
│   │       └── MainPipeline.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   ├── validator.ts
│   │   ├── fileUtils.ts
│   │   └── errorHandler.ts
│   │
│   └── types/
│       ├── ParsedContent.ts
│       ├── EnrichedContent.ts
│       ├── InteractiveContent.ts
│       ├── VideoContent.ts
│       └── SCORMPackage.ts
│
├── templates/
│   ├── player/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── player.js
│   ├── scorm/
│   │   ├── manifest.xml.hbs
│   │   └── scorm-api.js
│   └── components/
│       ├── mcq.html.hbs
│       ├── dragdrop.html.hbs
│       └── scenario.html.hbs
│
├── examples/
│   ├── sample.pptx
│   ├── sample.docx
│   └── config.example.json
│
├── output/
│   └── .gitkeep
│
├── docs/
│   ├── SPARC-SPECIFICATIONS.md
│   ├── SPARC-PSEUDOCODE.md
│   ├── SPARC-ARCHITECTURE.md
│   └── USER-GUIDE.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Configuration Architecture

```typescript
interface Config {
  input: {
    filePath: string;
    type?: 'pptx' | 'docx' | 'auto';
  };

  nlp: {
    provider: 'claude' | 'openai';
    apiKey: string;
    model: string;
    temperature: number;
  };

  video: {
    enabled: boolean;
    resolution: '720p' | '1080p' | '4k';
    fps: number;
    codec: 'h264' | 'h265';
    transitions: boolean;
    tts: {
      provider: 'google' | 'elevenlabs' | 'azure';
      voice: string;
      speed: number;
    };
  };

  interactive: {
    questionsPerSection: number;
    activityTypes: string[];
    difficultyLevel: 'easy' | 'medium' | 'hard';
  };

  scorm: {
    version: '1.2' | '2004';
    masteryScore: number;
    enableBookmarking: boolean;
    enableTracking: boolean;
  };

  output: {
    path: string;
    packageName: string;
    theme: string;
  };

  quality: {
    accessibility: boolean;
    wcagLevel: 'A' | 'AA' | 'AAA';
    mobileOptimized: boolean;
  };
}
```

### Deployment Architecture

```
Development Environment
         │
         ▼
    Build Process (esbuild)
         │
         ▼
    ┌────────────────┐
    │  Executable     │
    │  CLI Tool       │
    └────────────────┘
         │
         ├─► Local Installation (npm install -g)
         ├─► Docker Container
         └─► Cloud Function (optional)
```

### Security Architecture

1. **Input Validation**: Sanitize all file inputs
2. **API Key Management**: Secure storage in environment variables
3. **File System Isolation**: Sandboxed processing directories
4. **Content Sanitization**: XSS prevention in generated HTML
5. **Dependency Scanning**: Regular security audits
6. **Error Handling**: No sensitive data in error messages

### Scalability Considerations

1. **Parallel Processing**: Multiple documents simultaneously
2. **Chunked Processing**: Large files processed in chunks
3. **Caching**: AgentDB for intermediate results
4. **Queue System**: For batch processing
5. **Resource Management**: Memory limits and cleanup

This architecture provides a robust, scalable foundation for the eLearning automation tool.
