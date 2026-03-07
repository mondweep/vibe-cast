# Implementation Plan

## Competitive Analysis AI Agent

**Version**: 1.0
**Date**: 2026-03-07

---

## Overview

This plan breaks the implementation into 5 phases, each delivering a working increment. Each phase builds on the previous one and can be validated independently.

### Testing Approach: London School TDD

Every phase follows **test-first development**. For each module:
1. **Red**: Write a failing test with mocked collaborators
2. **Green**: Implement the minimum code to pass
3. **Refactor**: Clean up while keeping tests green

All external services (DuckDuckGo, LLM APIs, web scraping, file I/O) are mocked. **No API keys are needed to run `pytest`.** Integration tests requiring real API keys are marked with `@pytest.mark.integration` and skipped by default.

```mermaid
gantt
    title Implementation Phases
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Phase 1 - Foundation
    Project scaffolding + test infra :p1a, 2026-03-07, 1d
    MCP server skeleton           :p1b, after p1a, 1d
    TDD: Search + scraper utils   :p1c, after p1a, 1d
    TDD: LLM client layer         :p1d, after p1a, 2d

    section Phase 2 - Core Tools
    TDD: validate_company         :p2a, after p1b, 1d
    TDD: identify_sector          :p2b, after p2a, 1d
    TDD: find_competitors         :p2c, after p2b, 1d

    section Phase 3 - Data Collection
    TDD: browse_company tool      :p3a, after p2c, 2d
    Test suite verification       :p3b, after p3a, 1d

    section Phase 4 - Report & Agent
    Report template               :p4a, after p3b, 1d
    TDD: generate_report tool     :p4b, after p4a, 1d
    TDD: Agent loop (multi-prov)  :p4c, after p4b, 1d
    Full test suite green         :p4d, after p4c, 1d

    section Phase 5 - Polish
    CLI entry point               :p5a, after p4d, 1d
    Error handling & edge cases   :p5b, after p5a, 1d
    Documentation                 :p5c, after p5b, 1d
```

---

## Phase 1: Project Foundation

**Goal**: Set up the project structure, dependencies, and shared utilities.

### Tasks

| # | Task | Output |
|---|------|--------|
| # | Task | Output |
|---|------|--------|
| 1.1 | Create project directory structure (including `agent/llm/`, `tests/`) | All folders and `__init__.py` files |
| 1.2 | Create `requirements.txt` with all dependencies (multi-provider + testing) | `requirements.txt` |
| 1.3 | Create `.env.example` with multi-provider configuration template | `.env.example` |
| 1.4 | Create `pytest.ini` and `tests/conftest.py` with shared fixtures | Test infrastructure ready |
| 1.5 | **TDD**: Write tests for `search.py` (mock `DDGS`) → implement `server/utils/search.py` with rate limiting | `test_search.py` passes, `web_search()` works |
| 1.6 | **TDD**: Write tests for `scraper.py` (mock `httpx`, `trafilatura`) → implement `server/utils/scraper.py` | `test_scraper.py` passes, `scrape_url()` works |
| 1.7 | Create bare FastMCP server in `server/mcp_server.py` | Server starts and responds to tool listing |
| 1.8 | Implement `agent/llm/base.py` — abstract `LLMClient` interface | Base class with `chat()`, `extract_tool_calls()`, `extract_text()`, `format_tool_result()` |
| 1.9 | **TDD**: Write tests for `GeminiClient` (mock `google.genai`) → implement `agent/llm/gemini_client.py` | `test_llm_clients.py::TestGemini*` passes |
| 1.10 | **TDD**: Write tests for `AnthropicClient` (mock `anthropic`) → implement `agent/llm/anthropic_client.py` | `test_llm_clients.py::TestAnthropic*` passes |
| 1.11 | **TDD**: Write tests for `OpenAIClient` (mock `openai`) → implement `agent/llm/openai_client.py` | `test_llm_clients.py::TestOpenAI*` passes |
| 1.12 | **TDD**: Write tests for provider factory → implement `agent/llm/__init__.py` | `test_llm_clients.py::TestFactory*` passes |

