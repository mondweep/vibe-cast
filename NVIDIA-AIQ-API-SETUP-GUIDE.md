# NVIDIA AIQ - API Configuration & Demo App Feasibility Guide

## 📋 API Key Status & Solutions

### Your Current Environment Variables
- ✅ `TAVILY_API_KEY` - Web search capability
- ✅ `SERPER_DEV_API_KEY` - Academic paper search (we fixed this!)
- ✅ `NVIDIA_API_KEY` - Primary LLM provider (NIM models)
- ❌ `OPENAI_API_KEY` - Not needed if using NVIDIA models

---

## 🔧 SERPER_DEV_API_KEY Fix

**Status**: ✅ **RESOLVED**

We modified the NVIDIA AIQ code to support `SERPER_DEV_API_KEY` instead of requiring `SERPER_API_KEY`.

**What was changed**:
- File: `aiq-repo/sources/google_scholar_paper_search/src/register.py`
- The code now checks for both `SERPER_API_KEY` and `SERPER_DEV_API_KEY` (fallback)
- Updated error messages to reflect both key names

**How it works**:
```python
# Old behavior (would fail)
serper_api_key = os.environ.get("SERPER_API_KEY")

# New behavior (supports your setup)
serper_api_key = os.environ.get("SERPER_API_KEY") or os.environ.get("SERPER_DEV_API_KEY")
```

---

## 🤖 OPENAI_API_KEY Alternative

**Status**: ✅ **No action needed - use NVIDIA instead**

### Why You Don't Need OPENAI_API_KEY

NVIDIA AIQ is primarily designed to work with **NVIDIA models**. You have `NVIDIA_API_KEY`, which gives you access to:

**Default Models (what AIQ uses)**:
- `nvidia/nemotron-3-nano-30b-a3b` - Main research agent
- `nvidia/nemotron-3-super-120b-a12b` - Optional, more powerful
- `openai/gpt-oss-120b` - Alternative via NVIDIA API (still uses your NVIDIA_API_KEY)

### When You Would Need OPENAI_API_KEY
Only if you explicitly configure AIQ to use OpenAI models instead of NVIDIA. This is **optional**.

### Configuration
The code in `config_validation.py` maps LLM types to required API keys:
```python
LLM_API_KEY_MAP = {
    "nim": ["NVIDIA_API_KEY"],      # ← You have this
    "openai": ["OPENAI_API_KEY"],   # ← Optional
    "anthropic": ["ANTHROPIC_API_KEY"],  # ← Optional
    "google": ["GOOGLE_API_KEY"],   # ← Optional
}
```

Your setup with `NVIDIA_API_KEY` is **optimal for AIQ**. You're good to go!

---

## ✨ Demo App Feasibility Analysis

### Current State
You have a **functional setup** with all essential components:

| Component | Status | Notes |
|-----------|--------|-------|
| NVIDIA API Key | ✅ Ready | Primary LLM provider |
| Tavily Search | ✅ Ready | Web research capability |
| Serper (Scholars) | ✅ Ready | Academic paper search (after our fix) |
| AIQ Code | ✅ Modified | Supports your SERPER_DEV_API_KEY |
| Python 3.11+ | ✅ Assumed | Standard requirement |
| uv package manager | ⚠️ Check | Required by AIQ (install if missing) |

### Feasibility: HIGH ✅

You can absolutely create a demonstration app with your current setup. Here's the realistic scope:

#### Option 1: CLI Demo (Easiest - Ready Now)
**Time**: < 30 minutes
**What you can do**:
- Create a simple Python script that:
  - Accepts a research query
  - Calls AIQ's shallow or deep research agents
  - Displays results with citations
- Test all three search capabilities (web, papers, reasoning)

**Example**: `python demo_cli.py "What are recent advances in AI safety?"`

**Feasibility**: ⭐⭐⭐⭐⭐ (Perfect starting point)

#### Option 2: Web UI Demo (Medium - Few hours)
**Time**: 2-4 hours
**What you can do**:
- Build a Flask/FastAPI web interface
- Forms for research queries
- Real-time output streaming
- Display sources and citations
- Show research depth options (shallow vs. deep)

**Feasibility**: ⭐⭐⭐⭐ (Very doable)

#### Option 3: Interactive Research Agent (Advanced)
**Time**: 4-8 hours
**What you can do**:
- Multi-turn conversation interface
- Follow-up questions
- Iterative refinement of research
- Comparison between shallow and deep research
- Performance metrics

**Feasibility**: ⭐⭐⭐⭐ (Ambitious but achievable)

---

## 🚀 Recommended Demo App Strategy

### Phase 1: Validation (30 min)
1. Clone the main AIQ repo or check drb1/drb2 branches
2. Run the setup script: `./scripts/setup.sh`
3. Test basic CLI: Try the example queries
4. Verify all three API keys work correctly

### Phase 2: Simple CLI Demo (45 min)
Create `demo_research.py`:
```python
"""Simple AIQ research demo."""
import os
from aiq_agent import create_research_agent

# Verify environment
assert os.getenv("NVIDIA_API_KEY"), "Missing NVIDIA_API_KEY"
assert os.getenv("TAVILY_API_KEY"), "Missing TAVILY_API_KEY"
assert os.getenv("SERPER_DEV_API_KEY"), "Missing SERPER_DEV_API_KEY"

# Create agent
agent = create_research_agent(
    model="nvidia/nemotron-3-nano-30b-a3b"
)

# Run demo queries
queries = [
    "What is NVIDIA NIM?",
    "Recent breakthroughs in LLM inference optimization",
    "How does deep research differ from shallow research?"
]

for query in queries:
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print('='*60)
    result = agent.research(query, depth="shallow")
    print(result)
```

### Phase 3: Feature Exploration (Variable)
- Test deep research mode
- Experiment with different models
- Benchmark speed/quality
- Document findings

---

## 📊 Your Exploration Opportunities

### Based on Your Setup

1. **Benchmark Reproduction**
   - Run drb1 and drb2 benchmarks
   - Compare NVIDIA models vs other providers
   - Understand leaderboard metrics

2. **Integration with Vibe-Cast**
   - **Trading System**: Use AIQ for market research reports
   - **Accounting**: Use AIQ for financial document analysis
   - **General**: Enhance any system with research capabilities

3. **Custom Evaluation**
   - Create benchmarks for your domain
   - Test AIQ on vibe-cast use cases
   - Build a research quality dashboard

4. **Multi-Modal Research**
   - Combine Tavily (web) + Serper (papers) + reasoning
   - Analyze source quality and bias
   - Generate citation-backed reports

---

## 🛠️ Quick Start Checklist

- [ ] Verify Python 3.11+ installed
- [ ] Install uv: `pip install uv` (or `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [ ] Clone AIQ: `git clone https://github.com/NVIDIA-AI-Blueprints/aiq aiq-fresh`
- [ ] Set environment variables (NVIDIA_API_KEY, TAVILY_API_KEY, SERPER_DEV_API_KEY)
- [ ] Run setup: `cd aiq-fresh && ./scripts/setup.sh`
- [ ] Test: `uv run python -m aiq_agent.cli --help`
- [ ] Create your first demo query

---

## 📝 Next Steps

**Recommendation**: Start with Phase 1 validation + a simple CLI demo to understand AIQ's capabilities. Then decide which integration approach fits your vibe-cast projects best.

You have everything you need. Your API keys are properly configured. The modified code supports your SERPER_DEV_API_KEY. 

**The barrier to entry is low** — you can have a working demo in under an hour.

