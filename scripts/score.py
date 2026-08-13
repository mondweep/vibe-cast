#!/usr/bin/env python3
"""Aggregate plugin evaluations into a leaderboard.

Reads the front matter of every evaluations/*.md file, applies the weights and
override rules from docs/evaluation-framework.md, and writes docs/leaderboard.md.

    python3 scripts/score.py            # write docs/leaderboard.md
    python3 scripts/score.py --print    # print to stdout, write nothing
    python3 scripts/score.py --stale    # list evaluations past their re-check date

Standard library only.
"""

import argparse
import datetime
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVAL_DIR = ROOT / "evaluations"
LEADERBOARD = ROOT / "docs" / "leaderboard.md"

# (front-matter key, display name, weight)
CRITERIA = [
    ("job_fit", "Job fit", 20),
    ("activation", "Activation", 20),
    ("output_quality", "Output quality", 20),
    ("setup_cost", "Setup cost", 10),
    ("data_trust", "Data trust", 15),
    ("overhead", "Overhead", 15),
]

# Weakest to strongest; comparison by index gives us the override caps.
BANDS = ["Drop", "Hold", "Trial", "Adopt"]

# Days until an evaluation is due for a re-check, by verdict.
CADENCE_DAYS = {"Adopt": 365, "Trial": 90}


