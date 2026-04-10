# NVIDIA AIQ: Architecture, Scope & Integration Strategy

## How NVIDIA AIQ Works

When you run a query through AIQ, here's what happens end-to-end:

```mermaid
flowchart TD
    subgraph LOCAL["Your Local Machine"]
        USER["You (CLI / Web UI)"]
        AIQ["AIQ Agent<br/>(Python, running locally)"]
        CONFIG["YAML Config<br/>(models, tools, routing)"]
        VENV[".venv<br/>(Python environment)"]
    end

    subgraph NVIDIA_CLOUD["NVIDIA API Catalog (Cloud GPUs)"]
        NIM["NVIDIA NIM<br/>(Neural Inference Microservices)"]
        NEMOTRON_NANO["Nemotron 3 Nano 30B<br/>(Intent + Shallow Research)"]
        GPT_OSS["GPT-OSS 120B<br/>(Deep Research Orchestration)"]
        NEMOTRON_SUPER["Nemotron 3 Super 120B<br/>(Optional Upgrade)"]
    end

    subgraph SEARCH_APIS["External Search APIs"]
        TAVILY["Tavily API<br/>(Web Search)"]
        SERPER["Serper API<br/>(Google Scholar)"]
    end

    USER -->|"Query"| AIQ
    AIQ -->|"Reads"| CONFIG
    AIQ -->|"NVIDIA_API_KEY"| NIM
    NIM --> NEMOTRON_NANO
    NIM --> GPT_OSS
    NIM --> NEMOTRON_SUPER
    AIQ -->|"TAVILY_API_KEY"| TAVILY
    AIQ -->|"SERPER_DEV_API_KEY"| SERPER
    TAVILY -->|"Web Results"| AIQ
    SERPER -->|"Paper Results"| AIQ
    NIM -->|"LLM Response"| AIQ
    AIQ -->|"Citation-backed Answer"| USER

    style LOCAL fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style NVIDIA_CLOUD fill:#76b900,stroke:#333,color:#000
    style SEARCH_APIS fill:#2d3436,stroke:#636e72,color:#e0e0e0
```

## Deep Research Flow (Detailed)

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator as Orchestrator Node
    participant Clarifier as Clarifier Agent
    participant Planner as Planner (GPT-OSS 120B)
    participant Researcher as Researcher (Nemotron)
    participant Tavily as Tavily Web Search
    participant Serper as Serper Papers
    participant NIM as NVIDIA NIM (Cloud GPUs)

    User->>Orchestrator: Complex research query
    Orchestrator->>NIM: Classify intent (Nemotron Nano)
    NIM-->>Orchestrator: Research query, depth=deep

    Orchestrator->>Clarifier: Route to clarifier
    Clarifier->>User: Clarifying questions (scope, depth, focus)
    User->>Clarifier: Responses / "skip"

    Clarifier->>Planner: Generate research plan
    Planner->>NIM: Plan generation (GPT-OSS 120B)
    NIM-->>Planner: 8-section research plan
    Planner->>User: Show plan for approval
    User->>Planner: "approve"

    loop For each research section
        Planner->>Researcher: Research section N
        Researcher->>NIM: Generate search queries (Nemotron)
        NIM-->>Researcher: Search terms

        par Web Search
            Researcher->>Tavily: Search web
            Tavily-->>Researcher: Web results + content
        and Paper Search
            Researcher->>Serper: Search Google Scholar
            Serper-->>Researcher: Academic papers
        end

        Researcher->>NIM: Synthesise findings (Nemotron)
        NIM-->>Researcher: Section draft with citations
    end

    Researcher->>NIM: Final synthesis (GPT-OSS 120B)
    NIM-->>Researcher: Complete report
    Researcher->>User: Full citation-backed research report
