import os
import json
import traceback
from pathlib import Path
from dotenv import load_dotenv
from simple_agents_py import Client
from simple_agents_py.workflow_request import (
    WorkflowExecutionRequest, WorkflowMessage, WorkflowRole,
)

# 1. Load dotenv
print("Loading .env config...")
load_dotenv(override=True)

key = os.environ.get("OPENAI_API_KEY")
base = os.environ.get("WORKFLOW_API_BASE")

# Force set in process environment so native Rust core picks them up
os.environ["OPENAI_API_KEY"] = key
os.environ["WORKFLOW_API_KEY"] = key
os.environ["WORKFLOW_API_BASE"] = base
os.environ["OPENAI_API_BASE"] = base

# 2. Build Client
client = Client("openai", api_key=key, api_base=base)

# 3. Request
req = WorkflowExecutionRequest(
    workflow_path=str(Path("workflow.yaml").resolve()),
    messages=[WorkflowMessage(
        role=WorkflowRole.USER, 
        content="Hi, I bought a software license yesterday but the system charged me twice. Please refund me."
    )]
)

print("Executing YAML workflow...")
try:
    result = client.run_workflow(req)
    print("\n=== WORKFLOW RUN COMPLETED SUCCESSFULLY! ===")
    print("Status:", result.status)
    print("Trace Node Path:", result.trace)
    print("Output Payload:")
    print(json.dumps(result.output, indent=2))
    print("\nOutputs Per Node:")
    print(json.dumps(result.outputs, indent=2))
except Exception as e:
    print("\n=== WORKFLOW RUN FAILED ===")
    traceback.print_exc()
