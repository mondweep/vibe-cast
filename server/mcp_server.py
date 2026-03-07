"""FastMCP server for the Competitive Analysis AI Agent.

Exposes tools over stdio transport. Tools are registered in phases
as they are implemented.
"""

from fastmcp import FastMCP

from server.tools.validate_company import validate_company
from server.tools.identify_sector import identify_sector
from server.tools.find_competitors import find_competitors

mcp = FastMCP("competitive-analysis")

# Phase 2: Core Discovery Tools
mcp.tool()(validate_company)
mcp.tool()(identify_sector)
mcp.tool()(find_competitors)
