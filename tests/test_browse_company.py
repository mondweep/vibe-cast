"""Tests for server/tools/browse_company.py.

London School TDD: web_search and scrape_url/scrape_multiple are mocked.
"""

from unittest.mock import AsyncMock, patch

import pytest

from server.tools.browse_company import browse_company, build_search_query


class TestQueryBuilders:
    """Test category-specific search query builders."""

    def test_pricing_query(self):
        query = build_search_query("Stripe", "stripe.com", "pricing")
        assert "Stripe" in query
        assert "pricing" in query.lower()

    def test_products_query(self):
        query = build_search_query("Stripe", "stripe.com", "products")
        assert "Stripe" in query
        assert "product" in query.lower()

    def test_marketing_query(self):
        query = build_search_query("Stripe", "stripe.com", "marketing")
        assert "Stripe" in query
        assert "marketing" in query.lower() or "brand" in query.lower()

    def test_market_position_query(self):
        query = build_search_query("Stripe", "stripe.com", "market_position")
        assert "Stripe" in query
        assert "market" in query.lower()

    def test_unknown_category_uses_generic_query(self):
        query = build_search_query("Stripe", "stripe.com", "unknown_cat")
        assert "Stripe" in query


class TestExtraction:
    """Test content extraction pipeline."""

    @pytest.mark.asyncio
    async def test_returns_data_for_single_category(self):
        mock_results = [
            {"title": "Stripe Pricing", "href": "https://stripe.com/pricing", "body": "2.9% + 30c"},
            {"title": "Stripe Plans", "href": "https://example.com/stripe", "body": "Enterprise pricing"},
        ]

        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, return_value=mock_results):
            with patch("server.tools.browse_company.scrape_multiple", new_callable=AsyncMock, return_value=["Detailed pricing: 2.9% + 30c per charge"]):
                result = await browse_company("Stripe", "stripe.com", ["pricing"])

        assert "pricing" in result
        assert len(result["pricing"]) > 0
        assert result["categories_failed"] == []

    @pytest.mark.asyncio
    async def test_returns_data_for_multiple_categories(self):
        mock_results = [
            {"title": "Test", "href": "https://example.com", "body": "content"},
        ]

        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, return_value=mock_results):
            with patch("server.tools.browse_company.scrape_multiple", new_callable=AsyncMock, return_value=["Scraped content here"]):
                result = await browse_company("Stripe", "stripe.com", ["pricing", "products"])

        assert "pricing" in result
        assert "products" in result

    @pytest.mark.asyncio
    async def test_falls_back_to_search_snippets_when_scrape_empty(self):
        mock_results = [
            {"title": "Stripe Info", "href": "https://example.com", "body": "Useful snippet about Stripe"},
        ]

        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, return_value=mock_results):
            with patch("server.tools.browse_company.scrape_multiple", new_callable=AsyncMock, return_value=[]):
                result = await browse_company("Stripe", "stripe.com", ["pricing"])

        # Should still have content from search snippets
        assert "pricing" in result
        assert len(result["pricing"]) > 0


class TestPartialFailure:
    """Test partial failure handling."""

    @pytest.mark.asyncio
    async def test_records_failed_categories(self):
        async def failing_search(query, **kwargs):
            if "pricing" in query.lower():
                return [{"title": "T", "href": "https://x.com", "body": "b"}]
            raise Exception("search failed")

        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, side_effect=failing_search):
            with patch("server.tools.browse_company.scrape_multiple", new_callable=AsyncMock, return_value=["content"]):
                result = await browse_company("Stripe", "stripe.com", ["pricing", "products"])

        assert "pricing" in result
        assert "products" in result["categories_failed"]

    @pytest.mark.asyncio
    async def test_all_categories_fail(self):
        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, side_effect=Exception("fail")):
            result = await browse_company("Stripe", "stripe.com", ["pricing", "products"])

        assert len(result["categories_failed"]) == 2

    @pytest.mark.asyncio
    async def test_empty_categories_input(self):
        result = await browse_company("Stripe", "stripe.com", [])

        assert result["categories_failed"] == []

    @pytest.mark.asyncio
    async def test_handles_all_default_categories(self):
        mock_results = [
            {"title": "T", "href": "https://x.com", "body": "body content"},
        ]

        with patch("server.tools.browse_company.web_search", new_callable=AsyncMock, return_value=mock_results):
            with patch("server.tools.browse_company.scrape_multiple", new_callable=AsyncMock, return_value=["content"]):
                result = await browse_company("Stripe", "stripe.com")

        # Default categories should all be present
        for cat in ["pricing", "products", "marketing", "market_position"]:
            assert cat in result
