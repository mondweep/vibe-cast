#!/usr/bin/env python3
"""
Agentic AI News Digest Runner

Executes the agentic-ai-news-digest workflow to collect, classify,
and generate a newsletter digest of Agentic AI news.
"""
import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from simple_agents_py import Client
from simple_agents_py.workflow_request import (
    WorkflowExecutionRequest, WorkflowMessage, WorkflowRole,
)

load_dotenv(override=True)
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path, override=True)

KEY = os.environ.get("OPENAI_API_KEY")
BASE = os.environ.get("WORKFLOW_API_BASE")

if not KEY:
    print("ERROR: OPENAI_API_KEY is not defined in your environment or .env!")
    exit(1)

os.environ["OPENAI_API_KEY"] = KEY
os.environ["WORKFLOW_API_KEY"] = KEY
if BASE:
    os.environ["OPENAI_API_BASE"] = BASE
    os.environ["WORKFLOW_API_BASE"] = BASE

WORKFLOW_PATH = Path(__file__).parent / "workflow.yaml"

if not WORKFLOW_PATH.exists():
    print(f"ERROR: workflow.yaml not found at {WORKFLOW_PATH}")
    exit(1)

client = Client("openai", api_key=KEY, api_base=BASE)

query = """
Search for the latest Agentic AI news across North America, UK, Europe, India, China, and Japan.
Focus on:
- Enterprise AI adoption in large organizations
- AI automation and agentic systems implementation challenges
- Business opportunities in AI agents
- Evolving trends in autonomous AI systems

Find news from the past 7 days and return up to 50 items.
"""

execution_req = WorkflowExecutionRequest(
    workflow_path=str(WORKFLOW_PATH.resolve()),
    messages=[WorkflowMessage(role=WorkflowRole.USER, content=query)]
)

print("=" * 60)
print("  AGENTIC AI NEWS DIGEST GENERATOR")
print("=" * 60)
print(f"\nWorkflow: {WORKFLOW_PATH}")
print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nExecuting workflow... (this may take a few minutes)\n")

try:
    result = client.run_workflow(execution_req)
    print("\n" + "=" * 60)
    print("  WORKFLOW COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print(f"\nStatus: {result.status}")
    print(f"Trace: {' -> '.join(result.trace)}")

    digest = getattr(result, "output", None)
    if digest:
        output_file = Path(__file__).parent / "newsletter_digest.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(digest, f, indent=2, ensure_ascii=False)
        print(f"\nDigest saved to: {output_file}")

        if isinstance(digest, dict) and "title" in digest:
            print(f"Title: {digest['title']}")
        if isinstance(digest, dict) and "publication_date" in digest:
            print(f"Published: {digest['publication_date']}")

    outputs = getattr(result, "outputs", {})
    if outputs:
        print("\nOutputs per node:")
        for node_id, node_output in outputs.items():
            print(f"  - {node_id}")

except Exception as e:
    print(f"\nERROR: Workflow execution failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)