```

## Shallow Research Flow

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator as Orchestrator Node
    participant Shallow as Shallow Researcher
    participant NIM as NVIDIA NIM (Cloud GPUs)
    participant Tavily as Tavily Web Search

    User->>Orchestrator: Simple research query
    Orchestrator->>NIM: Classify intent (Nemotron Nano)
    NIM-->>Orchestrator: Research query, depth=shallow

    Orchestrator->>Shallow: Route to shallow researcher
    Shallow->>NIM: Generate search strategy (Nemotron)
    NIM-->>Shallow: Search terms
    Shallow->>Tavily: Web search
    Tavily-->>Shallow: Results with sources
    Shallow->>NIM: Synthesise answer (Nemotron)
    NIM-->>Shallow: Answer with citations
    Shallow->>User: Citation-backed answer (10-30 seconds)
```

## What You're Actually Using

```mermaid
graph LR
    subgraph YOUR_KEYS["Your API Keys"]
        K1["NVIDIA_API_KEY<br/>Access to NVIDIA GPU cloud"]
        K2["TAVILY_API_KEY<br/>Web search"]
        K3["SERPER_DEV_API_KEY<br/>Scholar search"]
    end

    subgraph WHAT_YOU_GET["What You Get Access To"]
        M1["Nemotron 3 Nano 30B<br/>(Fast, efficient)"]
        M2["GPT-OSS 120B<br/>(Powerful orchestrator)"]
        M3["Nemotron 3 Super 120B<br/>(Premium, limited)"]
        M4["Nemotron Mini 4B<br/>(Document summary)"]
        M5["Embedding Models<br/>(RAG / Knowledge)"]
        M6["Vision-Language Models<br/>(Image analysis)"]
    end

    K1 --> M1
    K1 --> M2
    K1 --> M3
    K1 --> M4
    K1 --> M5
    K1 --> M6

    style YOUR_KEYS fill:#1a1a2e,stroke:#e0e0e0,color:#e0e0e0
    style WHAT_YOU_GET fill:#76b900,stroke:#333,color:#000
```

## Your Current AI Toolkit Landscape

```mermaid
graph TB
    subgraph CURRENT["Your Current Subscriptions"]
        CC["Claude Code<br/>(Anthropic)<br/>Code generation, reasoning<br/>prototyping, pair programming"]
        GEM["Gemini<br/>(Google)<br/>Multimodal, long context<br/>Google ecosystem integration"]
    end

    subgraph NVIDIA_NEW["NVIDIA (New Addition)"]
        AIQ_TOOL["NVIDIA AIQ<br/>Deep research agent<br/>Citation-backed reports<br/>Multi-source synthesis"]
        NIM_ACCESS["NVIDIA NIM Models<br/>Nemotron family<br/>GPT-OSS 120B<br/>Embedding + Vision models"]
    end

    subgraph USE_CASES["How to Use Each"]
        UC1["Prototyping & Coding<br/>→ Claude Code"]
        UC2["Multimodal Analysis<br/>→ Gemini"]
        UC3["Deep Research & Reports<br/>→ NVIDIA AIQ"]
        UC4["Inference at Scale<br/>→ NVIDIA NIM"]
        UC5["RAG / Knowledge Systems<br/>→ NVIDIA NIM + AIQ"]
    end

    CC --> UC1
    GEM --> UC2
    AIQ_TOOL --> UC3
    NIM_ACCESS --> UC4
    NIM_ACCESS --> UC5

    style CURRENT fill:#2d3436,stroke:#636e72,color:#e0e0e0
    style NVIDIA_NEW fill:#76b900,stroke:#333,color:#000
    style USE_CASES fill:#0a3d62,stroke:#3c6382,color:#e0e0e0
```

## NVIDIA API Key: What Access Do You Get?

### Rate Limits and Throttling

The NVIDIA API Catalog (build.nvidia.com) provides access to models hosted on NVIDIA's GPU infrastructure. Key points:

| Aspect | Details |
|--------|---------|
| **Free Tier** | Typically 1,000 API calls/month for most models |
| **Rate Limits** | Varies by model; Nemotron Nano is more available than Super |
| **Throttling** | Yes, there are rate limits but they are generous for exploration |
| **Cost** | Free tier available; pay-as-you-go for higher volumes |
| **GPU Backend** | NVIDIA hosts the GPUs -- you don't need your own |
| **Nemotron Super** | Limited availability due to high demand |
| **GPT-OSS 120B** | Available but may have queue times |

### Comparison with Your Other Subscriptions

