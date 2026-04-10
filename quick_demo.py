#!/usr/bin/env python3
"""
NVIDIA AIQ Quick Demo - Validates API Keys and Shows System Capabilities

This script:
1. Verifies all API keys are configured
2. Shows available search capabilities
3. Demonstrates query understanding
4. Provides next steps for deeper exploration

No complex async code - just validation and info display.
"""

import os
import json
from typing import Dict, List


class AIQDemo:
    """Simple demo to validate and showcase AIQ capabilities."""

    def __init__(self):
        self.api_keys = {}
        self.capabilities = {
            "shallow_research": False,
            "deep_research": False,
            "web_search": False,
            "paper_search": False,
        }

    def check_api_keys(self) -> bool:
        """Verify all required API keys are set."""
        required = {
            "NVIDIA_API_KEY": "🤖 NVIDIA Models (LLMs)",
            "TAVILY_API_KEY": "🌐 Tavily Web Search",
            "SERPER_DEV_API_KEY": "📚 Serper Scholar Search",
        }

        print("\n" + "="*70)
        print("🔐 API KEY VERIFICATION")
        print("="*70 + "\n")

        all_present = True
        for key, description in required.items():
            is_set = bool(os.getenv(key))
            status = "✅" if is_set else "❌"
            print(f"{status} {key:25} {description}")
            self.api_keys[key] = is_set
            if not is_set:
                all_present = False

        return all_present

    def assess_capabilities(self) -> None:
        """Determine what AIQ features are available."""
        print("\n" + "="*70)
        print("⚙️  SYSTEM CAPABILITIES")
        print("="*70 + "\n")

        # Check capabilities
        has_nvidia = self.api_keys.get("NVIDIA_API_KEY", False)
        has_tavily = self.api_keys.get("TAVILY_API_KEY", False)
        has_serper = self.api_keys.get("SERPER_DEV_API_KEY", False)

        # Core reasoning requires NVIDIA API
        self.capabilities["shallow_research"] = has_nvidia
        self.capabilities["deep_research"] = has_nvidia

        # Search capabilities
        self.capabilities["web_search"] = has_tavily and has_nvidia
        self.capabilities["paper_search"] = has_serper and has_nvidia

        # Display capabilities
        features = [
            ("Shallow Research (fast)", self.capabilities["shallow_research"]),
            ("Deep Research (thorough)", self.capabilities["deep_research"]),
            ("Web Search Integration", self.capabilities["web_search"]),
            ("Academic Paper Search", self.capabilities["paper_search"]),
        ]

        for feature, available in features:
            status = "✅ Available" if available else "⚠️  Limited"
            print(f"{status:20} {feature}")

    def demo_query_classification(self) -> None:
        """Show how AIQ classifies queries."""
        print("\n" + "="*70)
        print("🧠 QUERY CLASSIFICATION EXAMPLES")
        print("="*70 + "\n")

        # Example queries and how AIQ would classify them
        examples = [
            {
                "query": "What time is it?",
                "type": "Meta Question",
                "handling": "Direct answer (no search needed)"
            },
            {
                "query": "Latest AI developments in 2025",
                "type": "Research Query",
                "handling": "Shallow research (web search + synthesis)"
            },
            {
                "query": "Transformer architecture detailed analysis",
                "type": "Research Query",
                "handling": "Deep research (papers + web + multi-step)"
            },
            {
                "query": "Hello, how are you?",
                "type": "Meta Question",
                "handling": "Conversational response"
            },
        ]

        for i, example in enumerate(examples, 1):
            print(f"Example {i}:")
            print(f"  📝 Query:    {example['query']}")
            print(f"  🏷️  Type:     {example['type']}")
            print(f"  🎯 Handling: {example['handling']}")
            print()

    def demo_search_sources(self) -> None:
        """Demonstrate available search sources."""
        print("="*70)
        print("🔍 SEARCH SOURCES")
        print("="*70 + "\n")

        sources = [
            {
                "name": "Tavily Web Search",
                "status": "✅" if self.capabilities["web_search"] else "⚠️",
                "description": "Real-time web search for current events",
                "example": "What happened at the recent AI conference?"
            },
            {
                "name": "Serper Academic Search",
                "status": "✅" if self.capabilities["paper_search"] else "⚠️",
                "description": "Peer-reviewed papers from Google Scholar",
                "example": "Recent research on transformer efficiency"
            },
            {
                "name": "Reasoning Engine",
                "status": "✅" if self.capabilities["shallow_research"] else "⚠️",
                "description": "NVIDIA LLMs for analysis and synthesis",
                "example": "Compare and synthesize multiple sources"
            },
        ]

        for source in sources:
            print(f"{source['status']} {source['name']}")
            print(f"   {source['description']}")
            print(f"   Example: \"{source['example']}\"")
            print()

    def show_next_steps(self) -> None:
        """Display next steps for deeper exploration."""
        print("="*70)
        print("🚀 NEXT STEPS")
        print("="*70 + "\n")

        steps = [
            ("Review Setup Guide", "Read NVIDIA-AIQ-API-SETUP-GUIDE.md"),
            ("Explore Benchmarks", "Check drb1 and drb2 branches"),
            ("Run Web UI", "./scripts/start_e2e.sh"),
            ("Full CLI", "./scripts/start_cli.sh"),
            ("Documentation", "Visit github.com/NVIDIA-AI-Blueprints/aiq"),
        ]

        for i, (step, detail) in enumerate(steps, 1):
            print(f"{i}. {step}")
            print(f"   → {detail}\n")

    def show_demo_config(self) -> None:
        """Show the current configuration."""
        print("="*70)
        print("📋 CONFIGURATION SUMMARY")
        print("="*70 + "\n")

        config = {
            "Model": "nvidia/nemotron-3-nano-30b-a3b",
            "Alternative": "nvidia/nemotron-3-super-120b-a12b (optional)",
            "Inference": "NVIDIA API Catalog (cloud-hosted)",
            "Research Depth": "Shallow (fast) or Deep (thorough)",
            "Citation Support": "✅ Enabled with source tracking",
        }

        for key, value in config.items():
            print(f"  {key:20} {value}")

    def run(self) -> None:
        """Run the complete demo."""
        # Welcome
        print("\n")
        print("╔" + "="*68 + "╗")
        print("║" + " "*68 + "║")
        print("║" + "  🎯 NVIDIA AIQ - Quick Demo & Validation  ".center(68) + "║")
        print("║" + " "*68 + "║")
        print("╚" + "="*68 + "╝")

        # Run checks
        keys_ok = self.check_api_keys()
        self.assess_capabilities()

        if not keys_ok:
            print("\n⚠️  WARNING: Some API keys are missing!")
            print("Set environment variables and try again.")
            return

        # Show details
        self.demo_query_classification()
        self.demo_search_sources()
        self.show_demo_config()
        self.show_next_steps()

        # Summary
        print("="*70)
        print("✅ SYSTEM READY")
        print("="*70 + "\n")

        print("Your NVIDIA AIQ environment is configured and ready!")
        print("\nKey Points:")
        print("  • All API keys are properly set")
        print("  • All search sources are available")
        print("  • Ready for research queries")
        print("  • Can handle both shallow and deep research")
        print("\nStart exploring with: ./scripts/start_cli.sh")
        print()


def main():
    """Main entry point."""
    demo = AIQDemo()
    demo.run()


if __name__ == "__main__":
    main()
