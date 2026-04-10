# NVIDIA AIQ - CLI Demo Walkthrough

## Overview

This document walks you through running the first demonstration app for NVIDIA AIQ - the **Quick Demo** - which validates your setup and shows AIQ's capabilities.

## Current Status: ✅ READY

Your NVIDIA AIQ environment is fully configured and ready to use:

- ✅ Python 3.11+ installed (3.13.12 available)
- ✅ `uv` package manager installed
- ✅ NVIDIA AIQ cloned and dependencies installed
- ✅ All API keys configured:
  - `NVIDIA_API_KEY` ✅
  - `TAVILY_API_KEY` ✅
  - `SERPER_DEV_API_KEY` ✅

## Quick Demo - Step by Step

### Step 1: Navigate to the AIQ Directory
```bash
cd aiq-main
```

### Step 2: Activate the Virtual Environment
```bash
source .venv/bin/activate
```

### Step 3: Run the Quick Demo
```bash
python quick_demo.py
```

### What You'll See

The demo validates your setup and displays:

1. **API Key Verification**
   ```
   ✅ NVIDIA_API_KEY         🤖 NVIDIA Models (LLMs)
   ✅ TAVILY_API_KEY         🌐 Tavily Web Search
   ✅ SERPER_DEV_API_KEY     📚 Serper Scholar Search
   ```

2. **System Capabilities**
   ```
   ✅ Available - Shallow Research (fast)
   ✅ Available - Deep Research (thorough)
   ✅ Available - Web Search Integration
   ✅ Available - Academic Paper Search
   ```

3. **Query Classification Examples**
   - How AIQ distinguishes between direct questions and research queries
   - What handling strategy is used for each type

4. **Search Sources Available**
   - Web search (Tavily) for current information
   - Academic search (Serper) for peer-reviewed papers
   - Reasoning engine (NVIDIA LLMs) for synthesis

5. **Configuration Summary**
   - Default model: `nvidia/nemotron-3-nano-30b-a3b`
   - Alternative: `nvidia/nemotron-3-super-120b-a12b` (optional, more powerful)
   - All via NVIDIA API Catalog (cloud-hosted, no local GPU needed)

## Demo Apps Available

### Quick Demo (`quick_demo.py`)
- **Purpose:** Validate setup and showcase capabilities
- **Time:** 30 seconds
- **Complexity:** Beginner
- **Command:** `python quick_demo.py`
- **Output:** API key status, system capabilities, configuration

### Research Demo (`demo_research.py`)
- **Purpose:** Run actual research queries
- **Time:** 2-3 minutes per query
- **Complexity:** Advanced
- **Command:** `python demo_research.py`
- **Features:** 
  - Demonstrates query classification
  - Shows research modes (shallow vs. deep)
  - Integrates web and paper search

### Official CLI
- **Purpose:** Full AIQ agent with interactive queries
- **Command:** `./scripts/start_cli.sh`
- **Features:** Multi-turn conversation, full research capabilities

### Web UI
- **Purpose:** Interactive web interface
- **Command:** `./scripts/start_e2e.sh`
- **Visit:** http://localhost:3000

## Example Queries to Try

Once you run the full CLI or research demo, try these queries:

### Meta Questions (Direct Answers)
- "What can you do?"
- "Who created NVIDIA?"
- "What is an LLM?"

### Shallow Research (Fast, Web-Based)
- "What happened in AI this month?"
- "Latest developments in LLM inference"
- "Recent news about NVIDIA"

### Deep Research (Thorough, Multi-Source)
- "Comprehensive analysis of transformer architectures"
- "Recent advances in AI safety with academic papers"
- "Detailed research on prompt engineering techniques"

## Integration with Vibe-Cast

AIQ can enhance your vibe-cast projects:

### Trading System
```
Use AIQ for:
- Market research reports
- Sentiment analysis from news sources
- Academic papers on trading strategies
- Real-time financial news analysis
```

### Accounting System
```
Use AIQ for:
- Financial document research
- Tax regulation updates
- Industry standards documentation
- Compliance requirement analysis
```

### General Research
```
Use AIQ for:
- Competitive analysis
- Technology trend research
- Due diligence investigations
- Market analysis
```

