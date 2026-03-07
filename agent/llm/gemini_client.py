"""Gemini LLM client implementation using google-genai SDK."""

import json
import os
from typing import Any

from google import genai
from google.genai import types

from agent.llm.base import LLMClient, ToolCall, ToolDefinition

_DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class GeminiClient(LLMClient):
    """LLM client for Google Gemini."""

    def __init__(self, api_key: str, model: str = _DEFAULT_MODEL):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def chat(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        system_prompt: str = "",
    ) -> Any:
        gemini_tools = self.convert_tool_definitions(tools)

        config = types.GenerateContentConfig(
            system_instruction=system_prompt if system_prompt else None,
            tools=[types.Tool(function_declarations=gemini_tools)] if gemini_tools else None,
        )

        contents = self._convert_messages(messages)

        response = self._client.models.generate_content(
            model=self._model,
            contents=contents,
            config=config,
        )
        return response

    def extract_tool_calls(self, response: Any) -> list[ToolCall]:
        calls = []
        for candidate in response.candidates:
            if not candidate.content or not candidate.content.parts:
                continue
            for part in candidate.content.parts:
                if part.function_call:
                    fc = part.function_call
                    args = dict(fc.args) if fc.args else {}
                    call_id = fc.id if hasattr(fc, "id") and fc.id else f"gemini_{fc.name}"
                    calls.append(ToolCall(id=call_id, name=fc.name, arguments=args))
        return calls

    def extract_text(self, response: Any) -> str:
        try:
            return response.text or ""
        except (AttributeError, ValueError):
            return ""

    def format_tool_result(self, tool_call: ToolCall, result: str) -> dict:
        return {
            "role": "tool",
            "parts": [
                types.Part.from_function_response(
                    name=tool_call.name,
                    response={"result": result},
                )
            ],
        }

    def format_assistant_message(self, response: Any) -> dict:
        parts = []
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            parts = response.candidates[0].content.parts
            
        return {
            "role": "model",
            "parts": parts,
        }

    def convert_tool_definitions(self, tools: list[ToolDefinition]) -> list[Any]:
        def fix_schema(schema: dict) -> dict:
            """Recursively fix JSON schema for Gemini compatibility."""
            if not isinstance(schema, dict):
                return schema
            
            # Make a copy to avoid mutating the original
            fixed = schema.copy()
            
            # Gemini models require 'items' if type is array
            if fixed.get("type") == "array" and "items" not in fixed:
                fixed["items"] = {"type": "object"}  # Default to object types if unspecified
                
            for k, v in fixed.items():
                if isinstance(v, dict):
                    fixed[k] = fix_schema(v)
                elif isinstance(v, list):
                    fixed[k] = [fix_schema(item) if isinstance(item, dict) else item for item in v]
                    
            return fixed

        declarations = []
        for tool in tools:
            params = dict(tool.parameters) if tool.parameters else {}
            params = fix_schema(params)
            params.pop("additionalProperties", None)

            declarations.append(
                types.FunctionDeclaration(
                    name=tool.name,
                    description=tool.description,
                    parameters=params if params.get("properties") else None,
                )
            )
        return declarations

    def _convert_messages(self, messages: list[dict]) -> list[Any]:
        """Convert provider-neutral messages to Gemini format."""
        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else msg["role"]
            if "parts" in msg:
                # If it's already structured, unpack it
                parts = []
                for p in msg["parts"]:
                    # check if p is already a Part
                    if isinstance(p, types.Part):
                        parts.append(p)
                    elif isinstance(p, dict) and "text" in p:
                        parts.append(types.Part.from_text(text=p["text"]))
                    elif isinstance(p, str):
                        parts.append(types.Part.from_text(text=p))
                    else:
                        parts.append(p)
                contents.append(types.Content(role=role, parts=parts))
            else:
                contents.append(
                    types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
                )
        return contents
