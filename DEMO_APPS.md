# NVIDIA AIQ Demo Applications

This directory contains demonstration applications for exploring NVIDIA AI-Q capabilities.

## Available Demos

### 1. Quick Demo (Recommended Starting Point)
**File:** `quick_demo.py`  
**Complexity:** ⭐ (Beginner)  
**Time:** 30 seconds  

Validates your environment and showcases AIQ capabilities without running full queries.

```bash
python quick_demo.py
```

**What it does:**
- ✅ Verifies all API keys are configured
- ✅ Shows available search sources (web, papers, reasoning)
- ✅ Demonstrates query classification (meta vs. research)
- ✅ Displays system configuration
- ✅ Provides next steps

**Output:**
```
✅ NVIDIA_API_KEY configured
✅ TAVILY_API_KEY configured  
✅ SERPER_DEV_API_KEY configured

⚙️  SYSTEM CAPABILITIES
✅ Shallow Research (fast)
✅ Deep Research (thorough)
✅ Web Search Integration
✅ Academic Paper Search
```

**Best for:** Quick validation, understanding capabilities, troubleshooting setup

---

### 2. Research Demo (Full Integration)
**File:** `demo_research.py`  
**Complexity:** ⭐⭐⭐ (Advanced)  
**Time:** 2-3 minutes per query  

Runs actual research queries through the AIQ agent.

```bash
python demo_research.py
```

**What it does:**
- 🔍 Runs actual research queries
- 📊 Demonstrates shallow vs. deep research
- 🌐 Uses web search (Tavily)
- 📚 Uses academic search (Serper)
- 📝 Shows citation-backed results

**Example queries:**
1. "What is NVIDIA NIM and how does it work?"
2. "What are the latest developments in AI safety in 2025?"
3. "Recent advances in prompt engineering and in-context learning"

**Best for:** Understanding AIQ's research capabilities, evaluating result quality

---

## Quick Setup

### Prerequisites
```bash
# Ensure you're in the aiq-main directory
cd aiq-main

# Activate virtual environment (if not already active)
source .venv/bin/activate

# Verify API keys are set
echo "NVIDIA_API_KEY: $NVIDIA_API_KEY"
echo "TAVILY_API_KEY: $TAVILY_API_KEY"
echo "SERPER_DEV_API_KEY: $SERPER_DEV_API_KEY"
```

### Run Quick Demo
```bash
python quick_demo.py
```

### Run Full Research Demo
```bash
python demo_research.py
```

### Run Official CLI
```bash
./scripts/start_cli.sh
```

### Run Web UI
```bash
./scripts/start_e2e.sh
# Then visit http://localhost:3000
```

---

## Environment Variables Required

| Variable | Source | Required? | Purpose |
|----------|--------|-----------|---------|
| `NVIDIA_API_KEY` | https://build.nvidia.com | ✅ Yes | LLM models (Nemotron, etc.) |
| `TAVILY_API_KEY` | https://tavily.com | ⚠️ Optional* | Web search capability |
| `SERPER_DEV_API_KEY` | https://serper.dev | ⚠️ Optional* | Academic paper search |

*At least one search source is recommended for research queries

---

## Understanding Query Types

### Meta Questions
- Don't require research
- Answered directly by the LLM
- Examples: "What time is it?", "How are you?", "What can you do?"

### Research Queries
- Require external information
- Triggered when current information is needed
- Two modes:
  - **Shallow:** Fast (10-30 sec), uses web search
  - **Deep:** Thorough (2-5 min), uses multiple sources and multi-step reasoning

---

## Next Steps

1. **Start with Quick Demo**
   ```bash
   python quick_demo.py
   ```

2. **Explore Official Documentation**
   - README.md in this directory
   - https://github.com/NVIDIA-AI-Blueprints/aiq

3. **Try Full Research**
   ```bash
   python demo_research.py
   ```

4. **Use Web UI**
   ```bash
   ./scripts/start_e2e.sh
   ```

5. **Explore Benchmarks**
   - Check `drb1` branch: DeepResearch Bench
   - Check `drb2` branch: DeepResearch Bench II

---

## Troubleshooting

### Demo shows missing API keys
Set environment variables:
```bash
export NVIDIA_API_KEY="your-key"
export TAVILY_API_KEY="your-key"
export SERPER_DEV_API_KEY="your-key"
```

### Virtual environment not activating
```bash
# Create fresh venv
python -m venv .venv
source .venv/bin/activate
./scripts/setup.sh
```

### Import errors when running demos
```bash
# Ensure venv is activated
source .venv/bin/activate

# Reinstall dependencies
./scripts/setup.sh
```

---

## Architecture Overview

```
User Query
    ↓
Orchestrator (Intent Classification)
    ├─→ Meta Response? → Direct Answer
    └─→ Research Query
        ├─→ Shallow Research (fast mode)
        │   ├─→ Web Search (Tavily)
        │   └─→ Synthesis (Nemotron)
        └─→ Deep Research (thorough mode)
            ├─→ Planning (multi-step)
            ├─→ Web Search (Tavily)
            ├─→ Paper Search (Serper)
            ├─→ Analysis (Nemotron)
            └─→ Report Generation
```

---

## Performance Notes

- **Shallow Research:** 10-30 seconds (depends on Tavily response time)
- **Deep Research:** 2-5 minutes (multi-step, multiple sources)
- **Paper Search:** Slower than web (scholarly indexing complexity)
- **All inference:** Via NVIDIA API Catalog (no local GPU needed)

---

## For Vibe-Cast Integration

AIQ capabilities you can leverage:

1. **Trading System**
   - Market research reports
   - Sentiment analysis from news
   - Academic papers on trading strategies

2. **Accounting System**
   - Financial document research
   - Tax regulation updates
   - Industry standards documentation

3. **General Research**
   - Enhanced due diligence
   - Competitive analysis
   - Technology trend analysis

See `NVIDIA-AIQ-API-SETUP-GUIDE.md` for integration strategies.

---

## License

NVIDIA AIQ is licensed under Apache 2.0. See LICENSE file in parent directory.

## Support

For issues with AIQ:
- https://github.com/NVIDIA-AI-Blueprints/aiq/issues
- NVIDIA NeMo Agent Toolkit docs: https://docs.nvidia.com/nemo/agent-toolkit/

For demo improvements:
- Check vibe-cast repository
- Refer to NVIDIA-AIQ-API-SETUP-GUIDE.md
