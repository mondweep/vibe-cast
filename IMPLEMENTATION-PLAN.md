# Video Content Ontology — Implementation Plan

## Overview

This document translates the [Video Content Ontology PRD](./Video-Content-Ontology-PRD.docx.md) into an actionable, phase-by-phase implementation plan. Each phase is broken into discrete work packages with clear inputs, outputs, and exit criteria. **Forge** is used throughout for autonomous behavioral validation — every work package includes Gherkin specifications that serve as the definition of done.

---

## Project Setup & Conventions

### Repository Structure (Target)

```
kaltura-ontology/
├── forge.config.yaml              # Forge configuration
├── forge.contexts.yaml            # Bounded contexts for Forge
├── docs/
│   ├── adr/                       # Architecture Decision Records
│   └── ontology/                  # Ontology schema docs
├── specs/
│   └── features/                  # Gherkin specifications
│       ├── ingestion/
│       ├── processing/
│       ├── extraction/
│       ├── search/
│       └── content-generation/
├── src/
│   ├── ingestion/                 # Kaltura MCP/API integration
│   ├── processing/                # Transcript parsing & chunking
│   ├── extraction/                # LLM entity/relationship extraction
│   ├── graph/                     # Knowledge graph operations
│   ├── search/                    # Semantic search & vector store
│   ├── api/                       # REST/GraphQL API layer
│   └── web/                       # React frontend
├── scripts/                       # Pipeline orchestration scripts
└── data/
    ├── corrections/               # Domain-specific term corrections
    └── taxonomy/                  # Topic taxonomy definitions
```

### Forge Integration

```yaml
# forge.config.yaml
architecture: modular-monolith
backend:
  language: typescript
  test_command: "npm test"
  build_command: "npm run build"
frontend:
  technology: react
  test_command: "npm run test:e2e"
model_routing:
  specification_verifier: claude-sonnet-4-6
  bug_fixer: claude-opus-4-6
  failure_analyzer: claude-sonnet-4-6
```

Each phase begins with `/forge --autonomous --context <context-name>` to validate behavioral specifications before marking a work package complete.

---

## Phase 1: Foundation (Weeks 1–4)

**Goal:** Establish the extraction pipeline and draft ontology using the existing 30-day video corpus.

### Work Package 1.1 — Project Scaffolding & ADRs

**Week 1, Days 1–2**

| Item | Detail |
|------|--------|
| **Tasks** | Initialize repo, configure Forge, define bounded contexts, write initial ADRs |
| **ADRs to produce** | ADR-001: Graph database selection (Neo4j vs alternatives), ADR-002: LLM provider (Claude API), ADR-003: Vector store selection, ADR-004: Pipeline orchestration approach |
| **Forge command** | `/forge --autonomous --context scaffolding` |
| **Output** | Configured repo with CI, Forge config, and foundational ADRs |

### Work Package 1.2 — Kaltura Ingestion Service

**Week 1, Day 3 – Week 2, Day 2**

| Item | Detail |
|------|--------|
| **Tasks** | Build Kaltura API/MCP client, implement video metadata retrieval, implement caption/SRT asset download, schedule-based polling for new content |
| **Inputs** | Kaltura Partner ID (5896392), MCP server access |
| **Gherkin specs** | `specs/features/ingestion/kaltura-ingestion.feature` |
| **Key scenarios** | Given a Kaltura partner account, when the ingestion service runs, then all videos from the last 30 days are retrieved with metadata; Given a video entry ID, when captions are requested, then SRT content is downloaded and stored; Given a video without captions, when ingestion runs, then the video is flagged as caption-missing |
| **Forge command** | `/forge --autonomous --context ingestion` |
| **Output** | Working ingestion service that pulls metadata + SRT for all recent videos |

### Work Package 1.3 — Transcript Processing Pipeline

**Week 2, Day 3 – Week 3, Day 2**

