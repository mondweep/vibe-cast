# eLearning Automation Tool

Transform PowerPoint presentations and Word documents with speaker notes into engaging, interactive, SCORM-compliant eLearning modules for healthcare professionals.

## 🎯 Features

- **Document Parsing**: Supports PowerPoint (.pptx) and Word (.docx) files
- **Speaker Notes Extraction**: Automatically extracts and utilizes speaker notes/comments
- **AI-Powered Enhancement**: Uses Claude AI to:
  - Generate learning objectives
  - Extract key concepts and medical terminology
  - Create assessment questions
  - Suggest interactive activities
- **Interactive Content**: Generates engaging activities including:
  - Multiple choice questions
  - Drag-and-drop exercises
  - Flashcards
  - Scenario-based learning
- **SCORM Compliance**: Creates SCORM 1.2 and 2004 packages
- **LMS Ready**: Packages can be directly uploaded to any SCORM-compliant LMS

## 📋 Requirements

- Node.js 18+
- TypeScript 5+
- Anthropic API key (for Claude AI)

## 🚀 Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the template:

```bash
cp .env.example .env
```

4. Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=your-api-key-here
```

5. Build the project:

```bash
npm run build
```

## 📖 Usage

### Basic Usage

```bash
npm start <input-file> [api-key]
```

### Examples

```bash
# Using environment variable for API key
npm start examples/sample.pptx

# Passing API key as argument
npm start examples/sample.docx sk-ant-...

# Using TypeScript directly (development)
npm run dev examples/sample.pptx
```

### Programmatic Usage

```typescript
import { WorkflowOrchestrator, WorkflowConfig } from 'nlp-and-video-rendering';

const config: WorkflowConfig = {
  input: {
    filePath: 'path/to/presentation.pptx'
  },
  nlp: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514'
  },
  scorm: {
    version: '1.2',
    masteryScore: 80,
    enableBookmarking: true,
    enableTracking: true
  },
  output: {
    path: 'output/scorm-package.zip',
    packageName: 'my-course'
  }
};

const orchestrator = new WorkflowOrchestrator(config);
const outputPath = await orchestrator.execute();
```

## 🏗️ Architecture

The tool follows the SPARC methodology (Specifications, Pseudocode, Architecture, Refinement, Completion):

```
Input Document (.pptx/.docx)
         │
         ▼
   ┌─────────────┐
   │   Parser    │──────► Parsed Content
   └─────────────┘
         │
         ▼
  ┌───────────────┐
  │ NLP Processor │──────► Enriched Content
  └───────────────┘
         │
         ▼
┌─────────────────────┐
│  Interactive Gen    │──────► Interactive Modules
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  SCORM Packager     │──────► SCORM Package
└─────────────────────┘
```

### Key Components

1. **Document Parsers** (`src/parsers/`)
   - PowerPoint parser with slide and notes extraction
   - Word document parser with section and comment extraction

2. **NLP Processing** (`src/nlp/`)
   - Content analysis and summarization
   - Learning objective generation
   - Question generation
   - Medical terminology extraction

3. **Interactive Content** (`src/interactive/`)
   - Activity factory for creating interactive components
   - Support for multiple activity types

4. **SCORM Packaging** (`src/scorm/`)
   - SCORM 1.2 and 2004 support
   - Manifest generation
   - Player creation
   - API wrapper implementation

5. **Workflow Orchestration** (`src/workflows/`)
   - Main orchestration logic
   - Pipeline management
   - Error handling

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [SPARC Specifications](docs/SPARC-SPECIFICATIONS.md) - Complete project specifications
- [SPARC Pseudocode](docs/SPARC-PSEUDOCODE.md) - Algorithmic logic for all components
- [SPARC Architecture](docs/SPARC-ARCHITECTURE.md) - System architecture and design

## 🎓 Healthcare Focus

This tool is specifically designed for healthcare education with:

- Medical terminology extraction and glossary generation
- Evidence-based learning objective creation
- Scenario-based clinical assessments
- Adult learning principles (andragogy)
- Accessibility compliance (WCAG 2.1 AA)

## 🔧 Configuration

### SCORM Configuration

```typescript
scorm: {
  version: '1.2' | '2004',     // SCORM version
  masteryScore: 80,             // Passing score percentage
  enableBookmarking: true,      // Resume where left off
  enableTracking: true          // Track progress and scores
}
```

### NLP Configuration

```typescript
nlp: {
  apiKey: 'your-api-key',       // Anthropic API key
  model: 'claude-sonnet-4-20250514', // Claude model
  temperature: 0.7,             // Response creativity (0-1)
  maxTokens: 4000               // Max response length
}
```

## 📦 Output

The tool generates a ZIP file containing:

```
scorm-package.zip
├── imsmanifest.xml         # SCORM manifest
├── content/
│   └── module-*.html       # Course modules
├── js/
│   ├── scorm-api.js        # SCORM API wrapper
│   └── player.js           # Course player
└── css/
    └── styles.css          # Styling
```

## 🧪 Testing

Upload the generated SCORM package to:
- SCORM Cloud (scorm.com/cloud)
- Your organization's LMS
- Any SCORM-compliant platform

## 🛠️ Development

### Build

```bash
npm run build
```

### Clean

```bash
npm run clean
```

### Development Mode

```bash
npm run dev <input-file>
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please see the contributing guidelines.

## 🔗 Technologies Used

- **TypeScript** - Type-safe development
- **Claude AI** - Natural language processing
- **claude-flow** - AI orchestration
- **agentdb** - Data persistence
- **research-swarm** - Multi-agent research
- **agentic-flow** - Workflow automation
- **mammoth** - Word document parsing
- **pptxgenjs** - PowerPoint parsing
- **archiver** - ZIP file creation

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in `docs/`
- Review the examples in `examples/`

## 🎉 Acknowledgments

Built with the SPARC methodology for enterprise-grade AI automation.
