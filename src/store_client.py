"""
Client for the Cognitum Seed RVF vector store.

Talks to the seed's localhost-trusted internal endpoints via an SSH tunnel:
    ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1

Wire format (reverse-engineered via strace of the neural-trader cog):
    POST /api/v1/store/ingest  {"dedup": bool, "vectors": [[id, [v0..v7]], ...]}
    POST /api/v1/store/query   {"k": int, "metric": "cosine", "vector": [v0..v7]}
"""

from __future__ import annotations

from typing import Iterable, Sequence

import requests

BASE = "http://localhost:9080"
DIM = 8


class StoreClient:
    def __init__(self, base: str = BASE, timeout: float = 10.0) -> None:
        self.base = base
        self.timeout = timeout
        self.session = requests.Session()

    def ingest(
        self,
        vectors: Iterable[tuple[int, Sequence[float]]],
        dedup: bool = False,
    ) -> dict:
        payload = {
            "dedup": dedup,
            "vectors": [[int(i), [float(x) for x in v]] for i, v in vectors],
        }
        r = self.session.post(
            f"{self.base}/api/v1/store/ingest", json=payload, timeout=self.timeout
        )
        r.raise_for_status()
        return r.json()

    def query(
        self, vector: Sequence[float], k: int = 10, metric: str = "cosine"
    ) -> list[dict]:
        if len(vector) != DIM:
            raise ValueError(f"vector dim must be {DIM}, got {len(vector)}")
        payload = {"k": k, "metric": metric, "vector": [float(x) for x in vector]}
        r = self.session.post(
            f"{self.base}/api/v1/store/query", json=payload, timeout=self.timeout
        )
        r.raise_for_status()
        return r.json().get("results", [])

    def status(self) -> dict:
        r = self.session.get(f"{self.base}/api/v1/status", timeout=self.timeout)
        r.raise_for_status()
        return r.json()
