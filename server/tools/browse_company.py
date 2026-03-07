"""Company research tool for the MCP server.

Browses the web for detailed information about a company across
multiple categories (pricing, products, marketing, market position).
"""

import logging
from datetime import datetime

from server.utils.search import web_search
from server.utils.scraper import scrape_multiple

logger = logging.getLogger(__name__)

_DEFAULT_CATEGORIES = ["pricing", "products", "marketing", "market_position"]
_TOP_URLS_PER_CATEGORY = 3

# Category-specific search query templates
_QUERY_TEMPLATES = {
    "pricing": '"{company}" pricing plans cost {domain} {year}',
    "products": '"{company}" products services features {domain}',
    "marketing": '"{company}" marketing strategy brand positioning',
    "market_position": '"{company}" market share position industry ranking',
}


def build_search_query(company_name: str, domain: str, category: str) -> str:
    """Build a targeted search query for a specific data category.

    Args:
        company_name: The company name.
        domain: The company's domain.
        category: One of pricing, products, marketing, market_position.

    Returns:
        A formatted search query string.
    """
    template = _QUERY_TEMPLATES.get(category, '"{company}" {category} {domain}')
    return template.format(
        company=company_name,
        domain=domain,
        category=category,
        year=datetime.now().year,
    )


async def browse_company(
    company_name: str,
    domain: str,
    categories: list[str] | None = None,
) -> dict:
    """Research a company across multiple data categories by searching and scraping the web.

    For each category, searches DuckDuckGo for targeted queries, scrapes the top
    results, and returns the extracted content. Handles partial failures gracefully.

    Args:
        company_name: The canonical name of the company.
        domain: The company's official website domain.
        categories: List of categories to research. Defaults to
            ["pricing", "products", "marketing", "market_position"].

    Returns:
        A dict with:
            - One key per category containing the extracted content (str).
            - categories_failed (list[str]): Categories that failed to retrieve data.
    """
    if categories is None:
        categories = list(_DEFAULT_CATEGORIES)

    result = {"categories_failed": []}

    for category in categories:
        try:
            content = await _research_category(company_name, domain, category)
            result[category] = content
        except Exception:
            logger.exception(
                "Failed to research %s for %s", category, company_name
            )
            result[category] = ""
            result["categories_failed"].append(category)

    return result


async def _research_category(
    company_name: str, domain: str, category: str
) -> str:
    """Research a single category for a company.

    Searches, scrapes top results, and combines content.
    Falls back to search snippets if scraping fails.
    """
    query = build_search_query(company_name, domain, category)
    search_results = await web_search(query, max_results=_TOP_URLS_PER_CATEGORY)

    if not search_results:
        return ""

    # Try to scrape the top URLs for detailed content
    urls = [r["href"] for r in search_results if r.get("href")]
    scraped_content = await scrape_multiple(urls[:_TOP_URLS_PER_CATEGORY])

    if scraped_content:
        return "\n\n---\n\n".join(scraped_content)

    # Fall back to search snippets
    snippets = [r.get("body", "") for r in search_results if r.get("body")]
    return "\n\n".join(snippets)
