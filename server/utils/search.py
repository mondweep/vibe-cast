"""DuckDuckGo search wrapper with rate limiting.

Provides a web_search() async function that wraps duckduckgo-search
with a token-bucket rate limiter and exponential backoff on rate limit errors.
"""

import asyncio
import logging
import os
import time

from duckduckgo_search import DDGS
from duckduckgo_search.exceptions import RatelimitException

logger = logging.getLogger(__name__)

_DEFAULT_MAX_RESULTS = int(os.getenv("MAX_SEARCH_RESULTS", "5"))
_DEFAULT_RATE_LIMIT = float(os.getenv("SEARCH_RATE_LIMIT", "1.0"))
_DEFAULT_MAX_RETRIES = int(os.getenv("SEARCH_MAX_RETRIES", "3"))
_DEFAULT_BACKOFF_BASE = float(os.getenv("SEARCH_BACKOFF_BASE", "2.0"))


class SearchRateLimiter:
    """Enforces minimum interval between search requests."""

    def __init__(self, min_interval: float = _DEFAULT_RATE_LIMIT):
        self._min_interval = min_interval
        self._lock = asyncio.Lock()
        self._last_call: float = 0.0

    async def execute(self, coro_func):
        async with self._lock:
            now = asyncio.get_event_loop().time()
            wait = self._min_interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            result = await coro_func()
            self._last_call = asyncio.get_event_loop().time()
            return result


# Global rate limiter shared across all tool invocations in a single run
_rate_limiter = SearchRateLimiter()


async def web_search(
    query: str,
    max_results: int = _DEFAULT_MAX_RESULTS,
    max_retries: int = _DEFAULT_MAX_RETRIES,
    backoff_base: float = _DEFAULT_BACKOFF_BASE,
) -> list[dict]:
    """Search DuckDuckGo and return results.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return.
        max_retries: Max retries on rate limit errors.
        backoff_base: Exponential backoff multiplier.

    Returns:
        A list of dicts with keys: title, href, body.
        Returns empty list on failure.
    """

    async def _do_search():
        ddgs = DDGS()
        return ddgs.text(query, max_results=max_results)

    for attempt in range(max_retries + 1):
        try:
            results = await _rate_limiter.execute(_do_search)
            return results if results else []
        except RatelimitException:
            if attempt < max_retries:
                wait = backoff_base ** attempt
                logger.warning(
                    "DuckDuckGo rate limit hit, retrying in %.1fs (attempt %d/%d)",
                    wait, attempt + 1, max_retries,
                )
                await asyncio.sleep(wait)
            else:
                logger.error("DuckDuckGo rate limit exhausted after %d retries", max_retries)
                return []
        except Exception:
            logger.exception("Unexpected error during web search for '%s'", query)
            return []

    return []
