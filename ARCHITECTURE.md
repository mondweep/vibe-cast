# Video Content Ontology — Architecture

## 1. High-Level System Architecture

The system operates as a five-stage pipeline that transforms raw video content from Kaltura into structured, queryable knowledge served through multiple application channels.

```mermaid
graph TB
    subgraph External["External Systems"]
        K[("Kaltura Platform<br/>video.agentics.org")]
        LLM["Claude API<br/>(Anthropic)"]
    end

    subgraph Pipeline["Processing Pipeline"]
        direction TB
        ING["1. Ingestion<br/>Service"]
        TP["2. Transcript<br/>Processing"]
        EXT["3. Entity & Relationship<br/>Extraction"]
        ONT["4. Ontology Mapping<br/>& Enrichment"]
    end

    subgraph Storage["Data Layer"]
        NEO[("Neo4j<br/>Knowledge Graph")]
        VEC[("Vector Store<br/>pgvector")]
        OBJ[("Object Store<br/>Raw Transcripts")]
    end

    subgraph Apps["Application Layer"]
        API["REST / GraphQL API"]
        WEB["React Web App"]
        DIG["Digest Generator"]
        SOC["Social Pipeline"]
    end

    subgraph Consumers["Consumers"]
        COM["Community Members"]
        MKT["Marketing Team"]
        INT["Internal Teams"]
    end

    K -- "MCP / API" --> ING
    ING --> TP
    TP --> EXT
    EXT -- "Claude API" --> LLM
    LLM -- "Structured JSON" --> EXT
    EXT --> ONT
    ONT --> NEO
    ONT --> VEC
    ING --> OBJ

    NEO --> API
    VEC --> API
    API --> WEB
    API --> DIG
    API --> SOC

    WEB --> COM
    DIG --> COM
    SOC --> MKT
    API --> INT

    style External fill:#f0f4ff,stroke:#4a6fa5
    style Pipeline fill:#fff8e1,stroke:#f9a825
    style Storage fill:#e8f5e9,stroke:#43a047
    style Apps fill:#fce4ec,stroke:#e53935
    style Consumers fill:#f3e5f5,stroke:#8e24aa
```

---

## 2. Data Flow Architecture

End-to-end data flow from video publication to user-facing output.

```mermaid
flowchart LR
    subgraph Ingest["Stage 1: Ingestion"]
        V["New Video<br/>Published"] --> POLL["Scheduled<br/>Poller"]
        POLL --> META["Fetch<br/>Metadata"]
        POLL --> SRT["Fetch<br/>SRT Captions"]
        META --> RAW["Raw Video<br/>Record"]
        SRT --> RAW
    end

    subgraph Process["Stage 2: Processing"]
        RAW --> PARSE["SRT<br/>Parser"]
        PARSE --> CHUNK["Chunk<br/>Merger<br/>(~45s)"]
        CHUNK --> CORRECT["Terminology<br/>Correction"]
        CORRECT --> DIAR["Speaker<br/>Diarisation"]
        DIAR --> CLEAN["Clean<br/>Chunks"]
    end

    subgraph Extract["Stage 3: Extraction"]
        CLEAN --> ENT["Entity<br/>Extraction"]
        CLEAN --> REL["Relationship<br/>Extraction"]
        CLEAN --> CLM["Claim<br/>Extraction"]
        ENT --> JSON["Structured<br/>JSON"]
        REL --> JSON
        CLM --> JSON
    end

    subgraph Map["Stage 4: Mapping"]
        JSON --> DEDUP["Deduplication<br/>& Co-ref"]
        DEDUP --> MERGE["Graph<br/>Merge"]
        DEDUP --> EMBED["Vector<br/>Embedding"]
        MERGE --> KG[("Knowledge<br/>Graph")]
        EMBED --> VS[("Vector<br/>Store")]
    end

    subgraph Serve["Stage 5: Applications"]
        KG --> SEARCH["Semantic<br/>Search"]
        VS --> SEARCH
        KG --> DIGEST["Weekly<br/>Digest"]
        KG --> BRIEF["Content<br/>Brief"]
        KG --> TREND["Trend<br/>Analysis"]
    end

    style Ingest fill:#e3f2fd,stroke:#1565c0
    style Process fill:#fff3e0,stroke:#ef6c00
    style Extract fill:#f3e5f5,stroke:#7b1fa2
    style Map fill:#e8f5e9,stroke:#2e7d32
    style Serve fill:#fce4ec,stroke:#c62828
```

