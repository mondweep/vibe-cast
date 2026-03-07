"""Tests for agent/llm/ — LLM client implementations and factory.

London School TDD: All SDK clients are mocked at the boundary.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agent.llm.base import LLMClient, ToolCall, ToolDefinition


SAMPLE_TOOLS = [
    ToolDefinition(
        name="validate_company",
        description="Validate that a company is a real entity.",
        parameters={
            "type": "object",
            "properties": {
                "company_name": {"type": "string", "description": "Company name"}
            },
            "required": ["company_name"],
        },
    )
]


class TestGeminiClient:
    """Test GeminiClient with mocked google.genai."""

    def test_inherits_from_llm_client(self):
        from agent.llm.gemini_client import GeminiClient
        assert issubclass(GeminiClient, LLMClient)

    def test_convert_tool_definitions(self):
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = GeminiClient(api_key="fake-key")

        result = client.convert_tool_definitions(SAMPLE_TOOLS)
        assert len(result) == 1
        func_decl = result[0]
        assert func_decl.name == "validate_company"
        assert func_decl.description == "Validate that a company is a real entity."

    def test_extract_tool_calls_with_function_call(self):
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = GeminiClient(api_key="fake-key")

        mock_part = MagicMock()
        mock_part.function_call.name = "validate_company"
        mock_part.function_call.args = {"company_name": "Stripe"}
        mock_part.function_call.id = "call_123"
        mock_part.text = None

        mock_response = MagicMock()
        mock_response.candidates = [MagicMock()]
        mock_response.candidates[0].content.parts = [mock_part]

        calls = client.extract_tool_calls(mock_response)
        assert len(calls) == 1
        assert calls[0].name == "validate_company"
        assert calls[0].arguments == {"company_name": "Stripe"}

    def test_extract_tool_calls_empty_when_no_function_call(self):
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = GeminiClient(api_key="fake-key")

        mock_part = MagicMock()
        mock_part.function_call = None
        mock_part.text = "Here is the analysis."

        mock_response = MagicMock()
        mock_response.candidates = [MagicMock()]
        mock_response.candidates[0].content.parts = [mock_part]

        calls = client.extract_tool_calls(mock_response)
        assert calls == []

    def test_extract_text(self):
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = GeminiClient(api_key="fake-key")

        mock_response = MagicMock()
        mock_response.text = "Analysis complete."

        text = client.extract_text(mock_response)
        assert text == "Analysis complete."

    def test_format_tool_result(self):
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = GeminiClient(api_key="fake-key")

        tool_call = ToolCall(id="call_123", name="validate_company", arguments={})
        result = client.format_tool_result(tool_call, '{"valid": true}')

        assert result["role"] == "tool"
        assert "validate_company" in str(result)


class TestAnthropicClient:
    """Test AnthropicClient with mocked anthropic SDK."""

    def test_inherits_from_llm_client(self):
        from agent.llm.anthropic_client import AnthropicClient
        assert issubclass(AnthropicClient, LLMClient)

    def test_convert_tool_definitions(self):
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = AnthropicClient(api_key="fake-key")

        result = client.convert_tool_definitions(SAMPLE_TOOLS)
        assert len(result) == 1
        assert result[0]["name"] == "validate_company"
        assert result[0]["description"] == "Validate that a company is a real entity."
        assert "input_schema" in result[0]

    def test_extract_tool_calls_with_tool_use(self):
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = AnthropicClient(api_key="fake-key")

        mock_block = MagicMock()
        mock_block.type = "tool_use"
        mock_block.id = "toolu_123"
        mock_block.name = "validate_company"
        mock_block.input = {"company_name": "Stripe"}

        mock_response = MagicMock()
        mock_response.content = [mock_block]

        calls = client.extract_tool_calls(mock_response)
        assert len(calls) == 1
        assert calls[0].name == "validate_company"
        assert calls[0].id == "toolu_123"

    def test_extract_tool_calls_empty_when_text_only(self):
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = AnthropicClient(api_key="fake-key")

        mock_block = MagicMock()
        mock_block.type = "text"
        mock_block.text = "Analysis complete."

        mock_response = MagicMock()
        mock_response.content = [mock_block]

        calls = client.extract_tool_calls(mock_response)
        assert calls == []

    def test_extract_text(self):
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = AnthropicClient(api_key="fake-key")

        mock_text_block = MagicMock()
        mock_text_block.type = "text"
        mock_text_block.text = "Analysis complete."

        mock_tool_block = MagicMock()
        mock_tool_block.type = "tool_use"

        mock_response = MagicMock()
        mock_response.content = [mock_tool_block, mock_text_block]

        text = client.extract_text(mock_response)
        assert text == "Analysis complete."

    def test_format_tool_result(self):
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = AnthropicClient(api_key="fake-key")

        tool_call = ToolCall(id="toolu_123", name="validate_company", arguments={})
        result = client.format_tool_result(tool_call, '{"valid": true}')

        assert result["role"] == "user"
        assert result["content"][0]["type"] == "tool_result"
        assert result["content"][0]["tool_use_id"] == "toolu_123"


class TestOpenAIClient:
    """Test OpenAIClient with mocked openai SDK."""

    def test_inherits_from_llm_client(self):
        from agent.llm.openai_client import OpenAIClient
        assert issubclass(OpenAIClient, LLMClient)

    def test_convert_tool_definitions(self):
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = OpenAIClient(api_key="fake-key")

        result = client.convert_tool_definitions(SAMPLE_TOOLS)
        assert len(result) == 1
        assert result[0]["type"] == "function"
        assert result[0]["function"]["name"] == "validate_company"

    def test_extract_tool_calls_with_function_call(self):
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = OpenAIClient(api_key="fake-key")

        mock_tool_call = MagicMock()
        mock_tool_call.id = "call_abc123"
        mock_tool_call.function.name = "validate_company"
        mock_tool_call.function.arguments = '{"company_name": "Stripe"}'

        mock_choice = MagicMock()
        mock_choice.message.tool_calls = [mock_tool_call]

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        calls = client.extract_tool_calls(mock_response)
        assert len(calls) == 1
        assert calls[0].name == "validate_company"
        assert calls[0].arguments == {"company_name": "Stripe"}

    def test_extract_tool_calls_empty_when_none(self):
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = OpenAIClient(api_key="fake-key")

        mock_choice = MagicMock()
        mock_choice.message.tool_calls = None

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        calls = client.extract_tool_calls(mock_response)
        assert calls == []

    def test_extract_text(self):
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = OpenAIClient(api_key="fake-key")

        mock_choice = MagicMock()
        mock_choice.message.content = "Analysis complete."

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        text = client.extract_text(mock_response)
        assert text == "Analysis complete."

    def test_format_tool_result(self):
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = OpenAIClient(api_key="fake-key")

        tool_call = ToolCall(id="call_abc123", name="validate_company", arguments={})
        result = client.format_tool_result(tool_call, '{"valid": true}')

        assert result["role"] == "tool"
        assert result["tool_call_id"] == "call_abc123"
        assert result["content"] == '{"valid": true}'


class TestFactory:
    """Test the get_llm_client factory function."""

    def test_returns_gemini_client_for_gemini(self):
        from agent.llm import get_llm_client
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = get_llm_client("gemini", api_key="fake-key")

        assert isinstance(client, GeminiClient)

    def test_returns_anthropic_client_for_anthropic(self):
        from agent.llm import get_llm_client
        from agent.llm.anthropic_client import AnthropicClient

        with patch("agent.llm.anthropic_client.anthropic"):
            client = get_llm_client("anthropic", api_key="fake-key")

        assert isinstance(client, AnthropicClient)

    def test_returns_openai_client_for_openai(self):
        from agent.llm import get_llm_client
        from agent.llm.openai_client import OpenAIClient

        with patch("agent.llm.openai_client.openai"):
            client = get_llm_client("openai", api_key="fake-key")

        assert isinstance(client, OpenAIClient)

    def test_raises_on_unknown_provider(self):
        from agent.llm import get_llm_client

        with pytest.raises(ValueError, match="Unknown LLM provider"):
            get_llm_client("unknown", api_key="fake-key")

    def test_gemini_is_default(self):
        from agent.llm import get_llm_client
        from agent.llm.gemini_client import GeminiClient

        with patch("agent.llm.gemini_client.genai"):
            client = get_llm_client(api_key="fake-key")

        assert isinstance(client, GeminiClient)
