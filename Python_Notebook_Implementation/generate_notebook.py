import json
import os
from pathlib import Path

repo_dir = "/Users/mondweep/DxSure2/competitor-analysis"

def read_file(filepath):
    with open(os.path.join(repo_dir, filepath), "r") as f:
        return f.read()

def create_markdown_cell(source):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in source.split("\n")]
    }

def create_code_cell(source):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in source.split("\n")]
    }

cells = []

# Title & intro
cells.append(create_markdown_cell("# Agentic Competitor Analysis 🤖📊\n\nWelcome to this interactive learning exercise! This notebook demonstrates how to build an **autonomous AI agent** that conducts deep competitive research on any company.\n\nHere you will learn how to:\n1. Use tools (web search, scrapers) with Python.\n2. Expose these tools to an LLM.\n3. Implement an Agent Loop that acts, thinks, and observes until it reaches a conclusion.\n4. Format the final output into a professional markdown report."))

# Setup Environment
cells.append(create_markdown_cell("## Step 1: Install Dependencies & Setup\nWe'll install the required libraries like `ddgs` (for searching), `trafilatura` (for scraping text), and `google-genai` (our brain)."))
cells.append(create_code_cell("!pip install -q ddgs httpx trafilatura jinja2 pydantic google-genai nest_asyncio\n\n# Let's create the folder structure we need\n!mkdir -p output templates server/utils server/tools agent/llm"))

# Setup API Key
cells.append(create_markdown_cell("### Configure API Key\nWe're using **Google Gemini** for this tutorial (it's fast and has a great free tier). Get an API key at [Google AI Studio](https://aistudio.google.com/)."))
cells.append(create_code_cell("""import os
try:
    from google.colab import userdata
    os.environ['GOOGLE_API_KEY'] = userdata.get('GOOGLE_API_KEY')
except Exception:
    import getpass
    print("Please enter your Google Gemini API Key:")
    os.environ['GOOGLE_API_KEY'] = getpass.getpass()"""))

# Helper function to create writefile cells
def add_file_cell(title, filepath, content):
    cells.append(create_markdown_cell(f"### {title}\nWriting `{filepath}` to the Colab environment."))
    content_escaped = content.replace('\\', '\\\\').replace('\"', '\\\"').replace('\'', '\\\'')
    write_code = f'''with open("{filepath}", "w") as f:
    f.write("""{content}""")'''
    cells.append(create_code_cell(write_code))

# Utilities
cells.append(create_markdown_cell("## Step 2: The Utilities\nAgents need \"hands and eyes\" to perceive the internet. We give them a `web_search` tool and a `scrape_urls` tool."))
add_file_cell("Web Search Wrapper", "server/utils/search.py", read_file("server/utils/search.py"))
add_file_cell("Web Content Scraper", "server/utils/scraper.py", read_file("server/utils/scraper.py"))

# Tools
cells.append(create_markdown_cell("## Step 3: The Tools\nTools are Python functions that receive arguments, perform an action, and return JSON. The LLM decides *when* and *how* to call these."))
for tool in ["validate_company", "identify_sector", "find_competitors", "browse_company", "generate_report"]:
    add_file_cell(f"Tool: {tool.replace('_', ' ').title()}", f"server/tools/{tool}.py", read_file(f"server/tools/{tool}.py"))

# Template
add_file_cell("Report Markdown Template", "templates/report.md.j2", read_file("templates/report.md.j2"))

# LLM Core
cells.append(create_markdown_cell("## Step 4: The LLM Brain\nHere we define a `GeminiClient` that wraps `google-genai` to easily chat with the model and extract the tools it wants to call."))
add_file_cell("LLM Target Interfaces", "agent/llm/base.py", read_file("agent/llm/base.py"))
add_file_cell("Gemini Integration", "agent/llm/gemini_client.py", read_file("agent/llm/gemini_client.py"))

# Agent Core
cells.append(create_markdown_cell("## Step 5: The Agent Loop\nThis is the orchestrator! It sits in a `WHILE` loop, pushing tool executions back to the model until the model successfully generates a report."))
add_file_cell("Agent Orchestrator", "agent/client.py", read_file("agent/client.py"))

# Main runner
cells.append(create_markdown_cell("## Step 6: Bring It All Together\nHere we wire up the files, select the company we want to research, and kick off the agent!"))

runner_code = """import nest_asyncio
import asyncio
from IPython.display import display, Markdown

# Allow running asyncio in Colab
nest_asyncio.apply()

# Initialize LLM and Agent
from agent.client import Agent
from agent.llm.gemini_client import GeminiClient

async def run_analysis(company_name: str):
    print(f"\\n🚀 Starting Analysis for: {company_name}")
    print("-" * 40)
    
    llm = GeminiClient(api_key=os.environ["GOOGLE_API_KEY"])
    agent = Agent(llm=llm, max_iterations=20)
    
    # Run loop
    try:
        result = await agent.run(f"Perform a competitive analysis of {company_name} and generate the report.")
        print("\\n✅ Analysis complete!")
        
        # Display the result (fallback to text if the tool didn't return report_path explicitly directly to agent)
        if hasattr(result, "get") and result.get("report_path"):
            filename = result["report_path"]
        else:
            # guess the filename based on timestamp since the generate_report tool saves it to output/
            import os, glob
            files = glob.glob("output/*.md")
            filename = max(files, key=os.path.getctime) if files else None
            
        if filename:
            with open(filename, "r") as f:
                display(Markdown(f.read()))
        else:
            print("Could not find the generated report file.")
            
    except Exception as e:
        print(f"\\n❌ Error during execution: {e}")

# ==========================================
# CHANGE THIS TO ANY COMPANY YOU WANT!
# ==========================================
await run_analysis("Anthropic")
"""
cells.append(create_code_cell(runner_code))

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 4
}

out_path = os.path.join(repo_dir, "Python_Notebook_Implementation", "competitor_analysis_tutorial.ipynb")
with open(out_path, "w") as f:
    json.dump(notebook, f, indent=2)

print(f"Notebook successfully written to {out_path}")
