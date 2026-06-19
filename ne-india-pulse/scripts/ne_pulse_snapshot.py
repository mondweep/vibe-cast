#!/usr/bin/env python3
"""NE India Pulse — proof-of-concept snapshot from live GDELT GKG raw files.

Answers "what is North East India talking about today?" by aggregating GDELT
2.0 Global Knowledge Graph 15-minute files and filtering to the 8 NE-Indian
states via their FIPS 10-4 ADM1 codes.

This is a Phase-0 spike (not production code) — it deliberately uses only the
free, no-key raw-file path (data.gdeltproject.org), which also sidesteps the
DOC API host being unreachable in some networks.

Usage:
    python3 ne_pulse_snapshot.py [--hours 6]

Stdlib only; no dependencies.
"""
from __future__ import annotations
import argparse, collections, csv, datetime as dt, io, sys, urllib.request, zipfile

csv.field_size_limit(sys.maxsize)

GDELT_BASE = "http://data.gdeltproject.org/gdeltv2"
LASTUPDATE = f"{GDELT_BASE}/lastupdate.txt"

# FIPS 10-4 ADM1 codes (== GDELT ADM1Code) for the 8 North East Indian states.
# Verified empirically against live GKG data on 2026-06-19.
NE_STATES = {
    "IN03": "Assam", "IN17": "Manipur", "IN18": "Meghalaya", "IN20": "Nagaland",
    "IN26": "Tripura", "IN29": "Sikkim", "IN30": "Arunachal Pradesh", "IN31": "Mizoram",
}

# GKG 2.1 tab-delimited column indices we use.
COL = {"domain": 3, "url": 4, "themes": 7, "locations": 9,
       "persons": 11, "orgs": 13, "tone": 15}

# Structural/generic GKG themes that add noise to a topical view.
NOISE_THEMES = {
    "EPU_POLICY", "USPEC_POLICY1", "EPU_ECONOMY", "LEADER",
    "GENERAL_GOVERNMENT", "CRISISLEX_CRISISLEXREC",
}


def latest_slice() -> dt.datetime:
    """Most recent published 15-minute slice, from lastupdate.txt."""
    txt = urllib.request.urlopen(LASTUPDATE, timeout=30).read().decode()
    stamp = txt.split("\n")[0].split("/")[-1].split(".")[0]  # YYYYMMDDHHMMSS
    return dt.datetime.strptime(stamp, "%Y%m%d%H%M%S")


def slice_urls(latest: dt.datetime, hours: float):
    n = int(hours * 4)  # 4 slices per hour
    for i in range(n):
        ts = (latest - dt.timedelta(minutes=15 * i)).strftime("%Y%m%d%H%M%S")
        yield ts, f"{GDELT_BASE}/{ts}.gkg.csv.zip"


def ne_states_in(locations: str) -> set[str]:
    hits = set()
    for loc in locations.split(";"):
        parts = loc.split("#")
        if len(parts) >= 4 and parts[3] in NE_STATES:
            hits.add(NE_STATES[parts[3]])
    return hits


def aggregate(hours: float) -> dict:
    latest = latest_slice()
    agg = {k: collections.Counter() for k in
           ("themes", "persons", "orgs", "states", "domains")}
    tones, articles, slices = [], [], 0
    for ts, url in slice_urls(latest, hours):
        try:
            blob = urllib.request.urlopen(url, timeout=40).read()
            zf = zipfile.ZipFile(io.BytesIO(blob))
            text = zf.read(zf.namelist()[0]).decode("utf-8", "replace")
        except Exception as exc:  # missing slice / transient error: skip
            print(f"  skip {ts}: {exc}", file=sys.stderr)
            continue
        slices += 1
        for row in csv.reader(io.StringIO(text), delimiter="\t"):
            if len(row) <= COL["tone"]:
                continue
            hits = ne_states_in(row[COL["locations"]])
            if not hits:
                continue
            for s in hits:
                agg["states"][s] += 1
            for t in row[COL["themes"]].split(";"):
                t = t.strip()
                if t and t not in NOISE_THEMES and not t.startswith("TAX_"):
                    agg["themes"][t] += 1
            for p in filter(None, (x.strip() for x in row[COL["persons"]].split(";"))):
                agg["persons"][p] += 1
            for o in filter(None, (x.strip() for x in row[COL["orgs"]].split(";"))):
                agg["orgs"][o] += 1
            try:
                tones.append(float(row[COL["tone"]].split(",")[0]))
            except ValueError:
                pass
            agg["domains"][row[COL["domain"]]] += 1
            articles.append((sorted(hits), row[COL["url"]]))
    return {"latest": latest, "slices": slices, "tones": tones,
            "articles": articles, **agg}


def report(r: dict) -> None:
    latest, slices = r["latest"], r["slices"]
    start = latest - dt.timedelta(minutes=15 * (slices - 1))
    n = len(r["articles"])
    print("=== NE INDIA PULSE — GDELT snapshot ===")
    print(f"Window: {start:%Y-%m-%d %H:%M} -> {latest:%Y-%m-%d %H:%M} UTC "
          f"({slices} x 15-min slices)")
    print(f"NE-India geocoded articles: {n}")
    if r["tones"]:
        avg = sum(r["tones"]) / len(r["tones"])
        neg = sum(1 for x in r["tones"] if x < 0)
        print(f"Avg tone: {avg:+.2f}  ({neg} neg / {len(r['tones']) - neg} non-neg)")
    for title, key, k in (("Articles per state", "states", 8),
                          ("Top themes", "themes", 20),
                          ("Top persons", "persons", 12),
                          ("Top organizations", "orgs", 10),
                          ("Top sources", "domains", 10)):
        print(f"\n{title}:")
        for name, c in r[key].most_common(k):
            print(f"  {c:3d}  {name}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--hours", type=float, default=6.0,
                    help="hours of 15-min slices to aggregate (default 6)")
    report(aggregate(ap.parse_args().hours))


if __name__ == "__main__":
    main()
