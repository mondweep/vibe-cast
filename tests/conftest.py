"""Shared test fixtures for London School TDD.

All external services are mocked. No API keys or network needed.
"""

import pytest


@pytest.fixture
def mock_search_results_stripe():
    """Realistic DuckDuckGo search results for 'Stripe company'."""
    return [
        {
            "title": "Stripe | Financial Infrastructure for the Internet",
            "href": "https://stripe.com",
            "body": "Stripe is a financial infrastructure platform for businesses. Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.",
        },
        {
            "title": "Stripe - Wikipedia",
            "href": "https://en.wikipedia.org/wiki/Stripe_(company)",
            "body": "Stripe, Inc. is an Irish-American multinational financial services and software as a service company headquartered in South San Francisco, California.",
        },
        {
            "title": "Stripe Company Profile - Crunchbase",
            "href": "https://www.crunchbase.com/organization/stripe",
            "body": "Stripe is a technology company that builds economic infrastructure for the internet. Founded in 2010 by Patrick and John Collison.",
        },
    ]


@pytest.fixture
def mock_search_results_invalid():
    """DuckDuckGo search results for a nonexistent company."""
    return [
        {
            "title": "XYZ - Various meanings",
            "href": "https://en.wikipedia.org/wiki/XYZ",
            "body": "XYZ can refer to various things including the Cartesian coordinate system.",
        },
    ]


@pytest.fixture
def mock_search_results_sector():
    """DuckDuckGo search results for 'Stripe industry sector'."""
    return [
        {
            "title": "Stripe Industry Classification",
            "href": "https://www.example.com/stripe-sector",
            "body": "Stripe operates in the Financial Technology (FinTech) sector, specifically in the payments and financial infrastructure sub-sector. SIC code 7372.",
        },
        {
            "title": "Stripe Market Analysis",
            "href": "https://www.example.com/stripe-analysis",
            "body": "As a leading fintech company, Stripe's primary industry is digital payments processing and financial services technology.",
        },
    ]


@pytest.fixture
def mock_search_results_competitors():
    """DuckDuckGo search results for 'Stripe competitors'."""
    return [
        {
            "title": "Top Stripe Competitors 2026",
            "href": "https://www.example.com/stripe-competitors",
            "body": "Stripe's main competitors include Square (Block, Inc.), Adyen, and PayPal. These companies compete in the online payments processing space.",
        },
        {
            "title": "Stripe vs Competition",
            "href": "https://www.example.com/stripe-vs",
            "body": "Key competitors: Square (squareup.com) focuses on SMBs, Adyen (adyen.com) targets enterprise, PayPal (paypal.com) leads consumer payments.",
        },
    ]


@pytest.fixture
def mock_scraped_content():
    """Realistic scraped content from a company page."""
    return "Stripe offers a suite of payment APIs that powers commerce for online businesses. Pricing starts at 2.9% + 30¢ per successful card charge. Enterprise plans with custom pricing are available."


@pytest.fixture
def mock_scraped_content_empty():
    """Empty scrape result (page couldn't be extracted)."""
    return None


@pytest.fixture
def mock_tool_call():
    """A normalized tool call structure."""
    return {
        "id": "call_123",
        "name": "validate_company",
        "arguments": {"company_name": "Stripe"},
    }


@pytest.fixture
def mock_validated_company():
    """Output from validate_company for Stripe."""
    return {
        "name": "Stripe",
        "domain": "stripe.com",
        "description": "Stripe is a financial infrastructure platform for businesses.",
        "valid": True,
    }


@pytest.fixture
def mock_sector_result():
    """Output from identify_sector for Stripe."""
    return {
        "sector": "Financial Technology",
        "sub_sector": "Payments",
        "sic_code": "7372",
        "description": "Digital payments processing and financial infrastructure",
    }


@pytest.fixture
def mock_competitors_result():
    """Output from find_competitors for Stripe."""
    return {
        "competitors": [
            {
                "name": "Square",
                "domain": "squareup.com",
                "description": "Financial services and digital payments company",
            },
            {
                "name": "Adyen",
                "domain": "adyen.com",
                "description": "Global payment platform for enterprise businesses",
            },
            {
                "name": "PayPal",
                "domain": "paypal.com",
                "description": "Online payments system and digital wallet",
            },
        ]
    }
