"""Company validation tool for the MCP server."""

import logging
from urllib.parse import urlparse

from server.utils.search import web_search

logger = logging.getLogger(__name__)

# Common non-company domains to skip when extracting the company domain
_SKIP_DOMAINS = {
    "wikipedia.org", "en.wikipedia.org",
    "crunchbase.com", "www.crunchbase.com",
    "linkedin.com", "www.linkedin.com",
    "bloomberg.com", "www.bloomberg.com",
    "forbes.com", "www.forbes.com",
    "twitter.com", "x.com",
    "youtube.com", "www.youtube.com",
    "github.com",
}


async def validate_company(company_name: str) -> dict:
    """Validate that a company is a real, identifiable entity.

    Searches the web for the given company name and confirms it exists.
    Returns the canonical company name, official domain, and a brief description.

    Args:
        company_name: The name of the company to validate (free-text input).

    Returns:
        A dict with keys:
            - name (str): Canonical company name.
            - domain (str): Official website domain.
            - description (str): Brief company description.
            - valid (bool): Whether the company was found.
            - error (str): Error message if validation failed.
    """
    try:
        results = await web_search(f"{company_name} company", max_results=5)
    except Exception as e:
        logger.exception("Search failed for company validation: %s", company_name)
        return {
            "name": company_name,
            "domain": "",
            "description": "",
            "valid": False,
            "error": f"Search failed: {e}",
        }

    if not results:
        return {
            "name": company_name,
            "domain": "",
            "description": "",
            "valid": False,
            "error": "No search results found.",
        }

    # Check if the company name appears in the search results
    company_lower = company_name.lower()
    name_found = any(
        company_lower in r.get("title", "").lower() or company_lower in r.get("body", "").lower()
        for r in results
    )

    if not name_found:
        return {
            "name": company_name,
            "domain": "",
            "description": "",
            "valid": False,
            "error": f"Could not confirm '{company_name}' as a real company.",
        }

    # Extract the official domain (first non-aggregator URL)
    domain = ""
    for r in results:
        href = r.get("href", "")
        parsed = urlparse(href)
        host = parsed.netloc.lower().removeprefix("www.")
        if host and host not in _SKIP_DOMAINS:
            domain = host
            break

    # Use the top result's body as the description
    description = results[0].get("body", "")

    return {
        "name": company_name,
        "domain": domain,
        "description": description,
        "valid": True,
    }
