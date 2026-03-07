# Feasibility Analysis: Google Colab Conversion

## Overview
Converting the `competitor-analysis` AI Agent to a Google Colab notebook (`.ipynb`) is **highly feasible** and an excellent way to share the project as a learning exercise. 

The architecture of this project—particularly the clear separation between the `agent` (LLM orchestration) and the `server` (MCP tools)—lends itself well to a top-down execution flow typical of Jupyter Notebooks.

## Key Considerations & Adaptations

To make this run smoothly in Colab without requiring users to use a terminal, the following adaptations are needed:

### 1. Dependency Management
Instead of `requirements.txt` via command line, the first cell in the notebook would use `!pip install`:
```python
!pip install fastmcp ddgs httpx trafilatura jinja2 python-dotenv google-genai anthropic openai
```

### 2. Environment Variables & API Keys
Instead of relying on a `.env` file, we would use Colab's built-in `google.colab.userdata` for secure API key injection, or provide interactive text inputs using `ipywidgets` so users can easily paste their keys.
```python
import os
from google.colab import userdata

# Safely get the API key from Colab secrets
os.environ["GOOGLE_API_KEY"] = userdata.get('GOOGLE_API_KEY')
```

### 3. MCP Server Adjustments (The Biggest Challenge)
Currently, the codebase uses `FastMCP` which runs as a separate process communicating over `stdio` streams. 
* **Challenge:** Running a sustained background process over `stdio` inside a Colab notebook kernel is messy and prone to hanging.
* **Solution:** We can bypass the `stdio` transport entirely. Since the MCP tools in `server/tools/` are just Python functions (`async def`), we can import and call them *directly* from the `agent` loop, effectively embedding the "tools" directly into the agent without needing the FastMCP server layer. 
* *Alternatively (Harder)*: If we strictly want to teach MCP, we could use FastMCP's SSE (Server-Sent Events) HTTP transport over `localhost` within the Colab instance, or run the FastMCP server in a background thread using `asyncio.create_task()`. However, direct imports are far more reliable for educational notebooks.

### 4. Async Execution in Jupyter
The `main.py` uses `asyncio.run()`, which conflicts with the fact that Jupyter Notebooks already run inside an active asyncio event loop.
* **Solution:** We must replace `asyncio.run(main())` with `await main()` because Colab allows top-level `await` out-of-the-box.

### 5. File Output & Display
The current app saves markdown reports to an `output/` folder.
* **Enhancement:** In Colab, we can use `IPython.display.Markdown` to render the final generated report directly in the notebook output cell, providing immediate visualization for the user without them needing to browse the file system.

## Proposed Colab Notebook Structure

A well-structured educational Colab notebook would look like this:

1. **Introduction (Markdown)**: Explain what the agent does and how it uses tools.
2. **Setup (Code)**: `!pip install` statements.
3. **Configuration (Code)**: Securely prompt the user for their Gemini API key.
4. **Tool Definitions (Code)**: Define (or import) the `validate_company`, `identify_sector`, `find_competitors`, and `browse_company` functions.
5. **LLM Client Setup (Code)**: Initialize the `GeminiClient` from `google-genai`.
6. **Agent Loop (Code)**: Define the core `run` loop that orchestrates the LLM and the tools.
7. **Execution (Code)**: A cell where the user types the company name and runs the agent (`await run_analysis("Stripe")`).
8. **Results (Code)**: Render the final Markdown report elegantly using `IPython.display`.

## Conclusion

**Recommendation: YES, proceed.**
The conversion is straightforward if we flatten the MCP server architecture into direct function calls (or background threaded MCP). It will serve as brilliant, interactive documentation for the codebase.
