"""Abstract base class for LLM client implementations.

Each provider (Gemini, Anthropic, OpenAI) implements this interface.
The agent loop uses only these methods, making it provider-agnostic.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ToolCall:
    """Normalized tool call extracted from an LLM response."""
    id: str
    name: str
    arguments: dict


@dataclass
class ToolDefinition:
    """MCP tool definition converted to a provider-agnostic format."""
    name: str
    description: str
    parameters: dict  # JSON Schema


class LLMClient(ABC):
    """Abstract LLM client interface.

    Implementations normalize provider-specific formats into common
    ToolCall/ToolDefinition structures so the agent loop doesn't need
    to know which provider is active.
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        system_prompt: str = "",
    ) -> Any:
        """Send messages to the LLM and get a response.

        Args:
            messages: Conversation history in provider-neutral format.
            tools: Available tool definitions.
            system_prompt: System prompt for the conversation.

        Returns:
            Provider-specific response object.
        """

    @abstractmethod
    def extract_tool_calls(self, response: Any) -> list[ToolCall]:
        """Extract tool calls from a provider response.

        Args:
            response: Provider-specific response object.

        Returns:
            List of normalized ToolCall objects. Empty if no tool calls.
        """

    @abstractmethod
    def extract_text(self, response: Any) -> str:
        """Extract text content from a provider response.

        Args:
            response: Provider-specific response object.

        Returns:
            Text content from the response.
        """

    @abstractmethod
    def format_tool_result(self, tool_call: ToolCall, result: str) -> dict:
        """Format a tool result for the provider's expected message format.

        Args:
            tool_call: The original tool call.
            result: The tool's output as a string.

        Returns:
            A message dict in the provider's expected format.
        """

    @abstractmethod
    def format_assistant_message(self, response: Any) -> dict:
        """Convert a provider response to a message dict for conversation history.

        Args:
            response: Provider-specific response object.

        Returns:
            A message dict to append to conversation history.
        """

    @abstractmethod
    def convert_tool_definitions(self, tools: list[ToolDefinition]) -> list[Any]:
        """Convert generic tool definitions to provider-specific format.

        Args:
            tools: List of provider-agnostic tool definitions.

        Returns:
            List of tool definitions in the provider's expected format.
        """