---

## 3. Ontology Schema (Entity-Relationship Diagram)

The core domain model — 8 entity types and 9 relationship types.

```mermaid
erDiagram
    Person {
        string name
        string role
        string organisation
        string[] expertise_areas
        string kaltura_contributor_id
    }

    Organisation {
        string name
        string type
        string domain
        string website
        string foundation_relationship
    }

    Technology {
        string name
        string version
        string category
        string maturity_level
        string licence
    }

    Concept {
        string name
        string definition
        string[] related_concepts
        date first_mentioned
    }

    Event {
        string title
        date date
        int duration_seconds
        string[] participants
        string kaltura_entry_id
        string format
    }

    Topic {
        string name
        string parent_topic
        string description
    }

    Claim {
        string statement
        string speaker
        int timestamp
        float confidence
        string evidence_cited
    }

    Demo {
        string title
        string technology
        int start_timestamp
        int end_timestamp
        string speaker
        string outcome
    }

    Person ||--o{ Concept : "DISCUSSES"
    Person ||--o{ Technology : "DISCUSSES"
    Person ||--o{ Technology : "DEMONSTRATES"
    Person ||--o{ Organisation : "AFFILIATED_WITH"
    Person ||--o{ Claim : "ASSERTS"
    Concept ||--o{ Concept : "BUILDS_ON"
    Technology ||--o{ Technology : "DEPENDS_ON"
    Topic ||--o{ Topic : "PART_OF"
    Claim ||--o{ Claim : "RESPONDS_TO"
    Person ||--o{ Event : "FEATURED_IN"
    Organisation ||--o{ Event : "FEATURED_IN"
    Technology ||--o{ Event : "FEATURED_IN"
    Concept ||--o{ Event : "FEATURED_IN"
    Demo ||--o{ Event : "FEATURED_IN"
```

---

## 4. Component Architecture (Low-Level)

Detailed breakdown of each service, its responsibilities, and interfaces.

```mermaid
graph TB
    subgraph Ingestion["Ingestion Service"]
        KClient["Kaltura API Client"]
        MCPClient["Kaltura MCP Client"]
        Scheduler["Cron Scheduler"]
        MetaStore["Metadata Store"]

        Scheduler --> KClient
        Scheduler --> MCPClient
        KClient --> MetaStore
        MCPClient --> MetaStore
    end

    subgraph Processing["Transcript Processing"]
        SRTParser["SRT Parser"]
        ChunkMerger["Chunk Merger"]
        TermCorrector["Term Corrector"]
        DictStore[("Correction<br/>Dictionary")]
        Diariser["Speaker Diariser"]

        SRTParser --> ChunkMerger
        ChunkMerger --> TermCorrector
        DictStore --> TermCorrector
        TermCorrector --> Diariser
    end

    subgraph Extraction["Extraction Engine"]
        PromptMgr["Prompt Manager"]
        EntityExt["Entity Extractor"]
        RelExt["Relationship Extractor"]
        ClaimExt["Claim Extractor"]
        ConfScore["Confidence Scorer"]
        JSONOut["JSON Serialiser"]

        PromptMgr --> EntityExt
        PromptMgr --> RelExt
        PromptMgr --> ClaimExt
        EntityExt --> ConfScore
        RelExt --> ConfScore
        ClaimExt --> ConfScore
        ConfScore --> JSONOut
    end

    subgraph GraphLayer["Knowledge Graph Layer"]
        Dedup["Deduplicator"]
        CoRef["Co-reference Resolver"]
        GraphWriter["Graph Writer"]
        EmbedGen["Embedding Generator"]
        IndexWriter["Index Writer"]

        Dedup --> CoRef
        CoRef --> GraphWriter
        CoRef --> EmbedGen
        EmbedGen --> IndexWriter
    end

    subgraph APILayer["API Layer"]
        GQL["GraphQL Resolver"]
        REST["REST Controllers"]
        SearchSvc["Search Service"]
        AuthN["Authentication"]

        AuthN --> GQL
        AuthN --> REST
        GQL --> SearchSvc
        REST --> SearchSvc
    end

    MetaStore --> SRTParser
    Diariser --> PromptMgr
    JSONOut --> Dedup
    GraphWriter --> NEO4J[("Neo4j")]
    IndexWriter --> PGVEC[("pgvector")]
    NEO4J --> GQL
    PGVEC --> SearchSvc

    CLAUDE["Claude API"] <--> EntityExt
    CLAUDE <--> RelExt
    CLAUDE <--> ClaimExt

    style Ingestion fill:#e3f2fd,stroke:#1565c0
    style Processing fill:#fff3e0,stroke:#ef6c00
    style Extraction fill:#f3e5f5,stroke:#7b1fa2
    style GraphLayer fill:#e8f5e9,stroke:#2e7d32
    style APILayer fill:#fce4ec,stroke:#c62828
```

