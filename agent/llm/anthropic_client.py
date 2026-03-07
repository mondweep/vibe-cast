"""Anthropic (Claude) LLM client implementation."""

import json
import os
from typing import Any

import anthropic

from agent.llm.base import LLMClient, ToolCall, ToolDefinition

_DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")


class AnthropicClient(LLMClient):
    """LLM client for Anthropic Claude."""

    def __init__(self, api_key: str, model: str = _DEFAULT_MODEL):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    async def chat(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        system_prompt: str = "",
    ) -> Any:
        anthropic_tools = self.convert_tool_definitions(tools)

        kwargs = {
            "model": self._model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = self._client.messages.create(**kwargs)
        return response

    def extract_tool_calls(self, response: Any) -> list[ToolCall]:
        calls = []
        for block in response.content:
            if block.type == "tool_use":
                calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input,
                    )
                )
        return calls

    def extract_text(self, response: Any) -> str:
        texts = []
        for block in response.content:
            if block.type == "text":
                texts.append(block.text)
        return "\n".join(texts)

    def format_tool_result(self, tool_call: ToolCall, result: str) -> dict:
        return {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_call.id,
                    "content": result,
                }
            ],
        }

    def format_assistant_message(self, response: Any) -> dict:
        return {"role": "assistant", "content": response.content}

    def convert_tool_definitions(self, tools: list[ToolDefinition]) -> list[dict]:
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.parameters,
            }
            for tool in tools
        ]
