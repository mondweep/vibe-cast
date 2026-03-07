"""Agent loop — provider-agnostic orchestrator.

Connects to the MCP server, discovers tools, and runs a conversation
loop with the configured LLM provider until the agent produces a
final text response.
"""

import json
import logging

from agent.llm.base import LLMClient, ToolCall, ToolDefinition

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a competitive analysis agent. Given a company name, you must:

1. Call validate_company to confirm the company exists and get its domain.
2. Call identify_sector to determine the company's industry sector.
3. Call find_competitors to discover the top 3 competitors.
4. Call browse_company for the target company to research pricing, products, marketing, and market position.
5. Call browse_company for each competitor (same categories).
6. Call generate_report with all collected data to produce the final report.

Important rules:
- Always start with validate_company. If it returns valid: false, inform the user and stop.
- Use the exact tool names and parameter formats specified.
- When calling generate_report, include an executive_summary, swot analysis, and recommendations based on your analysis of the collected data.
- Be thorough but concise in your analysis.
- If a tool call fails, continue with the data you have.
"""

_DEFAULT_MAX_ITERATIONS = 20


class AgentLoop:
    """Provider-agnostic agent orchestration loop.

    Takes an LLMClient and a list of tool definitions, then runs a
    conversation loop: send messages to the LLM, execute any tool calls,
    and repeat until the LLM returns a final text response.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        tools: list[ToolDefinition],
        max_iterations: int = _DEFAULT_MAX_ITERATIONS,
        tool_executor=None,
    ):
        self._llm = llm_client
        self._tools = tools
        self._max_iterations = max_iterations
        self._tool_executor = tool_executor

    async def run(self, user_message: str) -> str:
        """Run the agent loop with the given user message.

        Args:
            user_message: The user's input (e.g., a company name).

        Returns:
            The final text response from the LLM.
        """
        messages = [{"role": "user", "content": user_message}]

        for iteration in range(self._max_iterations):
            logger.info("Agent iteration %d/%d", iteration + 1, self._max_iterations)

            response = await self._llm.chat(
                messages=messages,
                tools=self._tools,
                system_prompt=_SYSTEM_PROMPT,
            )

            tool_calls = self._llm.extract_tool_calls(response)

            if not tool_calls:
                return self._llm.extract_text(response)

            # Append the assistant's response to conversation history
            assistant_msg = self._llm.format_assistant_message(response)
            messages.append(assistant_msg)

            # Execute each tool call and append results
            for tc in tool_calls:
                logger.info("Executing tool: %s(%s)", tc.name, json.dumps(tc.arguments)[:200])

                try:
                    result = await self._execute_tool(tc)
                except Exception as e:
                    logger.error("Tool %s failed: %s", tc.name, e)
                    result = json.dumps({"error": str(e)})

                tool_result_msg = self._llm.format_tool_result(tc, result)
                messages.append(tool_result_msg)

        # Max iterations reached
        logger.warning("Agent reached max iterations (%d)", self._max_iterations)
        return self._llm.extract_text(response)

    async def _execute_tool(self, tool_call: ToolCall) -> str:
        """Execute a tool call via the MCP server or direct function call.

        Args:
            tool_call: The normalized tool call to execute.

        Returns:
            The tool's result as a JSON string.
        """
        if self._tool_executor:
            result = await self._tool_executor(tool_call.name, tool_call.arguments)
        else:
            # Import and call the tool function directly
            result = await self._call_tool_directly(tool_call)

        if isinstance(result, dict):
            return json.dumps(result)
        return str(result)

    async def _call_tool_directly(self, tool_call: ToolCall) -> dict:
        """Call a tool function directly by name."""
        from server.tools.validate_company import validate_company
        from server.tools.identify_sector import identify_sector
        from server.tools.find_competitors import find_competitors
        from server.tools.browse_company import browse_company
        from server.tools.generate_report import generate_report

        tool_map = {
            "validate_company": validate_company,
            "identify_sector": identify_sector,
            "find_competitors": find_competitors,
            "browse_company": browse_company,
            "generate_report": generate_report,
        }

        func = tool_map.get(tool_call.name)
        if not func:
            return {"error": f"Unknown tool: {tool_call.name}"}

        return await func(**tool_call.arguments)