| Item | Detail |
|------|--------|
| **Tasks** | SRT parser (timestamps + text extraction), chunk merger (~45-second segments), domain-specific terminology correction dictionary, speaker diarisation attempt (contextual clues from metadata) |
| **Gherkin specs** | `specs/features/processing/transcript-processing.feature` |
| **Key scenarios** | Given raw SRT content, when parsed, then each segment has a start time, end time, and clean text; Given parsed segments, when chunked, then chunks are ~45 seconds and respect sentence boundaries; Given a chunk with "agentik AI", when correction runs, then it becomes "agentic AI" |
| **Forge command** | `/forge --autonomous --context processing` |
| **Output** | Pipeline that produces clean, chunked, corrected transcript segments |

### Work Package 1.4 — Entity Extraction (Initial)

**Week 3, Day 3 – Week 4, Day 2**

| Item | Detail |
|------|--------|
| **Tasks** | Design LLM extraction prompts for all 8 entity types (Person, Organisation, Technology, Concept, Event, Topic, Claim, Demo), implement structured JSON output parsing, confidence scoring per extraction, batch processing across all chunks |
| **Gherkin specs** | `specs/features/extraction/entity-extraction.feature` |
| **Key scenarios** | Given a transcript chunk mentioning a person and their role, when extraction runs, then a Person entity is produced with name, role, and organisation; Given extraction output, when confidence is below 0.7, then the entity is flagged for human review; Given all chunks from a video, when extraction completes, then a structured JSON file is produced per video |
| **Forge command** | `/forge --autonomous --context extraction` |
| **Output** | Entity extraction pipeline producing structured JSON for all 30-day corpus |

### Work Package 1.5 — Ontology Schema & Knowledge Graph Setup

**Week 4**

| Item | Detail |
|------|--------|
| **Tasks** | Define formal ontology schema (nodes, relationships, constraints), provision Neo4j instance, write graph ingestion scripts, load extracted entities into graph, validate coverage against taxonomy |
| **Gherkin specs** | `specs/features/extraction/ontology-mapping.feature` |
| **Key scenarios** | Given extracted entities, when loaded into the graph, then each entity type maps to a node label with required attributes; Given the full 30-day corpus loaded, when taxonomy coverage is checked, then >90% of entities map to defined categories; Given a Person entity, when queried in the graph, then all associated Events and Topics are traversable |
| **Forge command** | `/forge --autonomous --context graph` |
| **Output** | Populated knowledge graph with 30 days of content, validated ontology schema |

### Phase 1 Exit Criteria Validation

```
/forge --verify-only --all
```

- [ ] All videos from past 30 days processed
- [ ] Entity extraction >85% precision (manual sample review)
- [ ] Ontology covers >90% of entities without "uncategorised"
- [ ] All Gherkin scenarios in Phase 1 contexts pass

---

## Phase 2: Enrichment & Search (Weeks 5–8)

**Goal:** Add relationship extraction, semantic search, and community-facing discovery interface.

### Work Package 2.1 — Relationship Extraction

**Week 5**

| Item | Detail |
|------|--------|
| **Tasks** | Extend LLM prompts to extract all 9 relationship types (DISCUSSES, DEMONSTRATES, AFFILIATED_WITH, BUILDS_ON, DEPENDS_ON, PART_OF, ASSERTS, RESPONDS_TO, FEATURED_IN), relationship property extraction (timestamps, sentiment, depth), co-reference resolution across chunks within a video |
| **Gherkin specs** | `specs/features/extraction/relationship-extraction.feature` |
| **Key scenarios** | Given a chunk where a speaker discusses a technology, when extraction runs, then a DISCUSSES relationship is created with timestamp and depth; Given two Claims in the same video that reference each other, when extraction runs, then a RESPONDS_TO relationship links them; Given a person mentioned by name and later by pronoun, when co-reference resolution runs, then both references map to the same Person entity |
| **Forge command** | `/forge --autonomous --context extraction` |
| **Output** | Full relationship extraction populating graph edges |

### Work Package 2.2 — Vector Embeddings & Semantic Search

**Week 6**