| Provider | What You Pay | What You Get | Best For |
|----------|-------------|--------------|----------|
| **Claude Code** | Subscription | Claude models, code tools, CLI | Coding, prototyping, pair programming |
| **Gemini** | Subscription | Gemini models, Google integration | Multimodal, long documents, Google ecosystem |
| **NVIDIA** | API Key (free tier) | Multiple models, GPU inference | Research, inference, RAG, production deployment |

### Key Insight: NVIDIA Complements, Not Replaces

NVIDIA's value proposition is different from Claude/Gemini:

1. **Claude Code** = Your primary coding assistant (generates, edits, debugs code)
2. **Gemini** = Your multimodal assistant (images, long docs, Google integration)
3. **NVIDIA AIQ** = Your research engine (deep research, citations, reports)
4. **NVIDIA NIM** = Your inference backbone (deploy models at scale, RAG, embeddings)

## How to Maximise NVIDIA Capabilities

```mermaid
graph TD
    subgraph IMMEDIATE["Immediate Value (Today)"]
        I1["Use AIQ for research queries<br/>before starting any project"]
        I2["Use AIQ for competitive analysis<br/>and market research"]
        I3["Use AIQ for technical documentation<br/>with academic citations"]
    end

    subgraph MEDIUM["Medium-Term Integration"]
        M1["Build RAG pipelines<br/>using NVIDIA embeddings"]
        M2["Add AIQ as research layer<br/>in your prototypes"]
        M3["Use NIM for inference<br/>in production apps"]
    end

    subgraph ADVANCED["Advanced Integration"]
        A1["Custom agents using<br/>NeMo Agent Toolkit"]
        A2["Multi-model pipelines<br/>Claude + Gemini + NVIDIA"]
        A3["Deploy NIM containers<br/>for private inference"]
    end

    I1 --> M1
    I2 --> M2
    I3 --> M3
    M1 --> A1
    M2 --> A2
    M3 --> A3

    style IMMEDIATE fill:#27ae60,stroke:#333,color:#fff
    style MEDIUM fill:#f39c12,stroke:#333,color:#fff
    style ADVANCED fill:#e74c3c,stroke:#333,color:#fff
```

## Practical Integration Examples

### Example 1: Research-Driven Prototyping
```
1. Use NVIDIA AIQ to research a topic deeply (citations, papers)
2. Use Claude Code to build the prototype based on AIQ's findings
3. Use Gemini for any multimodal aspects (image analysis, etc.)
4. Use NVIDIA NIM for the inference layer in production
```

### Example 2: Trading System Enhancement
```
1. AIQ researches latest trading strategies (academic papers + web)
2. Claude Code implements the strategy in your neural trader
3. NVIDIA NIM provides low-latency inference for real-time decisions
```

### Example 3: Knowledge System
```
1. NVIDIA embedding models index your documents
2. AIQ provides research capability on top of your knowledge base
3. Claude Code builds the UI and integration layer
4. Gemini handles any multimodal document analysis
```

## Scope of This Tinkering Activity

```mermaid
graph LR
    subgraph DONE["Completed"]
        D1["Environment setup"]
        D2["API key configuration"]
        D3["Code modification<br/>(SERPER_DEV_API_KEY)"]
        D4["Shallow research tested"]
        D5["Deep research tested"]
    end

    subgraph IN_PROGRESS["In Progress"]
        P1["Deep research output<br/>analysis"]
        P2["Architecture<br/>documentation"]
        P3["Integration<br/>strategy"]
    end

    subgraph TODO["Next"]
        T1["Paper search testing"]
        T2["Web UI exploration"]
        T3["Benchmark runs<br/>(drb1/drb2)"]
        T4["Custom workflow<br/>creation"]
        T5["Integration with<br/>existing projects"]
    end

    D1 --> P1
    D4 --> P2
    D5 --> P3
    P1 --> T1
    P2 --> T2
    P3 --> T3
    T3 --> T4
    T4 --> T5

    style DONE fill:#27ae60,stroke:#333,color:#fff
    style IN_PROGRESS fill:#f39c12,stroke:#333,color:#fff
    style TODO fill:#3498db,stroke:#333,color:#fff
```