---

## 5. Semantic Search Architecture

How natural language queries are resolved against both the vector store and knowledge graph.

```mermaid
flowchart TB
    USER["User Query<br/>'What has the foundation discussed about medical AI?'"]

    USER --> EMBED_Q["Query<br/>Embedding"]
    EMBED_Q --> VEC_SEARCH["Vector Similarity<br/>Search (pgvector)"]
    VEC_SEARCH --> CHUNKS["Top-K Relevant<br/>Transcript Chunks"]

    USER --> NER["Named Entity<br/>Recognition"]
    NER --> GRAPH_Q["Cypher Query<br/>Builder"]
    GRAPH_Q --> NEO["Neo4j<br/>Graph Traversal"]
    NEO --> ENTITIES["Related Entities<br/>& Relationships"]

    CHUNKS --> FUSE["Result Fusion<br/>& Ranking"]
    ENTITIES --> FUSE

    FUSE --> ENRICH["Provenance<br/>Enrichment"]
    ENRICH --> DEEP["Deep-Link<br/>URL Generator"]
    DEEP --> RESPONSE["Search Response<br/>- Timestamped segments<br/>- Speaker attribution<br/>- Relevance scores<br/>- Kaltura deep-links"]

    style USER fill:#e1f5fe,stroke:#0277bd
    style FUSE fill:#fff9c4,stroke:#f9a825
    style RESPONSE fill:#c8e6c9,stroke:#2e7d32
```

---

## 6. Deployment Architecture

Infrastructure topology for production deployment.

```mermaid
graph TB
    subgraph CDN["CDN / Edge"]
        CF["Cloudflare"]
    end

    subgraph Compute["Compute Layer"]
        subgraph WebTier["Web Tier"]
            REACT["React App<br/>(Static)"]
        end

        subgraph AppTier["Application Tier"]
            API1["API Server 1"]
            API2["API Server 2"]
            LB["Load Balancer"]
            LB --> API1
            LB --> API2
        end

        subgraph Workers["Background Workers"]
            ING_W["Ingestion<br/>Worker"]
            PROC_W["Processing<br/>Worker"]
            EXT_W["Extraction<br/>Worker"]
            DIG_W["Digest<br/>Worker"]
        end
    end

    subgraph Data["Data Layer"]
        NEO4J_P[("Neo4j<br/>Primary")]
        NEO4J_R[("Neo4j<br/>Read Replica")]
        PG[("PostgreSQL<br/>+ pgvector")]
        REDIS[("Redis<br/>Cache")]
        S3[("Object Store<br/>Transcripts")]
    end

    subgraph External["External Services"]
        KALTURA["Kaltura API"]
        CLAUDE_API["Claude API"]
        SMTP["Email Service"]
    end

    CF --> REACT
    CF --> LB

    API1 --> NEO4J_R
    API2 --> NEO4J_R
    API1 --> PG
    API2 --> PG
    API1 --> REDIS
    API2 --> REDIS

    ING_W --> KALTURA
    ING_W --> S3
    PROC_W --> S3
    EXT_W --> CLAUDE_API
    EXT_W --> NEO4J_P
    EXT_W --> PG
    DIG_W --> NEO4J_R
    DIG_W --> SMTP

    NEO4J_P --> NEO4J_R

    style CDN fill:#e1f5fe,stroke:#0277bd
    style Compute fill:#fff8e1,stroke:#f9a825
    style Data fill:#e8f5e9,stroke:#2e7d32
    style External fill:#f3e5f5,stroke:#8e24aa
```

---

## 7. Provenance & Temporal Data Model

Every fact carries a full provenance chain back to its source video moment.

