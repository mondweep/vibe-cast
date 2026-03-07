"""FastMCP server for the Competitive Analysis AI Agent.

Exposes tools over stdio transport. Tools are registered in phases
as they are implemented.
"""

from fastmcp import FastMCP

from server.tools.validate_company import validate_company
from server.tools.identify_sector import identify_sector
from server.tools.find_competitors import find_competitors
from server.tools.browse_company import browse_company
from server.tools.generate_report import generate_report

mcp = FastMCP("competitive-analysis")

# Phase 2: Core Discovery Tools
mcp.tool()(validate_company)
mcp.tool()(identify_sector)
mcp.tool()(find_competitors)

# Phase 3: Data Collection
mcp.tool()(browse_company)

# Phase 4: Report Generation
mcp.tool()(generate_report)