| Item | Detail |
|------|--------|
| **Tasks** | Generate embeddings for transcript chunks and entity descriptions, provision vector store (pgvector or Pinecone), implement semantic search API endpoint, natural language query → vector similarity → graph traversal pipeline |
| **Gherkin specs** | `specs/features/search/semantic-search.feature` |
| **Key scenarios** | Given the query "What has the foundation discussed about medical AI?", when search runs, then results include timestamped segments with relevance scores; Given a search result, when a user clicks a result, then they are deep-linked to the exact timestamp in Kaltura; Given a query with no relevant results, when search runs, then the user sees a "no results" message with suggested topics |
| **Forge command** | `/forge --autonomous --context search` |
| **Output** | Working semantic search API |

### Work Package 2.3 — Web Interface (Search & Browse)

**Week 7**

| Item | Detail |
|------|--------|
| **Tasks** | React app scaffolding, search interface with natural language input, search results with video thumbnails + timestamps + speaker attribution, topic browser organized by taxonomy hierarchy, video segment player with deep-link support |
| **Gherkin specs** | `specs/features/search/web-interface.feature` |
| **Key scenarios** | Given a user on the search page, when they type a query and press enter, then results appear within 3 seconds; Given search results, when a user clicks a segment, then the Kaltura player opens at the correct timestamp; Given the topic browser, when a user clicks a top-level topic, then sub-topics and related videos are displayed |
| **Forge command** | `/forge --autonomous --context web` |
| **Forge gates** | Functional, Behavioral, Accessibility (WCAG AA), Resilience |
| **Output** | Community-facing search and browse web application |

### Work Package 2.4 — Automated Ingestion Pipeline

**Week 8**

| Item | Detail |
|------|--------|
| **Tasks** | Scheduled job (cron/orchestrator) to poll Kaltura for new videos, end-to-end pipeline: ingest → process → extract → map → index, error handling and retry logic, monitoring and alerting for pipeline failures, backfill capability for missed videos |
| **Gherkin specs** | `specs/features/ingestion/automated-pipeline.feature` |
| **Key scenarios** | Given a new video published to Kaltura, when the scheduled job runs, then the video is fully processed and searchable within 24 hours; Given a pipeline stage failure, when the error handler runs, then the failure is logged and the stage is retried up to 3 times; Given the pipeline has been offline for 48 hours, when it resumes, then all missed videos are identified and queued for processing |
| **Forge command** | `/forge --autonomous --context ingestion` |
| **Output** | Fully automated, self-healing ingestion pipeline |

### Phase 2 Exit Criteria Validation

```
/forge --verify-only --all
```

- [ ] Natural language search returns relevant, timestamped results
- [ ] New videos processed automatically within 24 hours
- [ ] Web interface passes WCAG AA accessibility audit
- [ ] All Gherkin scenarios in Phase 1 + Phase 2 contexts pass

---

## Phase 3: Content Generation (Weeks 9–12)

**Goal:** Deliver thought leadership and marketing content tools.

### Work Package 3.1 — Weekly Digest Generator

**Week 9**

| Item | Detail |
|------|--------|
| **Tasks** | Query graph for past week's content, LLM summarization by topic, configurable templates (email, web, Slack), audience segmentation (all members, topic-specific), delivery scheduling |
| **Gherkin specs** | `specs/features/content-generation/weekly-digest.feature` |
| **Key scenarios** | Given videos published in the past 7 days, when the digest generator runs, then a summary is produced organized by topic with links to source videos; Given a member subscribed to "Medical AI" only, when the digest generates, then they receive only content relevant to that topic; Given no new videos in the past week, when the digest generator runs, then a "no new content" notification is sent instead |
| **Output** | Automated weekly digest system |

### Work Package 3.2 — Quote & Soundbite Finder

**Week 10**

| Item | Detail |
|------|--------|
| **Tasks** | Query interface for finding compelling claims/quotes by topic, ranking by impact/quotability (LLM-scored), deep-linked timestamp output with speaker attribution, export formats (markdown, social-ready, article-ready) |
| **Gherkin specs** | `specs/features/content-generation/quote-finder.feature` |
| **Key scenarios** | Given the query "best quotes about agent architectures", when the finder runs, then results are ranked by quotability with speaker name, timestamp, and deep-link; Given a selected quote, when exported as social-ready, then the output includes the quote text, speaker name, and a Kaltura deep-link URL |
| **Output** | Quote/soundbite search and export tool |

