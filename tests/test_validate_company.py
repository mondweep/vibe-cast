"""Tests for server/tools/validate_company.py.

London School TDD: web_search is mocked.
"""

from unittest.mock import AsyncMock, patch

import pytest

from server.tools.validate_company import validate_company


class TestValidateCompany:
    """Test validate_company with mocked search results."""

    @pytest.mark.asyncio
    async def test_valid_company_returns_correct_structure(self, mock_search_results_stripe):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, return_value=mock_search_results_stripe):
            result = await validate_company("Stripe")

        assert result["valid"] is True
        assert result["name"] == "Stripe"
        assert "stripe.com" in result["domain"]
        assert len(result["description"]) > 0

    @pytest.mark.asyncio
    async def test_invalid_company_returns_valid_false(self, mock_search_results_invalid):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, return_value=mock_search_results_invalid):
            result = await validate_company("xyznotacompany123")

        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_empty_search_results_returns_valid_false(self):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, return_value=[]):
            result = await validate_company("xyznotacompany123")

        assert result["valid"] is False
        assert result["name"] == "xyznotacompany123"

    @pytest.mark.asyncio
    async def test_extracts_domain_from_href(self, mock_search_results_stripe):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, return_value=mock_search_results_stripe):
            result = await validate_company("Stripe")

        assert result["domain"] == "stripe.com"

    @pytest.mark.asyncio
    async def test_returns_description_from_top_result(self, mock_search_results_stripe):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, return_value=mock_search_results_stripe):
            result = await validate_company("Stripe")

        assert "financial" in result["description"].lower() or "payment" in result["description"].lower()

    @pytest.mark.asyncio
    async def test_handles_search_exception_gracefully(self):
        with patch("server.tools.validate_company.web_search", new_callable=AsyncMock, side_effect=Exception("search failed")):
            result = await validate_company("Stripe")

        assert result["valid"] is False
        assert "error" in result
