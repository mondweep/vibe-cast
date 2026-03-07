"""OpenAI LLM client implementation."""

import json
import os
from typing import Any

import openai

from agent.llm.base import LLMClient, ToolCall, ToolDefinition

_DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


class OpenAIClient(LLMClient):
    """LLM client for OpenAI."""

    def __init__(self, api_key: str, model: str = _DEFAULT_MODEL):
        self._client = openai.OpenAI(api_key=api_key)
        self._model = model

    async def chat(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        system_prompt: str = "",
    ) -> Any:
        openai_tools = self.convert_tool_definitions(tools)

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        kwargs = {
            "model": self._model,
            "messages": all_messages,
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        response = self._client.chat.completions.create(**kwargs)
        return response

    def extract_tool_calls(self, response: Any) -> list[ToolCall]:
        tool_calls = response.choices[0].message.tool_calls
        if not tool_calls:
            return []

        return [
            ToolCall(
                id=tc.id,
                name=tc.function.name,
                arguments=json.loads(tc.function.arguments),
            )
            for tc in tool_calls
        ]

    def extract_text(self, response: Any) -> str:
        return response.choices[0].message.content or ""

    def format_tool_result(self, tool_call: ToolCall, result: str) -> dict:
        return {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": result,
        }

    def format_assistant_message(self, response: Any) -> dict:
        msg = response.choices[0].message
        result = {"role": "assistant", "content": msg.content}
        if msg.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]
        return result

    def convert_tool_definitions(self, tools: list[ToolDefinition]) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in tools
        ]
