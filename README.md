# Video Content Ontology & Knowledge Base Platform

Transforming video content into structured intelligence for community engagement, thought leadership, and brand growth.

## What This Is

A platform that ingests video content from [Kaltura](https://video.agentics.org), extracts structured knowledge using AI, and exposes it through search interfaces and content generation tools. Built for the Agentics Foundation.

## How It Works

```
Kaltura Videos → Transcript Processing → AI Entity Extraction → Knowledge Graph → Applications
```

**Five-stage pipeline:**

1. **Ingestion** — Pull video metadata and captions from Kaltura via MCP/API
2. **Transcript Processing** — Parse SRT, chunk into ~45s segments, correct terminology
3. **Entity Extraction** — LLM-powered extraction of people, organisations, technologies, concepts, claims
4. **Ontology Mapping** — Deduplicate, resolve co-references, populate the knowledge graph
5. **Application Layer** — Semantic search, weekly digests, content briefs, trend analysis

## Ontology

8 entity types connected by 9 typed relationships:

| Entity | Description |
|--------|-------------|
| **Person** | Speakers, panellists, referenced individuals |
| **Organisation** | Companies, research labs, foundations, OSS projects |
| **Technology** | Tools, frameworks, platforms, protocols |
| **Concept** | Ideas, methodologies, architectural patterns |
| **Event** | Recorded sessions, webinars, panels |
| **Topic** | Thematic categories grouping related discussions |
| **Claim** | Assertions, predictions, or positions taken by speakers |
| **Demo** | Product demonstrations or technical walkthroughs |

Every fact carries provenance metadata linking back to a specific timestamp in a specific video, enabling one-click source verification via Kaltura deep-links.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Video Platform | Kaltura (existing) |
| Knowledge Graph | Neo4j |
| Vector Store | pgvector (PostgreSQL) |
| LLM | Claude API (Anthropic) |
| API | GraphQL + REST |
| Frontend | React |
| Cache | Redis |

## Project Phases

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1. Foundation | 1–4 | Ingestion pipeline, transcript processing, entity extraction, graph setup |
| 2. Enrichment & Search | 5–8 | Relationship extraction, semantic search, web UI, automated pipeline |
| 3. Content Generation | 9–12 | Weekly digests, quote finder, content briefs, trend analysis, social pipeline |
| 4. Intelligence & Scale | 13–16 | Personalised recommendations, speaker profiles, evolution tracking, feedback loop |

## Documentation

- [**PRD**](./Video-Content-Ontology-PRD.docx.md) — Full product requirements document
- [**Implementation Plan**](./IMPLEMENTATION-PLAN.md) — Phase-by-phase work packages with Forge behavioral validation
- [**Architecture**](./ARCHITECTURE.md) — System design with mermaid diagrams

## Quality Assurance

This project uses [Forge](https://github.com/ikennaokpala/forge) for autonomous behavioral validation. Every work package includes Gherkin specifications that serve as the definition of done. Forge's 7 behavioral gates (functional, behavioral, coverage, security, accessibility, resilience, contract) are enforced across all bounded contexts.

## Status

**Draft — For Alignment** | Version 1.0 | 11 March 2026
