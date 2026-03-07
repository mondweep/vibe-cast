"""Tests for agent/client.py — agent orchestration loop.

London School TDD: LLMClient and MCP tool execution are mocked.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agent.llm.base import ToolCall, ToolDefinition
from agent.client import AgentLoop


SAMPLE_TOOLS = [
    ToolDefinition(
        name="validate_company",
        description="Validate a company.",
        parameters={"type": "object", "properties": {"company_name": {"type": "string"}}, "required": ["company_name"]},
    ),
]


@pytest.fixture
def mock_llm_client():
    """A mock LLMClient that returns text on the first call."""
    client = MagicMock()
    client.extract_tool_calls.return_value = []
    client.extract_text.return_value = "Analysis complete."
    client.chat = AsyncMock()
    client.convert_tool_definitions.return_value = []
    client.format_assistant_message.return_value = {"role": "assistant", "content": "done"}
    return client


@pytest.fixture
def mock_llm_client_with_tool_call():
    """A mock LLMClient that makes a tool call then returns text."""
    client = MagicMock()

    tool_call = ToolCall(id="call_1", name="validate_company", arguments={"company_name": "Stripe"})

    # First response: tool call, Second response: text
    client.chat = AsyncMock(side_effect=["response1", "response2"])
    client.extract_tool_calls.side_effect = [
        [tool_call],  # First call returns tool call
        [],  # Second call returns no tool calls
    ]
    # extract_text is only called when there are no tool calls (second iteration)
    client.extract_text.return_value = "Analysis complete for Stripe."
    client.convert_tool_definitions.return_value = []
    client.format_assistant_message.side_effect = [
        {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1"}]},
        {"role": "assistant", "content": "Analysis complete for Stripe."},
    ]
    client.format_tool_result.return_value = {
        "role": "tool",
        "tool_call_id": "call_1",
        "content": '{"valid": true, "name": "Stripe"}',
    }

    return client


class TestAgentLoop:
    """Test agent orchestration loop."""

    @pytest.mark.asyncio
    async def test_returns_final_text_when_no_tool_calls(self, mock_llm_client):
        agent = AgentLoop(mock_llm_client, SAMPLE_TOOLS)

        result = await agent.run("Analyze Stripe")

        assert result == "Analysis complete."
        mock_llm_client.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_executes_tool_calls_and_continues(self, mock_llm_client_with_tool_call):
        mock_execute = AsyncMock(return_value='{"valid": true, "name": "Stripe"}')

        agent = AgentLoop(mock_llm_client_with_tool_call, SAMPLE_TOOLS)
        agent._execute_tool = mock_execute

        result = await agent.run("Analyze Stripe")

        assert "Stripe" in result
        mock_execute.assert_called_once_with(
            ToolCall(id="call_1", name="validate_company", arguments={"company_name": "Stripe"})
        )

    @pytest.mark.asyncio
    async def test_builds_conversation_history(self, mock_llm_client):
        agent = AgentLoop(mock_llm_client, SAMPLE_TOOLS)
        await agent.run("Analyze Stripe")

        # Chat should have been called with messages containing the user message
        call_args = mock_llm_client.chat.call_args
        messages = call_args[1]["messages"] if "messages" in call_args[1] else call_args[0][0]
        assert any("Stripe" in str(m) for m in messages)

    @pytest.mark.asyncio
    async def test_has_system_prompt(self, mock_llm_client):
        agent = AgentLoop(mock_llm_client, SAMPLE_TOOLS)
        await agent.run("Analyze Stripe")

        call_args = mock_llm_client.chat.call_args
        system_prompt = call_args[1].get("system_prompt", call_args[0][2] if len(call_args[0]) > 2 else "")
        assert len(system_prompt) > 0

    @pytest.mark.asyncio
    async def test_limits_max_iterations(self, mock_llm_client):
        # Make the client always return tool calls (infinite loop scenario)
        tool_call = ToolCall(id="call_1", name="validate_company", arguments={"company_name": "X"})
        mock_llm_client.chat = AsyncMock(return_value="response")
        mock_llm_client.extract_tool_calls.return_value = [tool_call]
        mock_llm_client.extract_text.return_value = ""
        mock_llm_client.format_assistant_message.return_value = {"role": "assistant", "content": ""}
        mock_llm_client.format_tool_result.return_value = {"role": "tool", "content": "ok"}

        agent = AgentLoop(mock_llm_client, SAMPLE_TOOLS, max_iterations=3)
        agent._execute_tool = AsyncMock(return_value='{"result": "ok"}')

        result = await agent.run("Analyze something")

        # Should have stopped after max_iterations
        assert mock_llm_client.chat.call_count <= 4  # max_iterations + 1

    @pytest.mark.asyncio
    async def test_handles_tool_execution_error(self, mock_llm_client_with_tool_call):
        agent = AgentLoop(mock_llm_client_with_tool_call, SAMPLE_TOOLS)
        agent._execute_tool = AsyncMock(side_effect=Exception("tool failed"))

        # Should not raise, should handle gracefully
        result = await agent.run("Analyze Stripe")

        # The error should have been formatted as a tool result
        mock_llm_client_with_tool_call.format_tool_result.assert_called()
