# AGENTS.md

## Project Overview
FastAPI web app (`app.py`) serving a SPA (`static/index.html`) that demos **SimpleAgents** — a multi-agent workflow framework with YAML-defined graphs and Python custom workers.

Two main features:
1. **Workflow Studio** — edit/run `workflow.yaml` + `handlers.py` in browser
2. **Gmail Analyst** — OAuth2 inbox fetch → classify emails via `email_classifier.yaml`

## Commands
```bash
# Setup (use uv for speed)
uv venv && source .venv/bin/activate && uv pip install -r requirements.txt

# Run dev server (hot-reload on :8000)
python app.py

# Test workflow directly (no UI)
python test_workflow.py

# Run Gmail analysis (requires credentials.json + .env)
python gmail_analyst.py
```

## Architecture
- **`app.py`** — FastAPI app; endpoints: `/api/complete`, `/api/heal`, `/api/run-workflow`, `/api/run-gmail-analysis`, `/api/gmail-report`, `/api/files` (GET/POST for workflow.yaml + handlers.py)
- **`simple_agents_py`** — External Python package (Rust core); provides `Client`, `heal_json`, `coerce_to_schema`, `WorkflowExecutionRequest`
- **`handlers.py`** — Custom Python worker functions called by `custom_worker` nodes in YAML graphs
- **YAML workflows** — Define nodes (llm_call, switch, custom_worker), edges, output schemas, and interpolation payloads via `{{nodes.X.output.Y}}`

## Key Constraints
- **API key propagation**: `load_dotenv(override=True)` is called per-request. Keys are also set as `os.environ["WORKFLOW_API_KEY"]` and `os.environ["OPENAI_API_BASE"]` so the native Rust core picks them up. Always set both when changing credentials.
- **Custom workers**: `handler` name in YAML must match a function name in `handler_file`. Functions must accept `**kwargs` and return a dict.
- **LLM nodes**: All use `openai/gpt-4o-mini` with `heal: true` (auto-fix malformed JSON output).
- **File save is restricted**: `/api/files` POST only accepts `workflow.yaml` or `handlers.py` as filenames.
- **Gmail OAuth**: First run opens browser via `flow.run_local_server(port=0)`. Credentials cached in `token.pickle` (read-only Gmail scope). Requires `credentials.json` in project root.

## Lint / Test / Typecheck
No linting, typechecking, or test framework configured. `test_workflow.py` is a manual smoke test that runs the customer inquiry workflow with a hardcoded query.