### Work Package 3.3 — Content Brief Generator

**Week 11**

| Item | Detail |
|------|--------|
| **Tasks** | Topic-based content brief generation, includes: key arguments from corpus, relevant speaker quotes, related topics for cross-linking, suggested narrative angles, source video references |
| **Gherkin specs** | `specs/features/content-generation/content-brief.feature` |
| **Key scenarios** | Given the topic "multi-agent coordination", when a content brief is generated, then it includes at least 3 key arguments, 5 speaker quotes, and 3 suggested narrative angles; Given a generated brief, when a content team member reviews it, then every claim links back to a source video timestamp |
| **Output** | Content brief generation tool for marketing/comms team |

### Work Package 3.4 — Trend Analysis & Social Pipeline

**Week 12**

| Item | Detail |
|------|--------|
| **Tasks** | Topic frequency tracking over time, sentiment evolution visualization, emerging theme detection, social media draft post generator, social posts with video clip timestamps and attribution |
| **Gherkin specs** | `specs/features/content-generation/trends-and-social.feature` |
| **Key scenarios** | Given 3 months of processed content, when the trend dashboard loads, then topic frequency is plotted over time with trend indicators; Given an emerging theme detected, when the alert fires, then the content team receives a notification with supporting evidence; Given a topic selected for social content, when the pipeline runs, then 3 draft posts are generated with deep-links |
| **Output** | Trend dashboard and social content pipeline |

### Phase 3 Exit Criteria Validation

```
/forge --verify-only --all
```

- [ ] First automated weekly digest sent to community
- [ ] Marketing team has produced 2+ pieces using content brief generator
- [ ] Social pipeline producing draft posts for review
- [ ] All Gherkin scenarios in Phase 1–3 contexts pass

---

## Phase 4: Intelligence & Scale (Weeks 13–16)

**Goal:** Add advanced analytics, personalisation, and feedback loops.

### Work Package 4.1 — Personalised Recommendations

**Week 13**

| Item | Detail |
|------|--------|
| **Tasks** | Member interest profile model, viewing history tracking (with consent), recommendation engine (collaborative + content-based), alert system for new content matching interests, opt-in/opt-out management |
| **Gherkin specs** | `specs/features/intelligence/recommendations.feature` |
| **Key scenarios** | Given a member interested in "Infrastructure & Tooling", when new content on MCP servers is published, then they receive an alert within 24 hours; Given a member who has opted out, when recommendations are generated, then they are excluded entirely |
| **Output** | Personalised recommendation engine |

### Work Package 4.2 — Speaker Intelligence & Gap Analysis

**Week 14**

| Item | Detail |
|------|--------|
| **Tasks** | Speaker profile aggregation across all appearances, topic coverage heatmap, expertise area mapping, collaboration pattern detection, gap analysis: uncovered topics, thin coverage areas |
| **Gherkin specs** | `specs/features/intelligence/speaker-intelligence.feature` |
| **Key scenarios** | Given a speaker with 5+ appearances, when their profile is viewed, then topics discussed, positions taken, and collaborators are displayed; Given the full corpus, when gap analysis runs, then topics with fewer than 2 video segments are flagged as under-covered |
| **Output** | Speaker profiles and content gap analysis tools |

### Work Package 4.3 — Contradiction & Evolution Tracking

**Week 15**

| Item | Detail |
|------|--------|
| **Tasks** | Claim comparison across time, position shift detection (same speaker, same topic, different stance), community consensus evolution tracking, visual timeline of how positions evolve |
| **Gherkin specs** | `specs/features/intelligence/evolution-tracking.feature` |
| **Key scenarios** | Given a speaker who said "X is the future" in January and "X has limitations" in March, when evolution tracking runs, then a position shift is flagged with both source timestamps; Given a topic discussed across 10+ videos, when the evolution timeline is viewed, then sentiment and consensus shifts are plotted chronologically |
| **Output** | Contradiction detection and evolution timeline |

### Work Package 4.4 — Feedback Loop & Quality Improvement

**Week 16**

