import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from simple_agents_py import Client, heal_json, coerce_to_schema
from simple_agents_py.workflow_request import (
    WorkflowExecutionRequest, WorkflowMessage, WorkflowRole,
)

# Load environment variables with priority override
load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simple-agents-studio")

app = FastAPI(
    title="SimpleAgents Studio API",
    description="Backend API for interacting with SimpleAgents library",
    version="1.0.0"
)

# Define schemas
class CompletionRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gpt-4o-mini"
    schema_dict: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None

class HealRequest(BaseModel):
    raw_json: str
    schema_dict: Optional[Dict[str, Any]] = None

class WorkflowRequest(BaseModel):
    query: str
    api_key: Optional[str] = None
    api_base: Optional[str] = None

class SaveFileRequest(BaseModel):
    filename: str  # workflow.yaml or handlers.py
    content: str

# API Routes

@app.post("/api/complete")
async def api_complete(req: CompletionRequest):
    """
    Exposes completion with support for schema coercion and dynamic credentials.
    """
    # Dynamically load latest .env configurations at request time
    load_dotenv(override=True)
    
    key = req.api_key or os.environ.get("OPENAI_API_KEY")
    base = req.api_base or os.environ.get("WORKFLOW_API_BASE")
    
    if not key:
        raise HTTPException(
            status_code=400, 
            detail="OpenAI API Key not found in request or environment. Please provide one."
        )
        
    # Inject into process environment so SimpleAgents native core picks it up
    os.environ["OPENAI_API_KEY"] = key
    os.environ["WORKFLOW_API_KEY"] = key
    if base:
        os.environ["OPENAI_API_BASE"] = base
        os.environ["WORKFLOW_API_BASE"] = base
        
    try:
        # Initialize the Client. 
        # When api_base is passed as None/empty, we default to standard OpenAI or None.
        client = Client("openai", api_key=key, api_base=base if base else None)
        
        messages = [{"role": "user", "content": req.prompt}]
        
        if req.schema_dict:
            logger.info("Running structured completion with schema")
            response = client.complete(req.model, messages, schema=req.schema_dict)
            # Response is a ResponseWithMetadata
            return {
                "content": response.content,
                "model": response.model,
                "provider": response.provider,
                "finish_reason": response.finish_reason,
                "latency_ms": getattr(response, "latency_ms", None),
                "usage": getattr(response, "usage", None),
                "structured": True
            }
        else:
            logger.info("Running standard completion")
            response = client.complete(req.model, req.prompt)
            return {
                "content": response.content,
                "model": response.model,
                "provider": response.provider,
                "finish_reason": response.finish_reason,
                "latency_ms": getattr(response, "latency_ms", None),
                "usage": getattr(response, "usage", None),
                "structured": False
            }
            
    except Exception as e:
        logger.error(f"Completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/heal")
async def api_heal(req: HealRequest):
    """
    Demonstrates the JSON healing and schema coercion utilities.
    """
    try:
        # 1. Run heal_json to fix malformed brackets, commas, quotes, etc.
        healed = heal_json(req.raw_json)
        
        result = {
            "success": True,
            "raw_input": req.raw_json,
            "healed_value": healed.value,
            "confidence": healed.confidence,
            "was_healed": healed.was_healed,
            "flags": healed.flags,
            "coerced_value": None,
            "was_coerced": False,
            "coercion_flags": []
        }
        
        # 2. Run schema coercion if a schema is provided
        if req.schema_dict and healed.value:
            try:
                coerced = coerce_to_schema(healed.value, req.schema_dict)
                result["coerced_value"] = coerced.value
                result["was_coerced"] = coerced.was_coerced
                result["coercion_flags"] = getattr(coerced, "flags", [])
            except Exception as schema_err:
                logger.error(f"Schema coercion failed: {schema_err}")
                result["coercion_error"] = str(schema_err)
                
        return result
        
    except Exception as e:
        logger.error(f"JSON healing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-workflow")
async def api_run_workflow(req: WorkflowRequest):
    """
    Runs the multi-node customer inquiry workflow.
    """
    # Dynamically load latest .env configurations at request time
    load_dotenv(override=True)
    
    key = req.api_key or os.environ.get("OPENAI_API_KEY")
    base = req.api_base or os.environ.get("WORKFLOW_API_BASE")
    
    if not key:
        raise HTTPException(
            status_code=400, 
            detail="OpenAI API Key not found in request or environment. Please provide one."
        )
        
    # Inject into process environment so SimpleAgents native core picks it up
    os.environ["OPENAI_API_KEY"] = key
    os.environ["WORKFLOW_API_KEY"] = key
    if base:
        os.environ["OPENAI_API_BASE"] = base
        os.environ["WORKFLOW_API_BASE"] = base
        
    workflow_path = Path("workflow.yaml").resolve()
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="workflow.yaml file not found in current directory.")
        
    try:
        client = Client("openai", api_key=key, api_base=base if base else None)
        
        # Build execution request
        # Note: We pass str(workflow_path)
        execution_req = WorkflowExecutionRequest(
            workflow_path=str(workflow_path),
            messages=[WorkflowMessage(role=WorkflowRole.USER, content=req.query)]
        )
        
        logger.info(f"Running workflow for query: {req.query}")
        result = client.run_workflow(execution_req)
        
        # Prepare response dict
        response_data = {
            "status": result.status,
            "output": getattr(result, "output", None),
            "trace": getattr(result, "trace", []),
            "outputs": getattr(result, "outputs", {})
        }
        
        return response_data
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-gmail-analysis")
def api_run_gmail_analysis(req: WorkflowRequest):
    """
    Runs the Gmail classification pipeline synchronously in a threadpool.
    """
    load_dotenv(override=True)
    key = req.api_key or os.environ.get("OPENAI_API_KEY")
    base = req.api_base or os.environ.get("WORKFLOW_API_BASE")
    
    if key:
        os.environ["OPENAI_API_KEY"] = key
        os.environ["WORKFLOW_API_KEY"] = key
    if base:
        os.environ["OPENAI_API_BASE"] = base
        os.environ["WORKFLOW_API_BASE"] = base
        
    try:
        from gmail_analyst import analyze_emails
        report_data = analyze_emails()
        return report_data
    except Exception as e:
        logger.error(f"Gmail analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/gmail-report")
def api_get_gmail_report():
    """
    Returns the cached Gmail analysis report.
    """
    report_path = Path("gmail_analysis_report.json")
    if report_path.exists():
        try:
            return json.loads(report_path.read_text(encoding="utf-8"))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read report: {e}")
    return {"meta": {"total_emails": 0}, "emails": []}


@app.get("/api/files")
async def api_get_files():
    """
    Returns workflow.yaml and handlers.py contents so they can be viewed and edited in the UI.
    """
    files = {}
    for name in ["workflow.yaml", "handlers.py"]:
        path = Path(name)
        if path.exists():
            files[name] = path.read_text(encoding="utf-8")
        else:
            files[name] = ""
    return files


@app.post("/api/files")
async def api_save_file(req: SaveFileRequest):
    """
    Saves edited code/yaml back to the file system.
    """
    if req.filename not in ["workflow.yaml", "handlers.py"]:
        raise HTTPException(status_code=400, detail="Invalid file name. Can only save workflow.yaml or handlers.py.")
        
    try:
        Path(req.filename).write_text(req.content, encoding="utf-8")
        return {"success": True, "message": f"Saved {req.filename} successfully."}
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Serve static web interface
@app.get("/")
async def get_index():
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse(
            index_path,
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
        )
    return {"message": "SimpleAgents Studio Backend is running. Please create static/index.html."}

# Mount static folder if exists
static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
