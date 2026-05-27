# Agentic AI News Digest

Automated newsletter workflow using SimpleAgents framework.

## Overview

This workflow searches for Agentic AI news across 6 global regions (North America, UK, Europe, India, China, Japan), classifies them into 4 categories, and generates a publishable newsletter digest.

## Workflow Categories

1. **Enterprise Adoption** - Enterprises implementing/scaling agentic AI
2. **Challenges** - Difficulties, risks, failures with agentic AI
3. **Opportunities** - Business opportunities, investments, partnerships
4. **Evolving Trends** - New developments and innovations

## Files

- `workflow.yaml` - YAML workflow definition for SimpleAgents
- `handlers.py` - Custom Python worker functions
- `run_news_digest.py` - Script to execute the workflow
- `.env` - Environment variables (API key)

## Setup

1. Create a `.env` file with your API key:
```env
OPENAI_API_KEY=your_api_key_here
WORKFLOW_API_BASE=https://api.requesty.ai/v1  # Optional
```

2. Install dependencies (from parent directory):
```bash
cd ..
uv pip install -r requirements.txt
```

## Usage

```bash
cd Agentic-AI-News
python run_news_digest.py
```

Output is saved to `newsletter_digest.json`.

## Notes

- The workflow uses `gpt-4o-mini` with `heal: true` for auto-correcting malformed JSON
- News is deduplicated and filtered to top 50 items
- Each item is scored/ranked within its category