| Item | Detail |
|------|--------|
| **Tasks** | Human review interface for flagged low-confidence extractions, correction submission and knowledge graph update flow, extraction prompt improvement based on correction patterns, precision/recall tracking over time, performance optimization and load testing |
| **Gherkin specs** | `specs/features/intelligence/feedback-loop.feature` |
| **Key scenarios** | Given a low-confidence entity extraction, when a reviewer corrects it, then the knowledge graph is updated and the correction is logged; Given 50+ corrections in a category, when the learning optimizer runs, then extraction prompts are updated and precision improves measurably |
| **Forge command** | `/forge --autonomous --all` (full system validation) |
| **Output** | Human-in-the-loop feedback system, measurably improved extraction quality |

### Phase 4 Exit Criteria Validation

```
/forge --autonomous --all
/forge --chaos --all
/forge --meta-review
```

- [ ] Personalised recommendations served to opted-in members
- [ ] Extraction quality measurably improved from Phase 1 baseline
- [ ] System resilience validated under failure conditions
- [ ] All 7 Forge behavioral gates pass across all contexts

---

## Cross-Phase Concerns

### Provenance Chain

Every fact in the knowledge base must carry:
- Kaltura entry ID
- Timestamp (seconds) for deep-link generation
- Speaker (if identifiable)
- Confidence score
- Extraction date and pipeline version

This is validated by Forge gate checks in every phase.

### Domain Correction Dictionary

Maintained in `data/corrections/` and grown continuously:
- Technical terms: "agentik" → "agentic", "LangChane" → "LangChain"
- Organisation names: proper casing and spelling
- Person names: consistent across appearances

### Security & Privacy

- No PII beyond publicly available speaker information
- Opt-out mechanism for contributors
- API authentication for all endpoints
- Validated by Forge security gate (zero critical/high violations)

---

## Forge Bounded Contexts Summary

```yaml
# forge.contexts.yaml
contexts:
  scaffolding:
    specs: specs/features/scaffolding/
    paths: [src/config/, docs/adr/]
  ingestion:
    specs: specs/features/ingestion/
    paths: [src/ingestion/]
    depends_on: [scaffolding]
  processing:
    specs: specs/features/processing/
    paths: [src/processing/, data/corrections/]
    depends_on: [ingestion]
  extraction:
    specs: specs/features/extraction/
    paths: [src/extraction/, src/graph/]
    depends_on: [processing]
  search:
    specs: specs/features/search/
    paths: [src/search/, src/api/]
    depends_on: [extraction]
  web:
    specs: specs/features/search/web-interface.feature
    paths: [src/web/]
    depends_on: [search]
  content-generation:
    specs: specs/features/content-generation/
    paths: [src/api/content/]
    depends_on: [search]
  intelligence:
    specs: specs/features/intelligence/
    paths: [src/api/intelligence/]
    depends_on: [content-generation]
```

---

## Summary Timeline

| Week | Work Package | Key Deliverable |
|------|-------------|-----------------|
| 1 | 1.1 Scaffolding + ADRs | Configured repo, Forge setup |
| 1–2 | 1.2 Kaltura Ingestion | Video + caption retrieval service |
| 2–3 | 1.3 Transcript Processing | Clean, chunked transcripts |
| 3–4 | 1.4 Entity Extraction | Structured JSON entities |
| 4 | 1.5 Ontology & Graph | Populated knowledge graph |
| 5 | 2.1 Relationship Extraction | Graph edges and co-references |
| 6 | 2.2 Semantic Search | Vector search API |
| 7 | 2.3 Web Interface | Community search + browse app |
| 8 | 2.4 Automated Pipeline | Self-healing ingestion pipeline |
| 9 | 3.1 Weekly Digest | Automated community digests |
| 10 | 3.2 Quote Finder | Soundbite search + export |
| 11 | 3.3 Content Briefs | Marketing content generation |
| 12 | 3.4 Trends + Social | Dashboard + social pipeline |
| 13 | 4.1 Recommendations | Personalised content alerts |
| 14 | 4.2 Speaker Intel + Gaps | Profiles + gap analysis |
| 15 | 4.3 Evolution Tracking | Contradiction detection |
| 16 | 4.4 Feedback Loop | Quality improvement system |
