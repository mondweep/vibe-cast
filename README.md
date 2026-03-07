# Competitive Analysis AI Agent

An AI-powered agent that automates competitor research. Given a company name, it validates the entity, identifies the sector, finds top competitors, collects strategic data, and generates a comparative markdown report.

## Architecture

- **MCP Server**: FastMCP server exposing 5 tools over stdio transport
- **Agent Loop**: Provider-agnostic orchestrator supporting Gemini, Claude, and OpenAI
- **TDD**: London School testing — 79 tests, all mocked, no API keys needed

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env — set your API key for your chosen provider

# 3. Run
python main.py "Stripe"
```

## Configuration

Set `LLM_PROVIDER` in `.env` to choose your LLM backend:

| Provider | Env Var | Default Model | Free Tier |
|----------|---------|---------------|-----------|
| `gemini` (default) | `GOOGLE_API_KEY` | `gemini-2.5-flash` | 10 RPM, 250 RPD |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` | ~$5 one-time |
| `openai` | `OPENAI_API_KEY` | `gpt-4o` | ~$5 one-time |

## CLI Options

```
python main.py "Company Name"              # Use default provider (gemini)
python main.py "Company Name" -p anthropic  # Use Claude
python main.py "Company Name" -m gpt-4o    # Override model
python main.py "Company Name" -v           # Verbose logging
```

## Running Tests

```bash
pytest          # Run all 79 unit tests (no API keys needed)
pytest -v       # Verbose output
pytest -m unit  # Explicitly run only unit tests
```

## Project Structure

```
server/          # MCP server + tools
  tools/         # validate_company, identify_sector, find_competitors,
                 # browse_company, generate_report
  utils/         # search.py (DDG wrapper), scraper.py (httpx + trafilatura)
agent/           # Agent loop + LLM clients
  llm/           # base.py, gemini_client.py, anthropic_client.py, openai_client.py
templates/       # Jinja2 report template
tests/           # London School TDD tests
output/          # Generated reports
```

## How It Works

1. **validate_company** — Confirms the company exists, extracts domain
2. **identify_sector** — Determines industry sector and sub-sector
3. **find_competitors** — Discovers top 3 competitors
4. **browse_company** — Researches each company (pricing, products, marketing, market position)
5. **generate_report** — Renders a markdown report with comparison matrix, SWOT, and recommendations
