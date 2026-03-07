"""Tests for server/utils/search.py — DuckDuckGo search wrapper with rate limiting.

London School TDD: DDGS is mocked at the boundary.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from server.utils.search import web_search, SearchRateLimiter


class TestWebSearch:
    """Test the web_search function with mocked DDGS."""

    @pytest.mark.asyncio
    async def test_returns_results_for_valid_query(self, mock_search_results_stripe):
        mock_ddgs = MagicMock()
        mock_ddgs.text.return_value = mock_search_results_stripe

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            results = await web_search("Stripe company", max_results=3)

        assert len(results) == 3
        assert results[0]["title"] == "Stripe | Financial Infrastructure for the Internet"
        assert results[0]["href"] == "https://stripe.com"
        mock_ddgs.text.assert_called_once_with("Stripe company", max_results=3)

    @pytest.mark.asyncio
    async def test_returns_empty_list_on_no_results(self):
        mock_ddgs = MagicMock()
        mock_ddgs.text.return_value = []

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            results = await web_search("xyznotacompany123")

        assert results == []

    @pytest.mark.asyncio
    async def test_uses_default_max_results(self):
        mock_ddgs = MagicMock()
        mock_ddgs.text.return_value = []

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            await web_search("test query")

        mock_ddgs.text.assert_called_once_with("test query", max_results=5)

    @pytest.mark.asyncio
    async def test_retries_on_rate_limit_then_succeeds(self, mock_search_results_stripe):
        from duckduckgo_search.exceptions import RatelimitException

        mock_ddgs = MagicMock()
        mock_ddgs.text.side_effect = [
            RatelimitException("rate limited"),
            mock_search_results_stripe,
        ]

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                results = await web_search("Stripe company", max_results=3)

        assert len(results) == 3

    @pytest.mark.asyncio
    async def test_returns_empty_after_max_retries(self):
        from duckduckgo_search.exceptions import RatelimitException

        mock_ddgs = MagicMock()
        mock_ddgs.text.side_effect = RatelimitException("rate limited")

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                results = await web_search("test", max_results=3, max_retries=2)

        assert results == []

    @pytest.mark.asyncio
    async def test_returns_empty_on_unexpected_exception(self):
        mock_ddgs = MagicMock()
        mock_ddgs.text.side_effect = Exception("network error")

        with patch("server.utils.search.DDGS", return_value=mock_ddgs):
            results = await web_search("test")

        assert results == []


class TestSearchRateLimiter:
    """Test the rate limiter enforces minimum delay between requests."""

    @pytest.mark.asyncio
    async def test_first_call_executes_immediately(self):
        limiter = SearchRateLimiter(min_interval=1.0)
        called = False

        async def action():
            nonlocal called
            called = True
            return "result"

        result = await limiter.execute(action)
        assert called
        assert result == "result"

    @pytest.mark.asyncio
    async def test_enforces_minimum_interval(self):
        limiter = SearchRateLimiter(min_interval=0.1)
        call_times = []

        async def action():
            call_times.append(asyncio.get_event_loop().time())
            return "ok"

        await limiter.execute(action)
        await limiter.execute(action)

        assert len(call_times) == 2
        elapsed = call_times[1] - call_times[0]
        assert elapsed >= 0.09  # allow small timing tolerance
