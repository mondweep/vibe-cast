# NVIDIA AIQ Tinkering

Exploring the capabilities of [NVIDIA AI-Q Blueprint](https://github.com/NVIDIA-AI-Blueprints/aiq) -- an enterprise-grade research agent built on the NVIDIA NeMo Agent Toolkit and LangChain Deep Agents.

## What is NVIDIA AIQ?

AI-Q is an agentic research system that provides both quick cited answers and in-depth report-style research. It combines:

- **Orchestration node** -- Classifies intent (meta vs. research), sets research depth (shallow vs. deep)
- **Shallow research** -- Bounded, fast researcher with tool-calling and source citation
- **Deep research** -- Long-running multi-step planning and research for citation-backed reports
- **Modular workflows** -- YAML-driven configuration of agents, tools, LLMs, and routing

## What We've Done

### Environment Setup

1. **Cloned NVIDIA AIQ** from [NVIDIA-AI-Blueprints/aiq](https://github.com/NVIDIA-AI-Blueprints/aiq)
2. **Installed dependencies** via `./scripts/setup.sh` (Python venv + Node.js UI)
3. **Configured API keys:**
   - `NVIDIA_API_KEY` -- Primary LLM provider (NVIDIA NIM models)
   - `TAVILY_API_KEY` -- Web search capability
   - `SERPER_DEV_API_KEY` -- Academic paper search (Google Scholar via Serper)
4. **Modified AIQ source code** to accept `SERPER_DEV_API_KEY` as an alternative to `SERPER_API_KEY`
5. **Enabled paper search** in the CLI config (`config_cli_default.yml`)
6. **Created demo scripts** for validation and exploration

### Validation Demos

- **`quick_demo.py`** -- Validates API keys, shows system capabilities, and displays configuration summary. Run: `python quick_demo.py`
- **`demo_research.py`** -- Structural walkthrough of AIQ's architecture and query handling

### First Live Research Query

Ran the official AIQ CLI (`aiq-research`) with the query:

> "What is NVIDIA NIM and how does it relate to inference optimization?"

**Result:** AIQ successfully:
- Classified the query as a research question (not meta)
- Routed to shallow research mode
- Called Tavily web search to find current sources
- Synthesised a well-structured response using NVIDIA Nemotron model
- Returned citation-backed answer with 3 references from NVIDIA technical blogs

Full result saved in `results/001-nvidia-nim-query.md`.

## What We've Learnt

### Architecture Insights

1. **Intent classification is the entry point.** Every query first goes through the orchestration node which decides if it's a meta question (greeting, capability inquiry) or a research question. This determines the entire downstream pipeline.

2. **Shallow vs. deep research is a key design decision.** Shallow research uses bounded tool-calling (10-30 seconds), while deep research involves multi-step planning with iteration (2-5 minutes). The orchestrator auto-selects based on query complexity.

3. **YAML-driven configuration is powerful.** The entire agent topology -- LLMs, tools, routing, agent behaviour -- is defined in YAML configs. No code changes needed to swap models, add tools, or change routing logic.

4. **NVIDIA models work through NIM (Neural Inference Microservices).** All LLM calls go through NVIDIA's API Catalog at `integrate.api.nvidia.com/v1`. The default model is `nvidia/nemotron-3-nano-30b-a3b` with `openai/gpt-oss-120b` available for deep research orchestration.

5. **Tool registration is modular.** Each search tool (Tavily, Serper) is registered as a separate source with its own config. Tools are auto-inherited by agents unless explicitly excluded.

### API Key Findings

- **`OPENAI_API_KEY` is NOT required.** AIQ is designed primarily for NVIDIA models. The `NVIDIA_API_KEY` provides access to all needed models including `gpt-oss-120b` (hosted on NVIDIA's infrastructure, not OpenAI's).
- **`SERPER_DEV_API_KEY` works with a small code modification.** The original code only checks for `SERPER_API_KEY`. We added a fallback to also check `SERPER_DEV_API_KEY`.
- **`TAVILY_API_KEY` is the primary search provider.** Web search is the default and most commonly used tool.

### Performance Observations

- First query takes ~60-90 seconds (model loading + search + synthesis)
- The agent uses a "thinking" phase before tool calls (visible in CLI output)
- Tavily search is called once per shallow research query
- Citation quality is high -- sources are from authoritative domains
- No local GPU is required -- all inference runs on NVIDIA's cloud infrastructure

## Repository Structure

```
NVidia-aiq-tinkering/
├── README.md                      # This file
├── .gitignore                     # Excludes .env, aiq-main/, aiq-repo/
├── .env                           # API keys (not committed)
├── quick_demo.py                  # Validation demo
├── demo_research.py               # Research demo
├── DEMO_APPS.md                   # Demo documentation
├── DEMO-WALKTHROUGH.md            # Step-by-step walkthrough
├── NVIDIA-AIQ-API-SETUP-GUIDE.md  # API configuration guide
├── NVIDIA-AIQ-SETUP.md            # Initial setup notes
├── results/                       # Saved research results
│   └── 001-nvidia-nim-query.md    # First live query result
└── aiq-main/                      # NVIDIA AIQ clone (gitignored)
    ├── configs/                   # Agent configurations
    ├── src/aiq_agent/             # Core agent code
    ├── sources/                   # Tool implementations
    ├── scripts/                   # Setup and launch scripts
    └── .venv/                     # Python virtual environment
```

## How to Run

### Prerequisites
- Python 3.11+
- `uv` package manager
- API keys: `NVIDIA_API_KEY`, `TAVILY_API_KEY`, `SERPER_DEV_API_KEY`

### Quick Start

```bash
# Clone and setup
git clone https://github.com/NVIDIA-AI-Blueprints/aiq.git aiq-main
cd aiq-main && ./scripts/setup.sh

# Set API keys
export $(grep -E '^(NVIDIA_API_KEY|TAVILY_API_KEY|SERPER_DEV_API_KEY)=' ../.env | xargs)

# Validate
source .venv/bin/activate
python ../quick_demo.py

# Run the full CLI
./scripts/start_cli.sh

# Or run the Web UI
./scripts/start_e2e.sh
```

## Available Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| Shallow Research | Tested | Fast (10-30s), web search + synthesis |
| Deep Research | Available | Multi-step (2-5min), not yet tested |
| Web Search (Tavily) | Tested | Working with live results |
| Paper Search (Serper) | Configured | Enabled in config, not yet tested |
| CLI Interface | Tested | Working end-to-end |
| Web UI | Available | Not yet tested |
| Benchmarks (drb1/drb2) | Available | Not yet tested |

## Next Steps

- [ ] Test deep research mode with a complex query
- [ ] Test paper search (academic queries)
- [ ] Try the Web UI
- [ ] Run drb1/drb2 benchmarks
- [ ] Explore integration opportunities with other projects
- [ ] Test with different NVIDIA models (Nemotron Super, GPT-OSS-120B)

## Key Links

- [NVIDIA AIQ Repository](https://github.com/NVIDIA-AI-Blueprints/aiq)
- [DeepResearch Bench Leaderboard](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard)
- [DeepResearch Bench II Leaderboard](https://agentresearchlab.com/benchmarks/deepresearch-bench-ii/index.html#leaderboard)
- [NVIDIA API Catalog](https://build.nvidia.com)
- [NeMo Agent Toolkit Docs](https://docs.nvidia.com/nemo/agent-toolkit/latest/)

## Models Used

| Model | Role | Provider |
|-------|------|----------|
| `nvidia/nemotron-3-nano-30b-a3b` | Intent classification, shallow research, clarification | NVIDIA NIM |
| `openai/gpt-oss-120b` | Deep research orchestration and planning | NVIDIA NIM |
| `nvidia/nemotron-3-super-120b-a12b` | Optional upgrade (limited availability) | NVIDIA NIM |