### Deliverables
- Project runs `pip install -r requirements.txt` without errors
- `pytest` runs and all Phase 1 tests pass (mocked, no API keys)
- `search.py` rate limiter prevents burst requests
- `scraper.py` handles timeouts and extraction failures
- MCP server starts and lists zero tools
- `get_llm_client("gemini")` returns a working `GeminiClient` instance
- Each LLM client correctly converts MCP tool schemas to provider format

### Architecture at end of Phase 1

```mermaid
graph TB
    subgraph Implemented
        MCP[FastMCP Server<br/>empty shell]
        S[search.py]
        W[scraper.py]
        LLM[LLM Client Layer<br/>Gemini / Claude / OpenAI]
    end

    subgraph Not Yet
        T1[validate_company]
        T2[identify_sector]
        T3[find_competitors]
        T4[browse_company]
        T5[generate_report]
        AG[Agent Loop]
    end

    style T1 fill:#ddd,stroke:#999,color:#999
    style T2 fill:#ddd,stroke:#999,color:#999
    style T3 fill:#ddd,stroke:#999,color:#999
    style T4 fill:#ddd,stroke:#999,color:#999
    style T5 fill:#ddd,stroke:#999,color:#999
    style AG fill:#ddd,stroke:#999,color:#999
```

---

## Phase 2: Core Discovery Tools

**Goal**: Implement the first three tools that form the discovery pipeline.

### Coding Standards for All MCP Tools

Every MCP tool function **must** include a clear, descriptive Python docstring. FastMCP uses these docstrings as the tool descriptions that Claude sees during tool discovery, so they directly affect how well the agent calls the tools.

Each docstring must include:
- **Summary line**: What the tool does in one sentence
- **Args section**: Each parameter with its type and purpose
- **Returns section**: Structure of the returned data
- **Raises/Notes section** (where applicable): Error conditions or important behavior

Example:

```python
@mcp.tool()
async def validate_company(company_name: str) -> dict:
    """Validate that a company is a real, identifiable entity.

    Searches the web for the given company name and confirms it exists.
    Returns the canonical company name, official domain, and a brief description.

    Args:
        company_name: The name of the company to validate (free-text input).

    Returns:
        A dict with keys:
            - name (str): Canonical company name.
            - domain (str): Official website domain.
            - description (str): Brief company description.
            - valid (bool): Whether the company was found.
            - suggestions (list[str]): Alternative names if validation failed.
    """
```

This standard applies to **all tools across Phase 2, 3, and 4**.

### Tasks

| # | Task | Output |
|---|------|--------|
| 2.1 | **TDD**: Write tests for `validate_company` (mock `web_search`) → implement tool | `test_validate_company.py` passes |
| 2.2 | **TDD**: Write tests for `identify_sector` (mock `web_search`) → implement tool | `test_identify_sector.py` passes |
| 2.3 | **TDD**: Write tests for `find_competitors` (mock `web_search`) → implement tool | `test_find_competitors.py` passes |
| 2.4 | Register all three tools in `mcp_server.py` | MCP server lists 3 tools with correct descriptions |
| 2.5 | Verify `pytest` — all Phase 1 + Phase 2 tests pass | Full green test suite |

### Validation Criteria
- `validate_company("OpenAI")` returns `{ name: "OpenAI", domain: "openai.com", valid: true, ... }`
- `validate_company("xyznotacompany123")` returns `{ valid: false, suggestions: [...] }`
- `identify_sector("OpenAI", "openai.com")` returns a sector containing "artificial intelligence" or similar
- `find_competitors("OpenAI", "Artificial Intelligence")` returns 3 relevant competitors (e.g., Anthropic, Google DeepMind, etc.)

### Tool interaction flow

```mermaid
sequenceDiagram
    participant T as Tester
    participant M as MCP Server
    participant S as DuckDuckGo

    T->>M: validate_company("Stripe")
    M->>S: search "Stripe company"
    S->>M: search results
    M->>T: { name: "Stripe", domain: "stripe.com", valid: true }

    T->>M: identify_sector("Stripe", "stripe.com")
    M->>S: search "Stripe industry sector"
    S->>M: search results
    M->>T: { sector: "Financial Technology", sub_sector: "Payments" }

    T->>M: find_competitors("Stripe", "Financial Technology")
    M->>S: search "Stripe competitors"
    S->>M: search results
    M->>T: { competitors: [Square, Adyen, PayPal] }
```

