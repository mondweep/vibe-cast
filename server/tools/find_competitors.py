"""Competitor discovery tool for the MCP server."""

import logging
import re
from urllib.parse import urlparse

from server.utils.search import web_search

logger = logging.getLogger(__name__)

_MAX_COMPETITORS = 3


async def find_competitors(company_name: str, sector: str) -> dict:
    """Find the top competitors of a company in its sector.

    Searches for direct competitors and cross-references with sector leaders.
    Returns up to 3 competitors with their domains and descriptions.

    Args:
        company_name: The canonical name of the company.
        sector: The company's industry sector.

    Returns:
        A dict with keys:
            - competitors (list[dict]): Up to 3 competitors, each with
              name, domain, and description.
            - error (str): Error message if discovery failed.
    """
    try:
        results = await web_search(
            f'"{company_name}" competitors alternatives', max_results=5
        )
    except Exception as e:
        logger.exception("Search failed for competitor discovery: %s", company_name)
        return {
            "competitors": [],
            "error": f"Search failed: {e}",
        }

    if not results:
        return {"competitors": []}

    # Extract competitor names from search results
    combined_text = " ".join(r.get("body", "") + " " + r.get("title", "") for r in results)
    competitors = _extract_competitors(combined_text, company_name)

    return {"competitors": competitors[:_MAX_COMPETITORS]}


def _extract_competitors(text: str, exclude_company: str) -> list[dict]:
    """Extract competitor information from combined search text."""
    # Common patterns in competitor articles
    # e.g., "competitors include Square, Adyen, and PayPal"
    # e.g., "Square (squareup.com) focuses on..."
    competitors = []
    seen_names = set()
    exclude_lower = exclude_company.lower()

    # Look for "Name (domain.com)" patterns
    domain_pattern = re.findall(
        r"(\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s*\(([a-zA-Z0-9.-]+\.(?:com|io|net|org|co))\)",
        text,
    )
    for name, domain in domain_pattern:
        name_lower = name.lower()
        if name_lower != exclude_lower and name_lower not in seen_names:
            seen_names.add(name_lower)
            description = _find_description(text, name)
            competitors.append({
                "name": name,
                "domain": domain,
                "description": description,
            })

    # If we don't have enough from domain patterns, look for names after keywords
    if len(competitors) < _MAX_COMPETITORS:
        keyword_patterns = [
            r"competitors?\s*(?:include|are|:)\s*([^.]+)",
            r"(?:alternatives?\s*(?:to|include|are|:))\s*([^.]+)",
            r"(?:competes?\s*with)\s*([^.]+)",
        ]
        for pattern in keyword_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Split on commas and "and"
                names = re.split(r",\s*|\s+and\s+", match)
                for name in names:
                    name = name.strip().strip(".")
                    # Only accept proper-looking company names (capitalized, 1-3 words)
                    if (
                        name
                        and name[0].isupper()
                        and len(name.split()) <= 4
                        and name.lower() != exclude_lower
                        and name.lower() not in seen_names
                        and len(name) > 2
                    ):
                        seen_names.add(name.lower())
                        description = _find_description(text, name)
                        competitors.append({
                            "name": name,
                            "domain": "",
                            "description": description,
                        })

    return competitors


def _find_description(text: str, company_name: str) -> str:
    """Find a brief description of a company from the search text."""
    # Look for sentences containing the company name
    sentences = re.split(r"[.!?]+", text)
    for sentence in sentences:
        if company_name.lower() in sentence.lower() and len(sentence.strip()) > 20:
            desc = sentence.strip()
            # Limit to reasonable length
            if len(desc) > 200:
                desc = desc[:200].rsplit(" ", 1)[0] + "..."
            return desc
    return ""
