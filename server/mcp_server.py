"""FastMCP server for the Competitive Analysis AI Agent.

Exposes tools over stdio transport. Tools are registered in phases
as they are implemented.
"""

from fastmcp import FastMCP

mcp = FastMCP("competitive-analysis")