def parse_front_matter(text):
    """Parse the restricted YAML subset used by the evaluation template.

    Supports top-level `key: value` pairs and a single level of two-space-indented
    children. Empty values become None. Anything else is not supported on purpose —
    the template is the contract.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("file does not start with a front-matter fence")
    try:
        end = lines.index("---", 1)
    except ValueError:
        raise ValueError("front matter is not closed") from None

    data = {}
    parent = None
    for raw in lines[1:end]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if ":" not in raw:
            raise ValueError(f"malformed front-matter line: {raw!r}")
        key, _, value = raw.partition(":")
        value = value.strip()
        indented = raw.startswith("  ")
        key = key.strip()

        if indented:
            if parent is None:
                raise ValueError(f"indented key {key!r} has no parent")
            data[parent][key] = value or None
        else:
            if value:
                data[key] = value
                parent = None
            else:
                # A bare `key:` opens a block; it collapses to None if nothing follows.
                data[key] = {}
                parent = key
    for key, value in list(data.items()):
        if value == {}:
            data[key] = None
    return data


def to_int(value, field, path):
    if value is None:
        return None
    try:
        n = int(value)
    except ValueError:
        raise ValueError(f"{path.name}: {field} is not a number: {value!r}") from None
    if not 0 <= n <= 5:
        raise ValueError(f"{path.name}: {field} out of range 0-5: {n}")
    return n


def band_for(score):
    if score >= 75:
        return "Adopt"
    if score >= 55:
        return "Trial"
    if score >= 35:
        return "Hold"
    return "Drop"


def cap(band, ceiling):
    return band if BANDS.index(band) <= BANDS.index(ceiling) else ceiling


def evaluate(path):
    fm = parse_front_matter(path.read_text())
    name = fm.get("plugin") or path.stem
    status = fm.get("status") or "pending"
    scores_raw = fm.get("scores") or {}
    scores = {k: to_int(scores_raw.get(k), k, path) for k, _, _ in CRITERIA}

    record = {
        "name": name,
        "marketplace": path.parent.name,
        "category": fm.get("category") or "-",
        "status": status,
        "evaluated": fm.get("evaluated"),
        "collisions": fm.get("collisions"),
        "scores": scores,
        "score": None,
        "verdict": None,
        "overrides": [],
        "path": path,
    }

    if status == "blocked":
        record["verdict"] = "Blocked"
        return record
    if any(v is None for v in scores.values()):
        record["verdict"] = "Pending"
        return record

    total = sum(scores[key] / 5 * weight for key, _, weight in CRITERIA)
    verdict = band_for(total)

    if any(v == 0 for v in scores.values()):
        verdict = cap(verdict, "Hold")
        record["overrides"].append("a criterion scored 0 -> capped at Hold")
    if scores["data_trust"] <= 2:
        verdict = cap(verdict, "Trial")
        record["overrides"].append("data trust <= 2 -> capped at Trial")
    if scores["activation"] <= 2:
        verdict = cap(verdict, "Hold")
        record["overrides"].append("activation <= 2 -> capped at Hold")

    record["score"] = round(total, 1)
    record["verdict"] = verdict
    return record


def sort_key(r):
    # Scored entries first, highest score first; then blocked, then pending, by name.
    rank = {"Pending": 2, "Blocked": 1}.get(r["verdict"], 0)
    return (rank, -(r["score"] or 0), r["name"])


def render(records):
    today = datetime.date.today().isoformat()
    out = [
        "# Plugin Leaderboard",
        "",
        f"Generated by `scripts/score.py` on {today}. Do not edit by hand — "
        "edit the evaluations and re-run.",
        "",
        "Weights and verdict bands: [evaluation-framework.md](./evaluation-framework.md).",
    ]

    for marketplace in sorted({r["marketplace"] for r in records}):
        out += [
            "",
            f"## {marketplace}",
            "",
            "| Plugin | Category | Score | Verdict | "
            + " | ".join(label for _, label, _ in CRITERIA)
            + " |",
            "|---|---|---:|---|" + "---:|" * len(CRITERIA),
        ]
        for r in (x for x in records if x["marketplace"] == marketplace):
            cells = [
                "" if r["scores"][key] is None else str(r["scores"][key])
                for key, _, _ in CRITERIA
            ]
            score = "" if r["score"] is None else f"{r['score']:.1f}"
            link = f"../evaluations/{marketplace}/{r['path'].name}"
            out.append(
                f"| [{r['name']}]({link}) | {r['category']} | "
                f"{score} | {r['verdict']} | " + " | ".join(cells) + " |"
            )

    counts = {}
    for r in records:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    out += ["", "## Summary", ""]
    for band in BANDS[::-1] + ["Blocked", "Pending"]:
        if band in counts:
            out.append(f"- **{band}**: {counts[band]}")

    overridden = [r for r in records if r["overrides"]]
    if overridden:
        out += ["", "## Overrides applied", ""]
        for r in overridden:
            out.append(f"- **{r['name']}** — {'; '.join(r['overrides'])}")

    collisions = [r for r in records if r["collisions"]]
    if collisions:
        out += ["", "## Collisions", ""]
        for r in collisions:
            out.append(f"- **{r['name']}** — {r['collisions']}")

    return "\n".join(out) + "\n"


def report_stale(records):
    today = datetime.date.today()
    stale = []
    for r in records:
        days = CADENCE_DAYS.get(r["verdict"])
        if not days or not r["evaluated"]:
            continue
        try:
            when = datetime.date.fromisoformat(r["evaluated"])
        except ValueError:
            print(f"{r['name']}: unparseable date {r['evaluated']!r}", file=sys.stderr)
            continue
        due = when + datetime.timedelta(days=days)
        if due < today:
            stale.append((r["name"], r["verdict"], due, (today - due).days))
    if not stale:
        print("Nothing overdue.")
        return
    for name, verdict, due, over in sorted(stale, key=lambda s: s[2]):
        print(f"{name} ({verdict}) was due {due} — {over} days overdue")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--print", dest="to_stdout", action="store_true",
                    help="print the leaderboard instead of writing it")
    ap.add_argument("--stale", action="store_true",
                    help="list evaluations past their re-check date")
    args = ap.parse_args()

    # TEMPLATE.md is the shape, not an evaluation; `_`-prefixed files are illustrative.
    paths = sorted(
        p for p in EVAL_DIR.glob("*/*.md")
        if p.name != "TEMPLATE.md" and not p.name.startswith("_")
    )
    if not paths:
        sys.exit(f"no evaluations found in {EVAL_DIR}")

    records = []
    for path in paths:
        try:
            records.append(evaluate(path))
        except ValueError as exc:
            sys.exit(f"error: {exc}")
    records.sort(key=sort_key)

    if args.stale:
        report_stale(records)
        return

    text = render(records)
    if args.to_stdout:
        print(text, end="")
    else:
        LEADERBOARD.write_text(text)
        print(f"wrote {LEADERBOARD.relative_to(ROOT)} ({len(records)} evaluations)")


if __name__ == "__main__":
    main()
