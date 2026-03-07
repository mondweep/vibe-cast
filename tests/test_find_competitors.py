"""Tests for server/tools/find_competitors.py.

London School TDD: web_search is mocked.
"""

from unittest.mock import AsyncMock, patch

import pytest

from server.tools.find_competitors import find_competitors


class TestFindCompetitors:
    """Test find_competitors with mocked search results."""

    @pytest.mark.asyncio
    async def test_returns_competitors_list(self, mock_search_results_competitors):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, return_value=mock_search_results_competitors):
            result = await find_competitors("Stripe", "Financial Technology")

        assert "competitors" in result
        assert len(result["competitors"]) > 0

    @pytest.mark.asyncio
    async def test_competitors_have_required_fields(self, mock_search_results_competitors):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, return_value=mock_search_results_competitors):
            result = await find_competitors("Stripe", "Financial Technology")

        for comp in result["competitors"]:
            assert "name" in comp
            assert "domain" in comp
            assert "description" in comp

    @pytest.mark.asyncio
    async def test_excludes_target_company(self, mock_search_results_competitors):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, return_value=mock_search_results_competitors):
            result = await find_competitors("Stripe", "Financial Technology")

        competitor_names = [c["name"].lower() for c in result["competitors"]]
        assert "stripe" not in competitor_names

    @pytest.mark.asyncio
    async def test_handles_empty_results(self):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, return_value=[]):
            result = await find_competitors("UnknownCo", "Unknown Sector")

        assert result["competitors"] == []

    @pytest.mark.asyncio
    async def test_handles_search_exception(self):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, side_effect=Exception("fail")):
            result = await find_competitors("Stripe", "FinTech")

        assert "error" in result
        assert result["competitors"] == []

    @pytest.mark.asyncio
    async def test_limits_to_max_competitors(self, mock_search_results_competitors):
        with patch("server.tools.find_competitors.web_search", new_callable=AsyncMock, return_value=mock_search_results_competitors):
            result = await find_competitors("Stripe", "Financial Technology")

        assert len(result["competitors"]) <= 3