See `NVIDIA-AIQ-API-SETUP-GUIDE.md` for detailed integration strategies.

## Next Steps

1. ✅ **Run Quick Demo**
   ```bash
   python quick_demo.py
   ```

2. **Try Official CLI**
   ```bash
   ./scripts/start_cli.sh
   ```

3. **Explore Benchmarks**
   - `git checkout drb1` - DeepResearch Bench
   - `git checkout drb2` - DeepResearch Bench II

4. **Read Documentation**
   - NVIDIA-AIQ-API-SETUP-GUIDE.md
   - DEMO_APPS.md
   - Official repo: https://github.com/NVIDIA-AI-Blueprints/aiq

## Troubleshooting

### "API key not found" error
```bash
# Check if keys are set
echo $NVIDIA_API_KEY
echo $TAVILY_API_KEY
echo $SERPER_DEV_API_KEY

# If empty, set them
export NVIDIA_API_KEY="your-key"
export TAVILY_API_KEY="your-key"
export SERPER_DEV_API_KEY="your-key"
```

### Virtual environment issues
```bash
# Deactivate current
deactivate 2>/dev/null

# Reactivate
source .venv/bin/activate

# Or create fresh
python -m venv .venv
source .venv/bin/activate
./scripts/setup.sh
```

### Module import errors
```bash
# Ensure venv is active
source .venv/bin/activate

# Reinstall dependencies
./scripts/setup.sh
```

### CLI not responding
```bash
# Usually takes 10-30 seconds for first response
# Be patient - it's loading the model

# If stuck after 60 seconds, check API keys
# Try a simple query first: "Hello"
```

## Architecture Summary

```
Your Query
    ↓
[Orchestrator Node]
    ├─→ Is this a meta question?
    │   └─→ Answer directly
    └─→ Is this a research query?
        ├─→ Shallow Research Mode
        │   ├─→ Web Search (Tavily)
        │   └─→ Synthesis (Nemotron)
        │   └─→ Duration: 10-30 seconds
        └─→ Deep Research Mode
            ├─→ Planning Phase
            ├─→ Multi-step Research
            ├─→ Web Search (Tavily)
            ├─→ Paper Search (Serper)
            ├─→ Analysis & Synthesis
            └─→ Duration: 2-5 minutes
```

## Key Learnings

1. **AIQ is Intent-Aware**
   - Distinguishes between direct questions and research queries
   - Automatically selects appropriate mode

2. **Multi-Source Research**
   - Web search for current information (Tavily)
   - Academic papers for authoritative sources (Serper)
   - Synthesis via NVIDIA LLMs

3. **Citation-Backed Answers**
   - Every claim includes sources
   - Can cite both web pages and academic papers
   - Useful for research and verification

4. **Flexible Deployment**
   - CLI for command-line usage
   - Web UI for interactive exploration
   - Programmatic API for integration
   - Async jobs for batch processing

## File Structure

```
aiq-main/
├── quick_demo.py           ← Start here (validates setup)
├── demo_research.py        ← Run research queries
├── DEMO_APPS.md           ← Demo documentation
├── scripts/
│   ├── setup.sh           ← Already run (dependencies installed)
│   ├── start_cli.sh       ← Run full CLI
│   ├── start_e2e.sh       ← Run web UI
│   └── start_server_in_debug_mode.sh
├── src/
│   └── aiq_agent/         ← AIQ source code
├── sources/
│   ├── tavily_web_search/
│   └── google_scholar_paper_search/
├── configs/               ← Configuration files
└── pyproject.toml        ← Project metadata
```

## Performance Expectations

- **Quick Demo:** < 1 second (no API calls)
- **Shallow Research:** 10-30 seconds per query
- **Deep Research:** 2-5 minutes per query
- **First API Call:** May take 10-20 seconds (model loading)
- **Paper Search:** Slower than web (scholarly indexing)

## Success Criteria

You'll know everything is working when:

✅ Quick demo shows all API keys as "✅ configured"  
✅ All four capabilities show "✅ Available"  
✅ CLI responds to "Hello" within 30 seconds  
✅ Web search queries return results with sources  
✅ Paper search finds relevant academic papers  

---

**You're all set! Run the quick demo to verify everything is working.**
