"""LLM client factory — returns the appropriate client for the configured provider."""

from agent.llm.base import LLMClient, ToolCall, ToolDefinition


def get_llm_client(
    provider: str = "gemini",
    api_key: str = "",
    model: str | None = None,
) -> LLMClient:
    """Create an LLM client for the specified provider.

    Args:
        provider: One of "gemini", "anthropic", "openai".
        api_key: API key for the provider.
        model: Optional model override.

    Returns:
        An LLMClient instance.

    Raises:
        ValueError: If provider is not recognized.
    """
    if provider == "gemini":
        from agent.llm.gemini_client import GeminiClient
        kwargs = {"api_key": api_key}
        if model:
            kwargs["model"] = model
        return GeminiClient(**kwargs)
    elif provider == "anthropic":
        from agent.llm.anthropic_client import AnthropicClient
        kwargs = {"api_key": api_key}
        if model:
            kwargs["model"] = model
        return AnthropicClient(**kwargs)
    elif provider == "openai":
        from agent.llm.openai_client import OpenAIClient
        kwargs = {"api_key": api_key}
        if model:
            kwargs["model"] = model
        return OpenAIClient(**kwargs)
    else:
        raise ValueError(f"Unknown LLM provider: '{provider}'. Use 'gemini', 'anthropic', or 'openai'.")