---

## Phase 3: Data Collection Tool

**Goal**: Implement the `browse_company` tool — the most complex tool in the system.

### Tasks

| # | Task | Output |
|---|------|--------|
| 3.1 | **TDD**: Write tests for category-specific query builders → implement | `test_browse_company.py::TestQueryBuilders` passes |
| 3.2 | **TDD**: Write tests for content extraction pipeline (mock `web_search`, `scrape_url`) → implement | `test_browse_company.py::TestExtraction` passes |
| 3.3 | **TDD**: Write tests for partial failure handling → implement `browse_company` tool | `test_browse_company.py::TestPartialFailure` passes |
| 3.4 | Register tool in `mcp_server.py` | MCP server lists 4 tools |
| 3.5 | Verify `pytest` — all Phase 1-3 tests pass | Full green test suite |

### Validation Criteria
- `browse_company("Stripe", "stripe.com", ["pricing", "products"])` returns structured data for both categories
- If one category fails, the tool still returns data for the other categories with a `categories_failed` field
- Scraping respects the 15-second timeout per request

### Data collection detail

```mermaid
flowchart TD
    BC[browse_company called] --> CATS{For each category}

    CATS -->|pricing| Q1[Search: 'Stripe pricing plans 2026']
    CATS -->|products| Q2[Search: 'Stripe products services']
    CATS -->|marketing| Q3[Search: 'Stripe marketing strategy brand']
    CATS -->|market_position| Q4[Search: 'Stripe market share position']

    Q1 --> S1[Top 3 URLs]
    Q2 --> S2[Top 3 URLs]
    Q3 --> S3[Top 3 URLs]
    Q4 --> S4[Top 3 URLs]

    S1 --> SC1[Scrape & extract]
    S2 --> SC2[Scrape & extract]
    S3 --> SC3[Scrape & extract]
    S4 --> SC4[Scrape & extract]

    SC1 --> AGG[Aggregate results]
    SC2 --> AGG
    SC3 --> AGG
    SC4 --> AGG

    AGG --> OUT[Return structured data<br/>+ categories_failed list]
```

---

## Phase 4: Report Generation & Agent Loop

**Goal**: Complete the tool set with report generation and build the agent client.

### Tasks

| # | Task | Output |
|---|------|--------|
| 4.1 | Create Jinja2 report template in `templates/report.md.j2` | Template with placeholders for all report sections |
| 4.2 | **TDD**: Write tests for `generate_report` (mock file I/O) → implement tool | `test_generate_report.py` passes |
| 4.3 | Register tool in `mcp_server.py` | MCP server lists 5 tools |
| 4.4 | **TDD**: Write tests for agent loop (mock `LLMClient` + MCP) → implement `agent/client.py` | `test_agent_loop.py` passes |
| 4.5 | Write system prompt for the agent | System prompt that guides the LLM through the analysis workflow (works across all providers) |
| 4.6 | Verify `pytest` — all Phase 1-4 tests pass | Full green test suite |
| 4.7 | `@pytest.mark.integration`: End-to-end test with Gemini (requires `GOOGLE_API_KEY`) | Complete report generated (opt-in) |

### Report template structure

```
# Competitive Analysis Report: {company_name}

## Executive Summary
## Company Overview
## Competitor Profiles
### Competitor 1 / 2 / 3
## Comparison Matrix
| Category | Target | Comp 1 | Comp 2 | Comp 3 |
## SWOT Analysis
## Recommendations
## Data Sources & Timestamps
```

### Agent loop design

