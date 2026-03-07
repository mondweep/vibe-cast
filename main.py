"""CLI entry point for the Competitive Analysis AI Agent.

Usage:
    python main.py "Company Name"
    python main.py "Company Name" --provider anthropic
    python main.py "Company Name" --verbose
"""

import argparse
import asyncio
import logging
import os
import sys

from dotenv import load_dotenv


def setup_logging(verbose: bool = False):
    """Configure structured logging."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    # Quiet noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("trafilatura").setLevel(logging.WARNING)
    logging.getLogger("duckduckgo_search").setLevel(logging.WARNING)


def get_api_key(provider: str) -> str:
    """Get the API key for the selected provider."""
    key_map = {
        "gemini": "GOOGLE_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    env_var = key_map.get(provider)
    if not env_var:
        print(f"Error: Unknown provider '{provider}'. Use: gemini, anthropic, openai")
        sys.exit(1)

    api_key = os.getenv(env_var)
    if not api_key or api_key.startswith(("AIza...", "sk-ant-...", "sk-...")):
        print(f"Error: {env_var} not set or still has placeholder value.")
        print(f"Set it in your .env file or environment:")
        print(f"  export {env_var}=your-actual-api-key")
        print(f"\nSee .env.example for the full configuration template.")
        sys.exit(1)

    return api_key


async def run_analysis(company_name: str, provider: str, model: str | None, verbose: bool):
    """Run the competitive analysis pipeline."""
    from agent.llm import get_llm_client
    from agent.llm.base import ToolDefinition
    from agent.client import AgentLoop

    logger = logging.getLogger("main")

    # Get API key and create LLM client
    api_key = get_api_key(provider)
    logger.info("Using LLM provider: %s", provider)

    kwargs = {"provider": provider, "api_key": api_key}
    if model:
        kwargs["model"] = model

    llm_client = get_llm_client(**kwargs)

    # Define tools available to the agent (matching MCP server tools)
    tools = [
        ToolDefinition(
            name="validate_company",
            description="Validate that a company is a real, identifiable entity. Returns canonical name, domain, and description.",
            parameters={
                "type": "object",
                "properties": {
                    "company_name": {"type": "string", "description": "The name of the company to validate."},
                },
                "required": ["company_name"],
            },
        ),
        ToolDefinition(
            name="identify_sector",
            description="Identify the industry sector and sub-sector of a company.",
            parameters={
                "type": "object",
                "properties": {
                    "company_name": {"type": "string", "description": "The canonical company name."},
                    "domain": {"type": "string", "description": "The company's official domain."},
                },
                "required": ["company_name", "domain"],
            },
        ),
        ToolDefinition(
            name="find_competitors",
            description="Find the top 3 competitors of a company in its sector.",
            parameters={
                "type": "object",
                "properties": {
                    "company_name": {"type": "string", "description": "The canonical company name."},
                    "sector": {"type": "string", "description": "The company's industry sector."},
                },
                "required": ["company_name", "sector"],
            },
        ),
        ToolDefinition(
            name="browse_company",
            description="Research a company across categories: pricing, products, marketing, market_position. Searches and scrapes the web.",
            parameters={
                "type": "object",
                "properties": {
                    "company_name": {"type": "string", "description": "The company name."},
                    "domain": {"type": "string", "description": "The company's domain."},
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Categories to research. Defaults to all.",
                    },
                },
                "required": ["company_name", "domain"],
            },
        ),
        ToolDefinition(
            name="generate_report",
            description="Generate a competitive analysis markdown report from collected data. Saves to output/ directory.",
            parameters={
                "type": "object",
                "properties": {
                    "target_company": {"type": "object", "description": "Dict with name, domain, description."},
                    "sector": {"type": "object", "description": "Dict with sector, sub_sector."},
                    "competitors": {"type": "array", "description": "List of competitor dicts."},
                    "target_data": {"type": "object", "description": "Dict with pricing, products, etc."},
                    "executive_summary": {"type": "string", "description": "Executive summary text."},
                    "swot": {"type": "object", "description": "SWOT analysis dict."},
                    "recommendations": {"type": "string", "description": "Recommendations text."},
                },
                "required": ["target_company", "sector", "competitors", "target_data"],
            },
        ),
    ]

    # Run the agent
    print(f"\nAnalyzing '{company_name}'...")
    print(f"Provider: {provider}")
    print("-" * 40)

    agent = AgentLoop(llm_client, tools)
    result = await agent.run(f"Perform a competitive analysis of {company_name}")

    print("\n" + "=" * 40)
    print("ANALYSIS COMPLETE")
    print("=" * 40)
    print(result)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Competitive Analysis AI Agent",
        epilog="Example: python main.py 'Stripe'",
    )
    parser.add_argument("company", help="Company name to analyze")
    parser.add_argument(
        "--provider", "-p",
        default=os.getenv("LLM_PROVIDER", "gemini"),
        help="LLM provider: gemini (default), anthropic, openai",
    )
    parser.add_argument(
        "--model", "-m",
        default=None,
        help="Override the default model for the provider",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Load .env file
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        print("Warning: No .env file found. Copy .env.example to .env and configure it.")
        print("Falling back to environment variables.\n")

    setup_logging(args.verbose)

    try:
        asyncio.run(run_analysis(args.company, args.provider, args.model, args.verbose))
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(1)


if __name__ == "__main__":
    main()