```mermaid
graph LR
    FACT["Knowledge Fact<br/>(Entity / Relationship / Claim)"]

    FACT --> PROV["Provenance Record"]

    PROV --> VID["Kaltura Entry ID<br/>e.g. 1_abc123"]
    PROV --> TS["Timestamp<br/>e.g. 1847 seconds"]
    PROV --> SPK["Speaker<br/>e.g. 'Jane Doe'"]
    PROV --> CONF["Confidence<br/>e.g. 0.92"]
    PROV --> PIPE["Pipeline Version<br/>e.g. v1.3.0"]
    PROV --> DATE["Extraction Date<br/>e.g. 2026-03-15"]

    TS --> LINK["Deep-Link URL<br/>video.agentics.org/media/...?st=1847"]
    TS --> THUMB["Thumbnail URL<br/>/thumbnail/entry_id/.../vid_sec/1847"]

    style FACT fill:#e8eaf6,stroke:#3f51b5
    style PROV fill:#fff3e0,stroke:#ef6c00
    style LINK fill:#c8e6c9,stroke:#2e7d32
    style THUMB fill:#c8e6c9,stroke:#2e7d32
```

---

## 8. Feedback Loop Architecture

Human corrections improve extraction quality over time.

```mermaid
flowchart TB
    subgraph Extraction["Automated Extraction"]
        LLM_EXT["LLM Extraction<br/>(Claude API)"]
        CONF["Confidence<br/>Scoring"]
        LLM_EXT --> CONF
    end

    CONF -->|"≥ 0.85"| AUTO["Auto-Accept<br/>→ Knowledge Graph"]
    CONF -->|"0.70 – 0.84"| FLAG["Flagged for<br/>Review"]
    CONF -->|"< 0.70"| REJECT["Auto-Reject<br/>→ Review Queue"]

    FLAG --> REVIEW["Human Review<br/>Interface"]
    REJECT --> REVIEW

    REVIEW -->|"Approved"| KG[("Knowledge<br/>Graph")]
    REVIEW -->|"Corrected"| CORRECTION["Correction<br/>Log"]
    REVIEW -->|"Rejected"| DISCARD["Discarded"]

    AUTO --> KG

    CORRECTION --> LEARN["Learning<br/>Optimizer"]
    LEARN --> PROMPTS["Updated<br/>Extraction Prompts"]
    PROMPTS --> LLM_EXT

    LEARN --> METRICS["Precision / Recall<br/>Tracking"]

    style Extraction fill:#f3e5f5,stroke:#7b1fa2
    style REVIEW fill:#fff3e0,stroke:#ef6c00
    style KG fill:#e8f5e9,stroke:#2e7d32
    style LEARN fill:#e3f2fd,stroke:#1565c0
```

---

## 9. Technology Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Knowledge Graph** | Neo4j | Native typed relationships, Cypher maps to ontology queries, mature ecosystem |
| **Vector Store** | pgvector (PostgreSQL) | Co-locate with relational data, avoid extra infrastructure, good enough for scale |
| **LLM** | Claude API (Anthropic) | Strong structured output, entity extraction, summarisation quality |
| **Frontend** | React | Wide talent pool, component ecosystem, SSR options |
| **API** | GraphQL (primary) + REST (simple endpoints) | GraphQL suits graph-shaped data; REST for webhooks and simple integrations |
| **Orchestration** | Custom pipeline with retry/DLQ | Simpler than n8n for this workload; can migrate later if needed |
| **Cache** | Redis | Session cache, query result cache, rate limiting |
| **Deployment** | Containerised (Docker) on cloud VMs | Predictable costs, straightforward ops, no vendor lock-in |

---

## 10. Architectural Decisions & Trade-offs

### Monolith-First, Extract Later

The initial build is a modular monolith — all services in one deployable unit with clear module boundaries. This minimises infrastructure complexity in Phases 1–2. If scaling demands arise in Phase 4, individual modules (e.g., the extraction engine) can be extracted into standalone services.

### Dual Query Path (Graph + Vector)

Search queries hit both Neo4j (structured graph traversal) and pgvector (semantic similarity) in parallel. Results are fused and ranked. This hybrid approach ensures both precise entity lookups and fuzzy natural language queries return high-quality results.

### Confidence-Gated Ingestion

Rather than requiring human review of all extractions, the system uses confidence thresholds to auto-accept high-confidence results and only route low-confidence items to review. This keeps the pipeline flowing while maintaining quality.
