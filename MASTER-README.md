# Vibe Cast - Repository Overview

Welcome to **Vibe Cast** — a public learning lab maintained by [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty).

This repository is where I explore and build things in public. Each branch is a self-contained experiment, prototype, demo, or production-grade project. I share the journey — the working code, the dead ends, and the lessons — so others can follow along, reuse what works, and contribute.

If you are looking for a quick mental model: think of `main` as a navigation directory, not a codebase. The interesting code lives in feature branches. This document is your map.

> Connect with me on LinkedIn: <https://www.linkedin.com/in/mondweepchakravorty>

---

## Table of Contents

- [How to Use This Repository](#how-to-use-this-repository)
- [Project Categories](#project-categories)
  - [Real-Time Communication & Collaborative Apps](#real-time-communication--collaborative-apps)
  - [Agentic AI Frameworks & Skills](#agentic-ai-frameworks--skills)
  - [AI / ML Research & Exploration](#ai--ml-research--exploration)
  - [Financial Systems, Trading & DeFi](#financial-systems-trading--defi)
  - [IoT, Edge Hardware & Sensing](#iot-edge-hardware--sensing)
  - [Multimedia, Music & Video](#multimedia-music--video)
  - [eLearning & Educational Content](#elearning--educational-content)
  - [Regional, Cultural & Social-Good Projects](#regional-cultural--social-good-projects)
  - [Vehicle, Mobility & Connectivity](#vehicle-mobility--connectivity)
  - [Web Development, WASM & Tooling](#web-development-wasm--tooling)
  - [Hackathons, Meetups & Live Demos](#hackathons-meetups--live-demos)
  - [Genomics & Scientific Computing](#genomics--scientific-computing)
  - [Spiritual, Philosophical & Creative Writing](#spiritual-philosophical--creative-writing)
- [Branch Reference Table](#branch-reference-table)
- [Quick Start](#quick-start)
- [Contributing & Following Along](#contributing--following-along)

---

## How to Use This Repository

```bash
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git fetch --all
git checkout <branch-name>
```

Each branch has its own README, dependencies, and run instructions. Some branches deploy to Netlify, Vercel, Railway, or Fly.io; others are notebooks, lectures, or design artefacts.

---

## Showcase Projects (External Repositories)

A few flagship projects live in separate, private repositories. They are catalogued here because the work, the writeups, and the live demos are part of the same build-in-public journey.

### Rugby Line-Out Intelligence
**AI-powered rugby analysis platform** — turns raw match footage into tactical scouting reports using Google Gemini vision models, hosted on Azure Container Apps.

- **Problem**: coaches lose hours manually scrubbing match footage to analyse line-out set-pieces. There is no fast, repeatable way to turn raw video into actionable tactical intelligence on opposition formations, throw depth, and outcomes.
- **What it does**:
  - **Two-phase AI analysis** — Phase 1 scans frames for candidate line-out events; Phase 2 classifies each clip with formation, throw depth, result, and pitch zone.
  - **Interactive dashboard** — pitch heatmap, zone radar chart, formation breakdown, and an auto-generated scouting report.
  - **AI chat** — query match data in natural language, or trigger video re-analysis for deeper tactical questions; false positives can be removed via function-calling in the chat.
  - **Self-learning memory** — human corrections are stored as vector embeddings in pgvector and used to improve accuracy over time.
  - **Flexible video ingest** — drag-and-drop upload or YouTube URL (with yt-dlp + cookie passthrough to bypass bot verification).
- **Tech**: Google Gemini vision models (4 user-selectable), pgvector for self-learning memory, Azure Container Apps, Azure Blob Storage, GitHub Actions CI/CD, yt-dlp.
- **Status**: v2.2.0 — Azure migration complete; staging and production infrastructure provisioned (May 2026). Mobile-responsive dashboard, custom prompt support.
- **Staging demo**: <https://lineout-frontend-staging.delightfulflower-38f4c743.uksouth.azurecontainerapps.io/>

---

### Securing the Agentic Frontier — MAESTRO Framework
**AI security research and live demo**, presented to ~150 CISOs at the **Rela8 Group CISO London Summit 2025**.

- **Problem**: ElizaOS — a widely-deployed open-source AI agent framework — has critical security gaps. *"73% of production deployments have zero authentication"*; agents execute untrusted code with full system privileges, exposing enterprises to material financial and operational risk.
- **What was achieved**:
  - Identified **23 exploitable vulnerabilities across 7 architectural layers**.
  - Developed **MAESTRO** (Multi-Agent Environment Security Threat & Risk Operations) — a layered security model for evaluating agentic AI systems.
  - Demonstrated **three zero-day attack scenarios** live in under 5 minutes each: RAG memory poisoning, malicious plugin supply-chain attack, and authentication bypass.
  - Quantified **$12M annual risk exposure** (range $5.55M – $34.7M per incident) with a phased hardening roadmap delivering **12:1 ROI**.
  - Delivered to ~150 senior security executives at the CISO London Summit 2025.
- **Tech / concepts**: MAESTRO framework, ElizaOS internals, RAG / vector-database threat modelling, plugin-ecosystem supply-chain security, LLM integration patterns (Anthropic Claude referenced).
- **Live demo**: <https://maestro-agentic-ai-security-demo-mon.netlify.app/>

---

### Driftwise — Serendipitous Local History
**Location-aware discovery PoC** that surfaces historical narratives about a user's immediate surroundings, built with Anthropic's Claude Agent SDK.

- **Problem**: most history apps require directed search — you have to already know what you're looking for. Driftwise inverts that: it surfaces the history *around you*, serendipitously.
- **What it does**:
  - Mobile-friendly, location-permission-aware interface.
  - Discovers and presents place-based historical narratives based on the user's current location.
  - Proof-of-concept demonstrating how a Claude Agent SDK pipeline can power a real-world consumer experience.
- **Tech**: Anthropic Claude Agent SDK; deployed on Vercel.
- **Status**: v0.1.0, co-created.
- **Live demo**: <https://driftwise-mmp.vercel.app/>

---

## Project Categories

### Real-Time Communication & Collaborative Apps

#### `claude/pubnub-tinkering-01Udh52LMtTJqdrt5G5JLmF6`
**VibeCast — Real-Time PubNub Chat**
A single-file chat app demonstrating real-time pub/sub messaging, presence, history, typing indicators, and multi-channel support. Uses PubNub demo keys for instant testing.
- **Tech**: HTML, CSS, JavaScript, PubNub SDK
- **Live demo**: <https://pubnub-tinkering.netlify.app/>
- **Run**: open `index.html` or deploy to Netlify

#### `tribe-knowledgeGraph`
**Tribe Mind — Collaborative 3D Knowledge Graph**
A real-time, multi-user 3D force-directed graph for visualising collective intelligence. Includes history playback, in-app chat, presence, and JSON export/import. Fully serverless.
- **Tech**: React, Vite, Three.js, react-force-graph-3d, PubNub
- **Folder**: `tribe-knowledge-graph/`
- **Status**: Working — Netlify-deployable

---

### Agentic AI Frameworks & Skills

#### `claude/qe-framework-session-id-JB4dj`
**Agentic Quality Engineering Fleet (V3)**
Domain-Driven Design QE framework with 13 bounded contexts, 60+ specialised agents, ReasoningBank learning, TinyDancer model routing, HNSW vector search, MinCut/Consensus integration. Deep Claude Flow integration.
- **Tech**: TypeScript, Node.js, Claude Flow

#### `claude/ikenna-forge-YbUEZ`
**Forge — Autonomous Quality Engineering Swarm**
Eight-agent QE swarm: behavioural-spec generation, E2E testing, failure analysis, confidence-tiered fixes, accessibility auditing, and seven quality gates. Comprehensive demo with e-commerce examples.
- **Tech**: Claude Code Skill, BDD/Gherkin

#### `claude/claude-code-v3-skill-KucJF`
**Build with Quality — Claude Flow + Agentic QE Skill**
Combined skill bringing 111+ specialised agents, unified learning (SONA), and intelligent model routing (TinyDancer) together.
- **Tech**: Node.js, TypeScript, YAML config

#### `agentics/vehicle-safety-innovation`
**Agentic QE for Vehicle Safety (V3)**
60+ agents with swarm orchestration, Byzantine consensus, HNSW vector search, and SONA neural learning. Hierarchical-mesh topology for the vehicle-safety domain.
- **Tech**: Claude Flow V3, Agentic QE, RuVector

#### `claude/competitive-analysis-l4dH6`
**Competitive Analysis AI Agent**
Automated competitor research with MCP server exposure, entity validation, sector identification, and comparative report generation. TDD with 79 mocked tests. Supports Gemini, Claude, OpenAI.
- **Tech**: Python, FastMCP, Jupyter

#### `claude-flow-browser` / `claude/review-claude-flow-demo-a3Bvp`
**Claude Flow V3 Browser Automation**
Working examples of `@claude-flow/browser` for AI-optimised browser automation on real websites (Hacker News, GitHub, Wikipedia, tech news scrapers).
- **Tech**: TypeScript, Playwright

#### `claude-flow-with-antigravity` / `claude/init-driftwise-pwa-UF1It`
**Hybrid Multi-Model Swarms — Claude Flow inside Google Antigravity**
Integration demonstrating Anthropic, Gemini, and Ollama model switching through a unified agent environment.
- **Tech**: Node.js, Claude Flow CLI, MCP, Gemini, Ollama

#### `lean-agentic-tinkering`
**Lean Agentic Patterns**
Minimal episodic-chatbot example demonstrating lean agent architecture.

#### `aidms-tinkering`
**AIDMS — AI Manipulation Defense System Demo**
Interactive demo of multi-layered adversarial defense for AI apps: prompt-injection detection, jailbreak prevention, real-time threat dashboard, and pattern recognition (fast-path / deep-path analysis).
- **Tech**: Node.js, Express, aidefence v2.1.1
- **Folder**: `aidms-demo/`

#### `feat/token-usage-analyser`
**Claude Code Token Usage Analyzer**
Python tool that scans `~/.claude/projects/` JSONL files for per-project, per-session token consumption, subagent tracking, and prompt history extraction.

#### `claude/convex-skills-tinkering-ENbCy`
**Convex × Claude Skills**
Exploration of Convex platform integration with Claude Code skills (PRD + research docs).

#### `claude/reference-previous-session-wdkAq`
**NVIDIA AIQ Reference Session**
Reference session capturing NVIDIA AIQ setup with DeepResearch Bench integration.

---

### AI / ML Research & Exploration

#### `claude/ai-architecture-analysis-01TJ3tNZF6g4Wpu3Ux8NpUCe`
**Understanding AI Architecture — Interactive Learning**
Gamified web app teaching how AI coding assistants work: 3D vector space explorer, RAG simulator, attention visualiser, tool-orchestration challenge, context-window manager.
- **Tech**: React, TypeScript, Three.js, D3.js, Vite, TailwindCSS

#### `claude/build-rag-pipeline-019nVCzZfxYWm51ErxXnrsrV`
**RAG Pipeline Development Session**
Structured RAG learning session with slides, demo, and implementation.
- **Folder**: `rag-session/`

#### `claude/explore-gemma-models-B0L8q`
**MedImage — Medical Imaging with MedGemma**
Early Python/FastAPI prototype exploring Google's MedGemma for medical image analysis, with BHIL methodology documentation (ADRs, PRD, specs, tasks).

#### `claude/explore-jepa-orphan-adYwi`
**JEPA 101 — Self-Supervised Learning**
Educational guide to Joint-Embedding Predictive Architecture (Yann LeCun / Meta AI). Covers masked prediction across modalities without contrastive methods.

#### `claude/NVIDIA-AIQ-Tinkering` / `claude/nvidiaaiq-exploration-739m3`
**NVIDIA AIQ Blueprint Exploration**
Enterprise-grade agentic research system built on NVIDIA NeMo Agent Toolkit + LangChain. YAML-driven orchestration of shallow and deep research workflows; second branch configured with DeepResearch Bench v1/v2 worktrees.

#### `claude/microsoft-agent-framework-PYgKV`
**Microsoft Agent Framework — Multi-Agent Workflow**
ASP.NET + Python multi-agent system on Azure: orchestration, telemetry, tool-calling, content generation. Research → Alignment → Content agent pipeline.
- **Tech**: C#, ASP.NET, Python, Azure OpenAI, Azure Blob, Brave Search API

#### `gemma-4b-abliterated-tinkering`
**Gemma Abliterated — AI Safety Research**
Controlled local lab setup of Gemma in abliterated configuration for studying AI vulnerabilities and safety mechanisms.

#### `claude/explore-rvf-ruvector-iUqFW` & `exploring-ruvector`
**Agentic Accounting + RVF Cognitive Containers**
NLP financial-transaction parsing wrapped in an agent interface. FIFO/LIFO/HIFO accounting with high-precision decimal math.
- **Tech**: TypeScript, decimal.js, RVF / RuVector

#### `explore-rvf-bird-song`
**Bird Song Identifier — RVF Learning**
Species-identification pipeline for 8 UK bird species, using RVF Cognitive Containers with spectrograms and acoustic feature detection.

#### `claude/llm-agentic-ai-lecture-0BXzZ`
**LLM / Agentic AI Lecture Series**
Comprehensive lecture structure: audience analysis, technology landscape, governance frameworks, plus a `lecture-pulse/` demo app portfolio.

---

### Financial Systems, Trading & DeFi

#### `claude/neural-trading-setup-01QRibo48q536HdRYfZppwYG`
**Neural Trading System — Enhanced Edition**
Production-ready algorithmic trading: multi-strategy (momentum, mean reversion, neural forecast), VaR/CVaR risk management, Prometheus metrics, circuit breakers, 99.95%+ uptime targets.
- **Tech**: Node.js, Alpaca API, `@neural-trader/*` packages
- **Folder**: `neural-trader-work/`

#### `cognitum-one-neuraltrader`
**Cognitum Neural Trader — k-NN SPY Strategy**
Walk-forward backtest using Cognitum Seed (Raspberry Pi AI appliance) as a k-Nearest-Neighbours memory. Non-parametric trading where past market days guide decisions. v5 multi-asset rotation reached 2.61× equity; DCA outperformed several variants. Includes UK retail tax/strategy guide and `LIMITATIONS.md`.
- **Tech**: Python, Cognitum Seed (RVF), yfinance, cosine similarity

#### `cognitum-one-get-started-20260506-214243`
**Cognitum.One MCP Bridge + ESP32 CSI Ingest**
Working snapshot connecting a Cognitum.One seed device to Claude via MCP, with Node.js stdio→HTTP bridge, ESP32-S3 firmware, and WiFi-CSI ingest pipeline. Addresses MCP v2025-11-25 compatibility issues.

#### `aave-mcp`
**Aave V3 MCP Server in Rust**
Dual-target MCP server for the Aave V3 protocol: compiles to a native stdio binary AND a WASM module from the same codebase. Exposes market data, account health, and liquidation risk across Ethereum and Base.
- **Tech**: Rust, alloy, tokio, reqwest, wasm-pack

#### `exploring-antigravity-from-google`
**Agentic Accounting System**
NLP financial transaction parser: "Bought 1.5 BTC at 45000" → structured tx, with FIFO/LIFO/HIFO cost-basis accounting and `decimal.js` precision.
- **Folder**: `agentic-accounting/`

#### `defi-learning-path`
**DeFi Learning Path**
Educational repository of learning modules covering DeFi concepts, protocols, and development progression.

#### `claude/create-defi-orphan-branch-MwFdJ`
**DeFi Learning Journey — AI Tutor App**
Personal learning app with an 8-week DeFi curriculum, an AI tutor (Claude), 42 tasks across 4 phases, a resource library, privacy-first design, and optional Supabase progress sync.
- **Tech**: Next.js 14, React 18, TypeScript, Claude 3.5 Sonnet, Supabase, Tailwind
- **Deploy**: Vercel

#### `dao-dag`
**DAO-DAG — QuDAG Proof-of-Action for GHA Tokens**
Architectural strategy applying QuDAG (Quantum-Resistant DAG) to a Proof-of-Action mechanism for Agentics Foundation hackathon GHA tokens. Zero-person governance, autonomous agent validation, ML-DSA-secured consensus.

---

### IoT, Edge Hardware & Sensing

#### `tcl-move-platform` / `tcl-move-platform-v2`
**MOVE Connectivity Commander — Tata Communications IoT Dashboard**
High-impact visual demo of the Tata Communications MOVE platform: 3D global connection visualisation, real-time device control, eSIM lifecycle management, AI-powered fleet insights, and a guided "Story Mode" for sales demos. V2 expands the Claude Flow V3 agent framework.
- **Tech**: Next.js 14, React, Three.js + R3F, Tailwind, Google Gemini

#### `esb32-tinker-ruview`
**ESP32-S3 RuView WiFi-CSI Sensing Node**
End-to-end one-evening session bringing up an ESP32-S3 as a RuView Channel-State-Information sensing node — firmware flashing, Wi-Fi provisioning, Rust host pipeline, live presence/vital-sign dashboard, full bug post-mortem.
- **Tech**: ESP32-S3, Rust, Axum, UDP/JSON streaming
- **Live**: `localhost:3000/ui/` after local build

#### `claude/pi-tinkering-86sN1`
**Pi Network Explorer — Decentralised Knowledge Graph**
React/TypeScript app exploring the `pi.ruv.io` decentralised collective-intelligence platform: real-time pub/sub via PubNub, Bayesian quality scoring, REST sandbox, live activity dashboard.

#### `pc-discovery`
**PC Hardware Discovery & Linux Dual-Boot Prep**
Windows 11 hardware audit (AMD Ryzen 7 5700X, Crucial P310 NVMe ~1.82 TB), partition analysis, and ~879 GB unallocated discovery for an upcoming Linux dual-boot install.

---

### Multimedia, Music & Video

#### `song-translation-working` & `claude/song-translation-01XReacfWtG8r49PHkAbKm1K`
**Cross-Lingual Song Translation with Voice Preservation**
Research project translating songs (e.g., Assamese → English) while preserving the original singer's voice. Voice cloning with ~30 s of training data, vocal isolation, singing-voice synthesis.
- **Tech**: Python, yt-dlp, Demucs, RVC, SO-VITS-SVC
- **Live demo**: <https://learn-assamese.netlify.app/>
- **Ethical note**: research/educational use only; requires explicit artist consent

#### `claude/sanskrit-english-songs-8IhOE`
**SanskritSync — Learn Sanskrit Through Music**
Full-stack app for learning Sanskrit via YouTube music videos: synchronised lyrics, Devanagari/IAST/word-by-word translations, spaced repetition vocab, flashcards, matching games.
- **Tech**: React 19, TypeScript, Express 5, Tailwind 4, Claude API, Supabase, Railway

#### `claude/music-video-noise-removal-kFFo9`
**Music Video Noise Removal**
Configurable multi-stage FFmpeg pipeline (high-pass → FFT denoise → EQ → dereverb → compression) for cleaning up live phone recordings.

#### `claude/sheet-music-player-w1UAI`
**LuitPlayer — Score-to-Audio WASM App**
High-performance browser app: digitises PDF musical scores (OMR), provides per-instrument playback, follow-along cursor, real-time tempo scaling via WASM.
- **Tech**: Vite, React 19, AudioWorklet, WASM (Emscripten), OpenCV.js, Tesseract OCR

#### `claude/learning-guitar-UCoC7`
**RSD Guitar Internalizer**
Web app for internalising guitar chord progressions and rhythmic patterns through spaced repetition, fretboard drills, metronome synthesis, and gamification — built around Assamese guitar lesson material from RSD Guitar Stories.
- **Tech**: React 19, TypeScript, Vite 7, Web Audio API, Vitest, Playwright

#### `claude/guitar-chord-diagrams-oU2HX` & `claude/phase5-plan-oU2HX`
**Guitar Chord Sound Interpreter**
Browser app that listens to a guitar via mic, detects chords via FFT pitch detection, and displays all fingering voicings as interactive SVG diagrams (major, minor, 7th, suspended, altered, slash). Phase 5 branch refines audio detection and chord-logic.

#### `drum-pad-app-opencode`
**Drum Machine**
Standalone web-based drum machine: 8 programmable pads, keyboard control, sequencer with beat patterns, BPM control, Web Audio synthesis.

#### `claude/video-testing-app-Dqh8E`
**Vibe Cast Clipcannon Video Testing App**
Next.js app for testing video ingestion/processing with Clipcannon — API routes for health, URL ingest, upload, and tool invocation with connection-status monitoring.
- **Tech**: Next.js 16.2, React 19.2, Tailwind 4

#### `claude/kaltura-ontology-IcuvT`
**Video Content Ontology & Knowledge Base**
Platform ingesting Kaltura video content, extracting structured knowledge via AI, exposing via semantic search and content generation. 8 entity types × 9 typed relationships in a knowledge graph.
- **Tech**: Neo4j, pgvector, Claude API, React, GraphQL/REST, Redis

#### `claude/mk3-dcoa-tinkering-mdlQx`
**Assamese Video Dubbing Pipeline**
AI English→Assamese video-dubbing pipeline using Sarvam AI: 5-stage orchestration (Saaras v3 transcription → translation → Bulbul v3 TTS → Wav2Lip lip-sync → mix/export), dark UI, Playwright E2E, demo mode without API key.

#### `claude/create-nlp-video-folder-01UWWEW4hDtDpZevsHN2ztX8` & `claude/create-nlp-video-folder-0163n81jHi6skrZviCcua7A6`
**eLearning Automation — PPTX/Word → SCORM**
Transforms PowerPoint/Word documents (with speaker notes) into interactive SCORM 1.2 / 2004 compliant eLearning modules: AI-enhanced learning objectives, MCQs, drag-drop, flashcards, LMS-ready packages. The second branch adds SPARC architecture docs, Netlify Functions, and a web UI.

---

### eLearning & Educational Content

#### `aws-advanced-networking`
**AWS Advanced Networking (ANS-C01) Interactive Course**
Comprehensive journey-based learning platform: 61 hours of interactive content across 10 modules (VPC, connectivity, DNS, CDN, security, monitoring, automation, multi-account, BGP). Structured/non-linear paths for learners, teachers, and practitioners.
- **Tech**: Next.js 14, React 18, shadcn/ui, MDX, D3.js, React Flow, Jest, Playwright

#### `claude/learning-rust-basics-018PWdHwSocRSxdEGthr5CK4`
**Rust Learning Journey — Brown University Book**
Hands-on, structured learning of Rust using <https://rust-book.cs.brown.edu/>: ch01–ch21 progression covering ownership, modules, error handling, iterators, smart pointers, concurrency, capstone web server. Includes progress tracking and mastery projects.

#### `jhu-prompt-engineering-live-demo-2`
**Weather Game — Prompt-Engineering Live Demo**
Interactive weather-based React app used as a teaching prop for prompt-engineering concepts.
- **Tech**: React 18, Vite, Netlify Functions

#### `jhu-week2-live-demo`
**JHU Week 2 Live Demo**
Educational demo branch referencing the Vibe Cast repository overview.

#### `hackathon-tv5monde-guidance`
**TV5Monde Hackathon Guidance**
Comprehensive guidance and CLI documentation for hackathon participants with agentic integration via MCP server.

---

### Regional, Cultural & Social-Good Projects

#### `NMC-2026-assam`
**Bernardi Music Group Summer School Website**
Marketing website for an international music summer school in Assam: faculty, programme, student registration, fundraising.
- **Tech**: Next.js 15, React 18, Tailwind, Supabase-ready

#### `claude/assamese-travel-companion-uRp3j`
**Axomiya — Assamese Travel Companion**
Offline-first PWA: live translation, respect/formality toggles, category-filtered phrasebook, recent-translation history. Netlify serverless translation API.

#### `claude/khasi-travel-companion-2N6mJ`
**Kumno — Khasi Travel Companion**
Same architecture as Axomiya, applied to the Khasi language.

#### `claude/assam-use-case-01KyUJCwyzb371Ck5PogDXgm` & `claude/maina-openclaw-7oIfW` & `claude/apply-infographic-skill-klJ22`
**Assam AI Governance Initiatives**
Two interlinked projects for Assam State: (1) property-registration digitalisation (20–30 days → 5–7 days, 80% remote) with OCR document verification, and (2) infrastructure cost auditing with anomaly detection (target ₹50+ crore annual savings, 80%+ fraud detection). Domain-driven PWA prototype.

#### `claude/nagaon-ai-summit-setup-HhcKv`
**Nagaon University AI Summit 2026 — Interactive Showcase**
Browser showcase of agentic AI techniques with live demos: ReAct agent simulator, multi-agent orchestration (Planner/Coder/Reviewer/Tester), RAG visualiser, technique gallery. Animated particle-network background, full summit agenda.

#### `claude/add-nagaon-uni-website-graph-p2U1z` & `claude/create-nagaon-demo-branch-d36j7`
**Nagaon University Knowledge Graph (early planning)**
Stubs and early planning branches for the Nagaon University web/graph project.

#### `claude/rari-jaipur-ai-summit-2026-3hTBl` & `flyio-new-files`
**KrishiMitra — Farmer's AI Companion (Agentics Foundation Demo)**
Full-stack agriculture advisory for Rajasthan farmers, offline-first with real government data. Three-level architecture (static offline → SQLite+Express → optional Claude/Gemini AI). Mandi prices, weather, soil analysis, district-specific advisory. Presented at AI Summit 2026.
- **Tech**: Node.js, Express, SQLite, Open-Meteo, data.gov.in, Claude/Gemini, Playwright, Docker

#### `claude/ai-benefits-advisor-setup-SHNZK`
**AI Benefits Advisor — Independent Age Copilot (UK)**
Advisor-facing copilot for UK pension benefits: real-time multilingual call listening (EN/UR/PA/BN), contextual guidance, automatic documentation, safeguarding detection. Targets reducing benefits processing from 6–12 weeks to 3–4 weeks.
- **Tech**: Claude-Flow, RuVector, Twilio, Vapi.ai, Deepgram Nova-2, Salesforce, EntitledTo API

#### `claude/venkateswata-research-01KpZcJLMdaib3v97LtGBeCp`
**The Divine Story of Lord Venkateswara — Visual Storytelling**
13-chapter interactive narrative arc (Vaikuntha through Tirumala Temple), with 18 placeholder slots for traditional artwork, Sanskrit stotras, and temple history.

#### `claude/infographic-skill-FyqpJ` & `openclaw` & `build`
**India AI Governance — Content Library & Infographic Skill**
Claude-skill library for AI-driven visual content: README generation, semantic graphs (Mermaid + Neo4j Cypher), slide mosaics, themed guides. Two-pass executor/reviewer workflow inspired by NotebookLM infographics.

#### `claude/openclaw-tinkering-aI4U7`
**OpenClaw Extended Agent Architecture**
13+ agent domains (analysis, architecture, consensus, core, data, development, devops) with Raft / Byzantine / CRDT consensus algorithms and specialised coordinator agents.

#### `BHIL-tinkerinh`
**Zephyr Drift — Weather-to-Music AI Agent**
OpenClawCity agent that reads weather data, maps it to musical moods, composes tracks via the city's music studio, and posts poetic narratives. Versioned prompts, LLM-as-judge evaluation, agent orchestration.

#### `claude/nonfiction-writing-refinement-session-O2dnP`
**Prose Refinery — Non-Fiction Writing Tool**
AI-assisted writing refinement preserving the author's voice while improving clarity, conciseness, structure, and tone. Few-shot, chain-of-thought, multi-pass prompt patterns as a teaching framework.

#### `ups-left-right-worship`
**All Is Bliss — Pattern Space Navigation Framework**
Metaphysical-spiritual pattern-navigation framework drawing on Shakti/McLaughlin jazz-fusion traditions, Eastern consciousness, and wisdom traditions. Markdown skill registry covering archaeology, transformation, field dynamics, divine-council wisdom, and breakthrough navigation. Includes musical-spiritual Easter eggs.

---

### Vehicle, Mobility & Connectivity

#### `claude/fiat-500-car-tracker-ZbfKA`
**Fiat 500 Car Tracker**
Full-stack listing/inventory platform for Fiat 500 vehicles. React+TS frontend, Node.js backend, Docker deployment to Cloud Run; comprehensive PRD and implementation plan included.

#### `vehicle-repair-network`
**Vehicle Repair Network**
Early-stage platform connecting vehicle owners with repair shops and mechanics. Contains PRD and proposal deck for an EV Repair Network Navigator prototype.

(See also `agentics/vehicle-safety-innovation` under Agentic AI Frameworks, and `tcl-move-platform` under IoT.)

---

### Web Development, WASM & Tooling

#### `claude/wasm-tinkering-l5Rmh`
**WASM Image Filters**
Browser-based image processing built with Rust + WebAssembly: grayscale, blur, sharpen, Sobel edge detection — all local, zero network latency, 10–50× speedup over JS.
- **Live demo**: `wasm-tinkering.netlify.app`

#### `claude/evaluate-wasm-package-Vtdt2`
**Prime-Radiant Advanced WASM Evaluation**
Evaluation of `prime-radiant-advanced-wasm` (coherence checking, stability, causal inference, quantum states, category theory, HoTT) with a Node.js evaluator and React visualiser.

#### `claude/explore-microsoft-graph-eykAo`
**Microsoft Graph Explorer — OAuth Integration**
Node.js/Express server exploring M365 data via MSAL OAuth and Microsoft Graph.

#### `microsoft-graph-exploration`
**Microsoft Integration Ecosystem Guides**
Documentation across Microsoft Graph, Business Central, Dynamics 365, Dataverse, Microsoft Fabric, and SharePoint — including practical Quote-to-Cash, customer 360, and credit-management implementations.

#### `claude-figma-pix-exploration`
**Pix — Figma-to-Code Demo**
Sample React + Tailwind project demonstrating the `/pix` Figma-to-code workflow using Claude-in-Chrome + Figma MCP.

#### `driftwise-recreation`
**Driftwise GPS Exploration**
Recreation/exploration of Driftwise project structure with Claude code-analysis agents.

#### `recreate-driftwise-antigravity`
**SvelteKit Minimal Starter**
Blank SvelteKit + TypeScript scaffold used as a Driftwise variant baseline.

#### `claude/weather-game-multiplayer-bkkLj`
**Weather Game — Multiplayer Edition**
Real-time multiplayer game keyed on each player's local weather. OpenWeatherMap/Open-Meteo, WebSockets, live leaderboard, AISP specification (<2% output variance).

#### `claude/shopping-cart-enhancements-FBDwR`
**Shopping Cart Enhancements**
Real-time inventory + promotion engine: quantity-aware cart, percentage discounts, threshold and coupon-based offers, BOGO. Detailed functional/technical requirements.

#### `terracraft-app`
**TerraCraft — Earth-to-Minecraft World Generator**
Turn any Earth location into a playable Minecraft world. Leaflet mapping, Overpass API (OSM data), optional LLM enrichment, `arnis` Rust binary for world generation, Express backend with polling pipeline.

#### `ad-hoc-tinkering`
**Miscellaneous Ad-Hoc Experiments**
Jupyter notebooks including kFinance basic usage exploration.

#### `claude/update-master-readme-FMsAY` & `claude/master-readme-01Udh52LMtTJqdrt5G5JLmF6`
**Repository Documentation Branches**
Branches dedicated to maintaining `MASTER-README.md` and the top-level `README.md`.

---

### Hackathons, Meetups & Live Demos

#### `42-london-demo` & `claude/create-42-london-branch-2-01APG2sUpa4q15Lv5mHUfKNj`
**Sky Concierge — Travel Concierge App**
Premium door-to-door journey management built with SPARC methodology: real-time flight tracking, departure-alarm optimisation, disruption handling.
- **Tech**: React 18, TypeScript, CSS Modules, Vite, Vitest

#### `london-meetup-8Apr` & `claude/london-meetup-8apr-FznAt`
**Multi-Agent Customer Support Triage System**
Autonomous agent orchestration for realistic support scenarios. Event-driven intake classification → billing specialist → technical-support agent pipeline. Includes PRD, specs, ADRs, tasks, prompts, and mock data.

#### `claude/prepare-hackathon-01X3L6k6AAVMByXrb5xQLrw6` & `claude/agentic-hackathon-setup-01MsFnEEndzVH9sYmgJwfLhn`
**Hackathon Setup Scaffolds**
Minimal preparation branches with `ruvector-engine/` skeleton for hackathon kickoffs.

#### `claude/video-story-nostalgic-traveler-5MQl0`
**Vibe Cast Navigation Guide (Editorial)**
Documentation-focused branch capturing the multi-project repository structure.

---

### Genomics & Scientific Computing

#### `dna-input-pipeline`
**Genomic One — Sequence Ingestion Pipeline**
A/C/G/T parsing at 3.2 bits/base, vector search foundation for the broader Genomic One platform.
- **Tech**: Rust, Cargo, Node.js, HNSW

#### `genomics-exploration`
**Genomic One — Full-Stack AI Genomics Platform**
Complete 7-layer pipeline: sequence ingestion → 512D k-mer vector search → FANN neural classification → Bayesian learning → clinical advisory (CYP2D6 / GLP-1) → SAFLA safety validation → federated MCP intelligence. Next.js dashboard with Three.js visualisation.
- **Tech**: Rust (Axum), Next.js 16, React 19, Three.js, Recharts, PostgreSQL, HNSW

---

### Spiritual, Philosophical & Creative Writing

Cross-listed projects in this space:
- `claude/venkateswata-research-01KpZcJLMdaib3v97LtGBeCp` — Visual storytelling of Lord Venkateswara.
- `ups-left-right-worship` — Pattern Space Navigation Framework.
- `claude/nonfiction-writing-refinement-session-O2dnP` — Prose Refinery.
- `BHIL-tinkerinh` — Zephyr Drift weather-to-music AI agent.

---

## Branch Reference Table

| Pattern | Theme |
|---|---|
| `claude/pubnub-*` | Real-time PubNub chat demos |
| `tribe-knowledgeGraph` | 3D collaborative knowledge graph |
| `claude/neural-trading-*`, `cognitum-one-*` | Algorithmic trading & memory-based strategies |
| `aave-mcp`, `dao-dag`, `defi-*` | DeFi / on-chain / DAG governance |
| `exploring-antigravity-*`, `*-ruvector` | Agentic accounting + RVF |
| `claude/song-translation-*`, `song-translation-working`, `*sanskrit*` | Cross-lingual music & lyrics |
| `claude/*guitar*`, `claude/sheet-music-*`, `drum-pad-*` | Music learning & instruments |
| `claude/create-nlp-video-*`, `claude/video-testing-*`, `claude/kaltura-*`, `claude/mk3-dcoa-*` | Video, dubbing, eLearning, SCORM |
| `claude/ai-architecture-*`, `claude/build-rag-*`, `claude/explore-jepa-*` | AI / ML learning |
| `aidms-tinkering` | AI security / adversarial defense |
| `agentics/*`, `claude/qe-framework-*`, `claude/ikenna-forge-*`, `claude/claude-code-v3-skill-*` | Agentic QE & Claude Flow V3 |
| `claude-flow-*` | Claude Flow browser & multi-model |
| `tcl-move-platform*` | Tata Communications MOVE IoT |
| `esb32-tinker-*`, `claude/pi-tinkering-*` | Edge hardware sensing |
| `NMC-2026-assam`, `claude/*assam*`, `claude/*nagaon*`, `claude/*khasi*`, `claude/rari-jaipur-*` | India / Assam / regional projects |
| `claude/ai-benefits-advisor-*` | UK Independent Age (benefits copilot) |
| `*genomics*`, `dna-input-*` | Genomic One platform |
| `aws-advanced-networking`, `claude/learning-rust-*`, `jhu-*` | Structured learning content |
| `42-london-*`, `london-meetup-*`, `*hackathon*` | Hackathon & meetup deliverables |
| `claude/wasm-*`, `claude-figma-pix-*` | WASM, Figma-to-code |
| `openclaw*`, `claude/infographic-skill-*`, `build` | India AI governance + skill library |
| `*driftwise*` | Driftwise PWA & antigravity integration |
| `claude/master-readme-*`, `claude/update-master-readme-*` | Repository documentation |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast

# 2. See every branch
git fetch --all
git branch -r

# 3. Jump into a project
git checkout <branch-name>

# 4. Follow the branch-local README for setup
#    (npm install / pip install -r requirements.txt / cargo build / etc.)
```

Most web projects ship with `netlify.toml`, `vercel.json`, `railway.toml`, or `Dockerfile`. Many run as static demos that can be opened with `python3 -m http.server` after checkout.

---

## Contributing & Following Along

I treat this repo as a build-in-public learning lab. If you find an experiment that resonates:

1. Open an issue describing what you'd like to try.
2. Fork the branch you're interested in and create a feature branch from it.
3. Send a pull request back to that project branch (not `main`).

If you're following along with the journey rather than contributing code, the easiest way is to connect with me on LinkedIn — I post writeups and announcements there:

- **LinkedIn**: <https://www.linkedin.com/in/mondweepchakravorty>
- **GitHub**: <https://github.com/mondweep/vibe-cast>

---

## License

MIT — see `LICENSE`.

---

_Last updated: May 2026._