```mermaid
flowchart TD
    START([Start]) --> PROV[Load LLM_PROVIDER from .env]
    PROV --> FACTORY[get_llm_client provider]
    FACTORY --> INIT[Initialize MCP client<br/>Connect to server<br/>Discover tools]
    INIT --> CONVERT[Convert MCP tools to<br/>provider tool format]
    CONVERT --> SEND[Send system prompt +<br/>user message via LLMClient.chat]
    SEND --> CHECK{extract_tool_calls<br/>returns any?}

    CHECK -->|Yes| EXEC[Execute tool calls<br/>via MCP]
    EXEC --> FMT[format_tool_result<br/>for provider]
    FMT --> APPEND[Append to conversation]
    APPEND --> SEND

    CHECK -->|No| DONE[extract_text<br/>Print summary]
    DONE --> END([End])
```

### Validation Criteria
- Report template renders correctly with sample data
- Agent successfully orchestrates all 5 tools in sequence using Gemini (default)
- Full end-to-end run produces a markdown report in `output/`
- Agent handles tool errors gracefully (continues with partial data)
- Switching `LLM_PROVIDER=anthropic` or `LLM_PROVIDER=openai` produces equivalent results

---

## Phase 5: CLI, Error Handling & Polish

**Goal**: Make the system production-ready with a proper CLI, robust error handling, and documentation.

### Tasks

| # | Task | Output |
|---|------|--------|
| 5.1 | Implement CLI entry point in `main.py` | `python main.py "Company Name"` works |
| 5.2 | Add comprehensive error handling across all tools | Retries, timeouts, graceful degradation |
| 5.3 | Add logging throughout the pipeline | Structured logging with configurable verbosity |
| 5.4 | Create `.gitignore` | Excludes `.env`, `output/`, `__pycache__/`, etc. |
| 5.5 | Create `README.md` with setup and usage instructions | Complete setup guide |
| 5.6 | Full end-to-end validation with 3 different companies | Verified reports for diverse company types |

### CLI flow

```mermaid
flowchart TD
    START([python main.py 'Stripe']) --> ENV{.env exists?}
    ENV -->|No| ERR1[Error: Create .env<br/>from .env.example]
    ENV -->|Yes| PROV[Read LLM_PROVIDER<br/>default: gemini]
    PROV --> KEY{API key set for<br/>selected provider?}
    KEY -->|No| ERR2[Error: Set GOOGLE_API_KEY<br/>or ANTHROPIC_API_KEY<br/>or OPENAI_API_KEY]
    KEY -->|Yes| RUN[Launch MCP Server<br/>Initialize LLM Client<br/>Start Agent Loop]
    RUN --> PROG[Show progress:<br/>Using Gemini 2.5 Flash...<br/>Validating company...<br/>Identifying sector...<br/>Finding competitors...<br/>Researching companies...<br/>Generating report...]
    PROG --> DONE[Report saved to<br/>output/stripe_2026-03-07.md]
    DONE --> SUM[Print executive summary<br/>to console]

    style ERR1 fill:#f66,color:#fff
    style ERR2 fill:#f66,color:#fff
    style DONE fill:#6b6,color:#fff
```

### Validation Criteria
- `python main.py "Stripe"` produces a complete report
- `python main.py "xyzfakecompany"` exits gracefully with a helpful message
- Running without `.env` shows a clear setup instruction
- README is sufficient for a new developer to set up and run the project

---

## Phase Summary

| Phase | Focus | Key Output | Estimated Effort |
|-------|-------|-----------|-----------------|
| **1** | Foundation | Project structure, utilities, LLM clients, test infra | Medium |
| **2** | Discovery Tools | `validate_company`, `identify_sector`, `find_competitors` + tests | Medium |
| **3** | Data Collection | `browse_company` with scraping pipeline + tests | Medium-Large |
| **4** | Report & Agent | `generate_report`, agent loop, full test suite | Medium |
| **5** | Polish | CLI, error handling, logging, documentation | Small-Medium |

---

## Dependency Graph

```mermaid
graph LR
    P1[Phase 1<br/>Foundation] --> P2[Phase 2<br/>Discovery Tools]
    P1 --> P3[Phase 3<br/>Data Collection]
    P2 --> P4[Phase 4<br/>Report & Agent]
    P3 --> P4
    P4 --> P5[Phase 5<br/>Polish]
```

Phase 2 and Phase 3 can be worked on in parallel since they both depend only on Phase 1. Phase 4 requires both Phase 2 and Phase 3 to be complete.
