"""Sector identification tool for the MCP server."""

import logging

from server.utils.search import web_search

logger = logging.getLogger(__name__)


async def identify_sector(company_name: str, domain: str) -> dict:
    """Identify the industry sector and sub-sector of a company.

    Searches the web for the company's industry classification and
    extracts sector information from the results.

    Args:
        company_name: The canonical name of the company.
        domain: The company's official website domain.

    Returns:
        A dict with keys:
            - sector (str): Primary industry sector.
            - sub_sector (str): More specific sub-sector.
            - sic_code (str): SIC code if found.
            - description (str): Brief sector description.
            - error (str): Error message if identification failed.
    """
    try:
        results = await web_search(
            f'"{company_name}" industry sector {domain}', max_results=5
        )
    except Exception as e:
        logger.exception("Search failed for sector identification: %s", company_name)
        return {
            "sector": "Unknown",
            "sub_sector": "",
            "sic_code": "",
            "description": "",
            "error": f"Search failed: {e}",
        }

    if not results:
        return {
            "sector": "Unknown",
            "sub_sector": "",
            "sic_code": "",
            "description": "",
        }

    # Combine all result bodies for analysis
    combined_text = " ".join(r.get("body", "") for r in results).lower()

    # Extract sector from results
    sector = _extract_sector(combined_text)
    sub_sector = _extract_sub_sector(combined_text, sector)
    sic_code = _extract_sic_code(combined_text)

    return {
        "sector": sector,
        "sub_sector": sub_sector,
        "sic_code": sic_code,
        "description": results[0].get("body", ""),
    }


def _extract_sector(text: str) -> str:
    """Extract the primary sector from combined search result text."""
    # Common sector keywords to look for
    sector_keywords = {
        "financial technology": "Financial Technology",
        "fintech": "Financial Technology",
        "artificial intelligence": "Artificial Intelligence",
        "cloud computing": "Cloud Computing",
        "e-commerce": "E-Commerce",
        "ecommerce": "E-Commerce",
        "cybersecurity": "Cybersecurity",
        "healthcare": "Healthcare",
        "health care": "Healthcare",
        "software": "Software",
        "saas": "Software as a Service",
        "telecommunications": "Telecommunications",
        "automotive": "Automotive",
        "retail": "Retail",
        "energy": "Energy",
        "media": "Media & Entertainment",
        "education": "Education",
        "real estate": "Real Estate",
        "logistics": "Logistics",
        "manufacturing": "Manufacturing",
        "biotechnology": "Biotechnology",
        "social media": "Social Media",
        "gaming": "Gaming",
        "food": "Food & Beverage",
        "travel": "Travel & Hospitality",
        "insurance": "Insurance",
        "banking": "Banking",
        "payments": "Financial Technology",
        "advertising": "Advertising Technology",
    }

    for keyword, sector in sector_keywords.items():
        if keyword in text:
            return sector

    return "Technology"


def _extract_sub_sector(text: str, sector: str) -> str:
    """Extract a sub-sector from the text, more specific than the primary sector."""
    sub_sector_keywords = {
        "payments": "Payments",
        "lending": "Lending",
        "analytics": "Analytics",
        "infrastructure": "Infrastructure",
        "marketplace": "Marketplace",
        "developer tools": "Developer Tools",
        "enterprise": "Enterprise Software",
        "consumer": "Consumer",
        "b2b": "B2B",
        "api": "API Platform",
        "data": "Data Services",
        "security": "Security",
        "automation": "Automation",
    }

    for keyword, sub in sub_sector_keywords.items():
        if keyword in text:
            return sub

    return ""


def _extract_sic_code(text: str) -> str:
    """Extract SIC code from the text if mentioned."""
    import re

    match = re.search(r"sic\s*(?:code)?\s*(\d{4})", text)
    return match.group(1) if match else ""
