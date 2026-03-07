"""Tests for server/tools/identify_sector.py.

London School TDD: web_search is mocked.
"""

from unittest.mock import AsyncMock, patch

import pytest

from server.tools.identify_sector import identify_sector


class TestIdentifySector:
    """Test identify_sector with mocked search results."""

    @pytest.mark.asyncio
    async def test_returns_sector_for_known_company(self, mock_search_results_sector):
        with patch("server.tools.identify_sector.web_search", new_callable=AsyncMock, return_value=mock_search_results_sector):
            result = await identify_sector("Stripe", "stripe.com")

        assert "sector" in result
        assert len(result["sector"]) > 0
        assert "description" in result

    @pytest.mark.asyncio
    async def test_returns_sub_sector(self, mock_search_results_sector):
        with patch("server.tools.identify_sector.web_search", new_callable=AsyncMock, return_value=mock_search_results_sector):
            result = await identify_sector("Stripe", "stripe.com")

        assert "sub_sector" in result

    @pytest.mark.asyncio
    async def test_handles_empty_results(self):
        with patch("server.tools.identify_sector.web_search", new_callable=AsyncMock, return_value=[]):
            result = await identify_sector("UnknownCo", "unknown.com")

        assert result["sector"] == "Unknown"

    @pytest.mark.asyncio
    async def test_handles_search_exception(self):
        with patch("server.tools.identify_sector.web_search", new_callable=AsyncMock, side_effect=Exception("fail")):
            result = await identify_sector("Stripe", "stripe.com")

        assert "error" in result

    @pytest.mark.asyncio
    async def test_searches_with_company_name_and_domain(self, mock_search_results_sector):
        mock_search = AsyncMock(return_value=mock_search_results_sector)

        with patch("server.tools.identify_sector.web_search", mock_search):
            await identify_sector("Stripe", "stripe.com")

        call_args = mock_search.call_args[0][0]
        assert "Stripe" in call_args
