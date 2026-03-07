"""Tests for server/utils/scraper.py — web content extractor.

London School TDD: httpx and trafilatura are mocked at the boundary.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from server.utils.scraper import scrape_url, scrape_multiple


class TestScrapeUrl:
    """Test scrape_url with mocked httpx and trafilatura."""

    @pytest.mark.asyncio
    async def test_returns_extracted_content(self, mock_scraped_content):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body>Raw HTML content</body></html>"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("server.utils.scraper.httpx.AsyncClient", return_value=mock_client):
            with patch("server.utils.scraper.trafilatura.extract", return_value=mock_scraped_content):
                result = await scrape_url("https://stripe.com/pricing")

        assert result == mock_scraped_content

    @pytest.mark.asyncio
    async def test_returns_none_on_non_200_status(self):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not found"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("server.utils.scraper.httpx.AsyncClient", return_value=mock_client):
            result = await scrape_url("https://stripe.com/nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_trafilatura_extracts_nothing(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body></body></html>"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("server.utils.scraper.httpx.AsyncClient", return_value=mock_client):
            with patch("server.utils.scraper.trafilatura.extract", return_value=None):
                result = await scrape_url("https://example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_timeout(self):
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("timeout")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("server.utils.scraper.httpx.AsyncClient", return_value=mock_client):
            result = await scrape_url("https://slow-site.com")

        assert result is None


class TestScrapeMultiple:
    """Test scrape_multiple with mocked scrape_url."""

    @pytest.mark.asyncio
    async def test_returns_results_for_multiple_urls(self):
        with patch("server.utils.scraper.scrape_url") as mock_scrape:
            mock_scrape.side_effect = [
                "Content from page 1",
                "Content from page 2",
                None,
            ]
            results = await scrape_multiple([
                "https://example.com/1",
                "https://example.com/2",
                "https://example.com/3",
            ])

        assert len(results) == 2
        assert "Content from page 1" in results
        assert "Content from page 2" in results

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_all_fail(self):
        with patch("server.utils.scraper.scrape_url", return_value=None):
            results = await scrape_multiple([
                "https://example.com/1",
                "https://example.com/2",
            ])

        assert results == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_for_empty_input(self):
        results = await scrape_multiple([])
        assert results == []
