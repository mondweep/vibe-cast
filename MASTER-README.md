# 🎯 Vibe Cast - Repository Overview

Welcome to the **Vibe Cast** repository! This is a multi-project repository containing various AI, trading, multimedia, and real-time communication experiments. Each branch represents a distinct project or research area.

This document serves as a **navigation guide** to help you quickly understand what's available in each branch and find what you're looking for.

---

## 📚 Table of Contents

- [Branch Overview](#-branch-overview)
- [Quick Start Guide](#-quick-start-guide)
- [Projects by Category](#-projects-by-category)
- [How to Navigate](#-how-to-navigate)

---

## 🌳 Branch Overview

### 🎙️ Real-Time Communication

#### **`claude/pubnub-tinkering-01Udh52LMtTJqdrt5G5JLmF6`** & **`claude/pubnub-demo-app-01Udh52LMtTJqdrt5G5JLmF6`**
**VibeCast - Real-time Chat Application**

A production-ready real-time chat application powered by PubNub demonstrating:
- Real-time pub/sub messaging
- User presence tracking
- Message history
- Typing indicators
- Multi-channel support
- Beautiful, responsive UI

**Tech Stack**: HTML, CSS, JavaScript, PubNub SDK
**Deployment**: Netlify-ready with `netlify.toml`
**Demo Keys**: Uses PubNub demo keys for instant testing
**🌐 Live Demo**: https://pubnub-tinkering.netlify.app/

**Get Started**:
```bash
git checkout claude/pubnub-tinkering-01Udh52LMtTJqdrt5G5JLmF6
# Open index.html in browser or deploy to Netlify
```

**Perfect For**: Real-time communication demos, PubNub integration examples, team chat prototypes

---

### 📊 Financial & Trading Systems

#### **`claude/neural-trading-setup-01QRibo48q536HdRYfZppwYG`**
**Neural Trading System - Enhanced Edition**

An institutional-grade algorithmic trading system with production-ready features:
- Multi-strategy support (momentum, mean reversion, neural forecast)
- Risk management (VaR/CVaR monitoring, auto stop-loss)
- Enterprise monitoring (Prometheus metrics, health checks)
- 10-50x performance improvements
- 99.95%+ uptime with circuit breakers
- Error recovery with exponential backoff

**Tech Stack**: Node.js, Alpaca API, @neural-trader packages
**Location**: `neural-trader-work/` folder

**Get Started**:
```bash
git checkout origin/claude/neural-trading-setup-01QRibo48q536HdRYfZppwYG
cd neural-trader-work
npm install
# Configure .env with Alpaca API keys
npm start
```

**Perfect For**: Algorithmic trading, risk management, production trading systems

---

#### **`exploring-antigravity-from-google`**
**Agentic Accounting System**

Natural language financial transaction processing with advanced accounting:
- NLP transaction parsing ("Bought 1.5 BTC at 45000")
- Multi-method accounting (FIFO, LIFO, HIFO)
- High-precision decimal math
- Tax lot tracking and cost basis calculation

**Tech Stack**: TypeScript, decimal.js, Node.js
**Location**: `agentic-accounting/` folder

**Get Started**:
```bash
git checkout exploring-antigravity-from-google
npm install
npx tsx agentic-accounting/demo.ts
```

**Perfect For**: Accounting automation, crypto tax calculation, financial record keeping

---

#### **`exploring-ruvector`**
**Agentic Accounting + Semantic Search**

Extension of the accounting system with semantic transaction search capabilities:
- All features from `exploring-antigravity-from-google`
- Semantic vector-based transaction search
- Research folder with semantic search implementation

**Tech Stack**: TypeScript, Vector embeddings, Node.js
**Location**: `agentic-accounting/` + `research/` folder

**Get Started**:
```bash
git checkout exploring-ruvector
npm install
# Explore research/semantic-transaction-search.mjs
```

**Perfect For**: Advanced financial search, semantic analysis of transactions

---

### 🧠 Collaboration & Knowledge

#### **`tribe-knowledgeGraph`**
**Tribe Mind - Collaborative Knowledge Graph**

A real-time, 3D collaborative environment for visualizing collective intelligence:
- **3D Visualization**: Interactive force-directed graph representing concepts and connections
- **Real-time Collaboration**: Live updates across all connected users (Socket.io)
- **Collective Intelligence**: Visualizing how team ideas connect and grow
- **Premium Experience**: Futuristic dark UI with glassmorphism and neon accents

**Tech Stack**: React, Vite, Three.js, react-force-graph-3d, Node.js, Socket.io
**Location**: `tribe-knowledge-graph/` folder
**Live Demo**: http://localhost:5173 (when running)

**Get Started**:
```bash
git checkout tribe-knowledgeGraph
cd tribe-knowledge-graph
npm install
npm start
# Visit http://localhost:5173
```

**Key Features**:
- 🌐 **Shared 3D Space**: Everyone sees the same graph state
- ⚡ **Instant Updates**: Add nodes and links in real-time
- 🎨 **Immersive UI**: Deep space theme for focused ideation
- 🖱️ **Interactive**: Rotate, zoom, pan, and click to connect ideas

**Perfect For**: Brainstorming sessions, team knowledge mapping, demonstrating collective intelligence, visual note-taking

---

### 🤖 AI & Machine Learning

#### **`claude/ai-architecture-analysis-01TJ3tNZF6g4Wpu3Ux8NpUCe`**
**Understanding AI Architecture - Interactive Learning**

A gamified web application teaching how AI coding assistants work through interactive visualizations:
- **Vector Space Explorer**: 3D word embeddings visualization
- **RAG Retrieval Simulator**: Understand retrieval-augmented generation
- **Attention Mechanism Visualizer**: See transformer attention in action
- **Tool Orchestration Challenge**: Optimize tool selection
- **Context Window Manager**: Manage token budgets

**Tech Stack**: React, TypeScript, Three.js, D3.js, Vite, TailwindCSS
**Deployment**: Netlify-ready

**Get Started**:
```bash
git checkout origin/claude/ai-architecture-analysis-01TJ3tNZF6g4Wpu3Ux8NpUCe
npm install
npm run dev
# Visit http://localhost:5173
```

**Perfect For**: Learning AI architecture, teaching ML concepts, interactive demos

---

#### **`aidms-tinkering`**
**AIDMS - AI Manipulation Defense System Demo**

An interactive demonstration of production-ready adversarial defense for AI applications:
- **Multi-layered Security**: Detection, analysis, and response layers
- **Threat Detection**: Prompt injection, jailbreak attempts, data exfiltration
- **Real-time Monitoring**: Live metrics dashboard and threat logging
- **Pattern Recognition**: Fast path and deep path analysis
- **Interactive Testing**: Quick-test buttons for common attack patterns
- **Premium UI**: Dark-themed interface with glassmorphism and animations

**Tech Stack**: Node.js, Express, aidefence v2.1.1, Vanilla JavaScript
**Location**: `aidms-demo/` folder
**Live Demo**: http://localhost:3000 (when running)

**Get Started**:
```bash
git checkout aidms-tinkering
cd aidms-demo
npm install
npm start
# Visit http://localhost:3000
```

**Key Features**:
- 🛡️ **Adversarial Attack Detection**: Identifies malicious input patterns
- 🚨 **Real-time Threat Log**: Track and analyze security events
- 📊 **Performance Metrics**: Monitor detection rates and response times
- 🧪 **Interactive Testing**: Pre-loaded examples of common threats
- 📝 **Comprehensive Documentation**: Perfect for team presentations

**Threat Categories Detected**:
- Prompt Injection & Role Manipulation
- Jailbreak Attempts (DAN, Developer Mode)
- System Impersonation & Privilege Escalation
- Data Exfiltration & Information Disclosure
- Adversarial Noise & Unicode Attacks

**Perfect For**: AI security demos, team training on adversarial attacks, stakeholder presentations, understanding AI defense mechanisms

---

### 🎵 Multimedia & Translation

#### **`song-translation-working`**
**Cross-Lingual Song Translation with Voice Preservation**

Research project for translating songs while preserving the original singer's voice:
- Voice cloning with minimal training data (30 seconds)
- Cross-lingual lyrics translation (Assamese → English)
- Singing voice synthesis
- RVC (Retrieval-based Voice Conversion) integration

**Tech Stack**: Python, yt-dlp, Demucs, RVC, SO-VITS-SVC
**Documentation**: Extensive guides for setup and ethical use
**🌐 Live Demo**: https://learn-assamese.netlify.app/

**Get Started**:
```bash
git checkout song-translation-working
pip install -r requirements.txt
# Read README.md for ethical guidelines and setup
```

**Perfect For**: Voice cloning research, singing synthesis, multilingual content

**⚠️ Important**: Research/educational use only. Requires explicit consent from artists.

---

#### **`claude/song-translation-01XReacfWtG8r49PHkAbKm1K`**
**Song Translation - Alternate Implementation**

Alternative branch exploring song translation techniques.

---

### 📚 eLearning & Education

#### **`claude/create-nlp-video-folder-01UWWEW4hDtDpZevsHN2ztX8`** & **`claude/create-nlp-video-folder-0163n81jHi6skrZviCcua7A6`**
**eLearning Automation Tool**

Transform PowerPoint and Word documents into interactive SCORM-compliant eLearning modules:
- Document parsing (PowerPoint, Word)
- Speaker notes extraction
- AI-powered enhancement (Claude AI)
- Interactive activities (MCQs, drag-drop, flashcards)
- SCORM 1.2 & 2004 compliance
- LMS-ready packages

**Tech Stack**: TypeScript, Node.js, Anthropic Claude API
**Location**: `NLP-and-video-rendering/` folder

**Get Started**:
```bash
git checkout origin/claude/create-nlp-video-folder-01UWWEW4hDtDpZevsHN2ztX8
cd NLP-and-video-rendering
npm install
# Configure .env with Anthropic API key
npm run build
```

**Perfect For**: eLearning content creation, SCORM package generation, healthcare training

---

### 🏠 Repository Base

#### **`main`**
**Base Repository**

Empty base branch containing only the LICENSE file. All projects are developed in feature branches.

---

## 🚀 Quick Start Guide

### To Explore a Project:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mondweep/vibe-cast.git
   cd vibe-cast
   ```

2. **Checkout the branch you're interested in**:
   ```bash
   git checkout <branch-name>
   ```

3. **Follow the project-specific instructions**:
   - Read the `README.md` in that branch
   - Install dependencies (`npm install` or `pip install -r requirements.txt`)
   - Configure environment variables if needed
   - Run the project

### To Deploy a Project:

Most web-based projects include:
- `netlify.toml` for Netlify deployment
- Build scripts in `package.json`
- Environment configuration templates (`.env.example`)

Simply connect the branch to Netlify for automatic deployment!

---

## 📁 Projects by Category

### 💬 Communication & Collaboration
- VibeCast Chat (Real-time PubNub chat)
- Tribe Mind (3D Collaborative Knowledge Graph)

### 💰 Finance
- Neural Trading System (Algorithmic trading)
- Agentic Accounting (NLP-based accounting)
- Agentic Accounting + Semantic Search

### 🎓 Education
- AI Architecture Learning (Interactive visualizations)
- eLearning Automation (SCORM package generation)

### 🛡️ AI Security
- AIDMS Demo (AI Manipulation Defense System)

### 🎨 Multimedia
- Song Translation (Voice cloning & translation)

---

## 🧭 How to Navigate

### Finding Projects by Technology:

- **JavaScript/TypeScript Full-Stack**: Neural Trading, eLearning Automation
- **React Web Apps**: AI Architecture Learning, VibeCast Chat
- **Python ML/AI**: Song Translation
- **Real-time Systems**: VibeCast Chat
- **Financial Systems**: Neural Trading, Agentic Accounting

### Finding Projects by Use Case:

- **Learning & Teaching**: AI Architecture, eLearning Automation
- **Production Systems**: Neural Trading, VibeCast Chat
- **Research & Experiments**: Song Translation, Semantic Search
- **Team Demos**: VibeCast Chat, AI Architecture

---

## 🤝 Contributing

Each branch represents an independent project. To contribute:

1. Checkout the relevant branch
2. Create a feature branch from it
3. Make your changes
4. Submit a pull request to the project branch

---

## 📄 License

This repository is licensed under the MIT License. See the `LICENSE` file for details.

---

## 📞 Contact

For questions about specific projects, please refer to the documentation in each branch.

---

**Last Updated**: November 2025
**Repository**: [mondweep/vibe-cast](https://github.com/mondweep/vibe-cast)

---

## 🎯 Quick Branch Reference

| Branch Pattern | Project Type |
|----------------|--------------|
| `claude/pubnub-*` | PubNub real-time chat demos |
| `claude/neural-trading-*` | Trading system setups |
| `claude/song-translation-*` | Song translation experiments |
| `claude/create-nlp-video-*` | eLearning automation tools |
| `claude/ai-architecture-*` | AI learning applications |
| `aidms-tinkering` | AI security and defense demos |
| `tribe-knowledgeGraph` | Collaborative knowledge graph |
| `exploring-*` | Research and experimental features |
| `*-working` | Stable working implementations |

---

**Happy exploring! 🚀**
