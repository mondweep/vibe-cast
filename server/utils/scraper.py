"""Web content extractor using httpx + trafilatura.

Provides scrape_url() and scrape_multiple() async functions for
fetching and extracting readable content from web pages.
"""

import logging
import os

import httpx
import trafilatura

logger = logging.getLogger(__name__)

_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))


async def scrape_url(url: str, timeout: int = _TIMEOUT) -> str | None:
    """Fetch a URL and extract its main text content.

    Args:
        url: The URL to scrape.
        timeout: HTTP request timeout in seconds.

    Returns:
        Extracted text content, or None if extraction fails.
    """
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; research-bot)"},
        ) as client:
            response = await client.get(url)

        if response.status_code != 200:
            logger.warning("Non-200 status %d for %s", response.status_code, url)
            return None

        content = trafilatura.extract(response.text)
        if not content:
            logger.debug("No content extracted from %s", url)
            return None

        return content

    except Exception:
        logger.exception("Failed to scrape %s", url)
        return None


async def scrape_multiple(urls: list[str], timeout: int = _TIMEOUT) -> list[str]:
    """Scrape multiple URLs and return successfully extracted content.

    Args:
        urls: List of URLs to scrape.
        timeout: HTTP request timeout in seconds per request.

    Returns:
        List of extracted text content (only successful extractions).
    """
    if not urls:
        return []

    results = []
    for url in urls:
        content = await scrape_url(url, timeout=timeout)
        if content:
            results.append(content)

    return results
