#!/usr/bin/env python3
"""Turn connectivity-test.sh logs into a report you can send to an ISP.

    python3 analyze-results.py --log-dir logs --out isp-report.md

Reads every connectivity-*.csv in the log directory, then reports:
availability, packet loss, latency and jitter, download/upload speed, a
timestamped list of outages and degraded periods, and an hour-by-hour table.

Standard library only - no pip install needed.
"""

import argparse
import csv
import glob
import os
import statistics
from collections import defaultdict
from datetime import datetime, timezone

# A round counts as degraded (rather than down) when it is up but bad.
LOSS_DEGRADED_PCT = 2.0      # packet loss above this is worth reporting
LATENCY_DEGRADED_MS = 150.0  # ping RTT above this on a consumer line is poor
CONNECTIVITY_CHECKS = ("ping", "dns", "http")


def parse_args():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--log-dir", default="./logs", help="directory of connectivity-*.csv files")
    p.add_argument("--out", help="write the Markdown report here (default: stdout)")
    p.add_argument("--isp", default="", help="ISP name, used in the report header")
    p.add_argument("--account", default="", help="account or line reference to quote to the ISP")
    p.add_argument("--plan-down", type=float, default=0.0,
                   help="advertised download speed in Mbps, for comparison")
    p.add_argument("--plan-up", type=float, default=0.0,
                   help="advertised upload speed in Mbps, for comparison")
    return p.parse_args()


def load_rows(log_dir):
    files = sorted(glob.glob(os.path.join(log_dir, "connectivity-*.csv")))
    if not files:
        raise SystemExit(f"no connectivity-*.csv files found in {log_dir}")
    rows = []
    for path in files:
        with open(path, newline="") as fh:
            for r in csv.DictReader(fh):
                if not r.get("epoch_ms"):
                    continue
                try:
                    r["epoch_ms"] = int(r["epoch_ms"])
                except ValueError:
                    continue
                # Rounds restart at 1 in each run; make them unique per file.
                r["round_key"] = (os.path.basename(path), r.get("round", ""))
                for k in ("latency_ms", "loss_pct", "jitter_ms", "speed_mbps"):
                    r[k] = float(r[k]) if r.get(k) not in (None, "") else None
                rows.append(r)
    rows.sort(key=lambda r: r["epoch_ms"])
    return rows, files


def fmt_ts(epoch_ms):
    return datetime.fromtimestamp(epoch_ms / 1000, timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def fmt_dur(seconds):
    seconds = int(round(seconds))
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    return f"{seconds // 3600}h {(seconds % 3600) // 60}m"


def pct(part, whole):
    return 0.0 if not whole else 100.0 * part / whole


def percentile(values, p):
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    idx = (len(ordered) - 1) * p / 100.0
    lo, hi = int(idx), min(int(idx) + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (idx - lo)


def num(v, digits=1, suffix=""):
    return "-" if v is None else f"{v:.{digits}f}{suffix}"


def build_rounds(rows):
    """Group connectivity checks into rounds so we can spot total outages."""
    rounds = defaultdict(list)
    for r in rows:
        if r["check"] in CONNECTIVITY_CHECKS:
            rounds[r["round_key"]].append(r)
    out = []
    for key, checks in rounds.items():
        start = min(c["epoch_ms"] for c in checks)
        failed = sum(1 for c in checks if c["status"] == "fail")
        losses = [c["loss_pct"] for c in checks if c["loss_pct"] is not None]
        pings = [c["latency_ms"] for c in checks
                 if c["check"] == "ping" and c["latency_ms"] is not None]
        out.append({
            "key": key,
            "epoch_ms": start,
            "checks": len(checks),
            "failed": failed,
            "down": failed == len(checks),
            "max_loss": max(losses) if losses else None,
            "avg_ping": statistics.mean(pings) if pings else None,
        })
    out.sort(key=lambda r: r["epoch_ms"])
    return out


def find_windows(rounds, predicate):
    """Collapse consecutive rounds matching predicate into time windows."""
    windows, current = [], None
    for i, rnd in enumerate(rounds):
        if predicate(rnd):
            if current is None:
                current = {"start": rnd["epoch_ms"], "end": rnd["epoch_ms"], "rounds": 0,
                           "worst_loss": rnd["max_loss"], "worst_ping": rnd["avg_ping"]}
            current["end"] = rnd["epoch_ms"]
            current["rounds"] += 1
            for k, v in (("worst_loss", rnd["max_loss"]), ("worst_ping", rnd["avg_ping"])):
                if v is not None:
                    current[k] = v if current[k] is None else max(current[k], v)
        elif current is not None:
            # The window ended somewhere before this good round started.
            current["recovered"] = rnd["epoch_ms"]
            windows.append(current)
            current = None
    if current is not None:
        current["recovered"] = current["end"]
        windows.append(current)
    for w in windows:
        w["duration_s"] = max(0.0, (w["recovered"] - w["start"]) / 1000.0)
    return windows


def hourly_table(rows, rounds):
    buckets = defaultdict(lambda: {"checks": 0, "fails": 0, "ping": [], "loss": [],
                                   "down": [], "up": []})
    for r in rows:
        hour = datetime.fromtimestamp(r["epoch_ms"] / 1000, timezone.utc).strftime("%Y-%m-%d %H:00")
        b = buckets[hour]
        if r["check"] in CONNECTIVITY_CHECKS:
            b["checks"] += 1
            if r["status"] == "fail":
                b["fails"] += 1
        if r["check"] == "ping":
            if r["latency_ms"] is not None:
                b["ping"].append(r["latency_ms"])
            if r["loss_pct"] is not None:
                b["loss"].append(r["loss_pct"])
        if r["check"] == "speed_down" and r["speed_mbps"] is not None:
            b["down"].append(r["speed_mbps"])
        if r["check"] == "speed_up" and r["speed_mbps"] is not None:
            b["up"].append(r["speed_mbps"])

    outages = defaultdict(int)
    for rnd in rounds:
        if rnd["down"]:
            hour = datetime.fromtimestamp(rnd["epoch_ms"] / 1000, timezone.utc).strftime("%Y-%m-%d %H:00")
            outages[hour] += 1

    lines = ["| Hour (UTC) | Checks | Failed | Down rounds | Avg loss | p95 ping | Min down | Median down |",
             "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for hour in sorted(buckets):
        b = buckets[hour]
        lines.append("| {} | {} | {} ({}) | {} | {} | {} | {} | {} |".format(
            hour, b["checks"], b["fails"], num(pct(b["fails"], b["checks"]), 1, "%"),
            outages.get(hour, 0),
            num(statistics.mean(b["loss"]), 1, "%") if b["loss"] else "-",
            num(percentile(b["ping"], 95), 0, " ms"),
            num(min(b["down"]), 1, " Mbps") if b["down"] else "-",
            num(statistics.median(b["down"]), 1, " Mbps") if b["down"] else "-",
        ))
    return lines


def report(rows, files, args):
    L = []
    add = L.append

    start_ms, end_ms = rows[0]["epoch_ms"], rows[-1]["epoch_ms"]
    rounds = build_rounds(rows)
    conn = [r for r in rows if r["check"] in CONNECTIVITY_CHECKS]
    fails = [r for r in conn if r["status"] == "fail"]

    outages = find_windows(rounds, lambda r: r["down"])
    degraded = find_windows(
        rounds,
        lambda r: not r["down"] and (
            (r["max_loss"] is not None and r["max_loss"] >= LOSS_DEGRADED_PCT)
            or (r["avg_ping"] is not None and r["avg_ping"] >= LATENCY_DEGRADED_MS)
            or r["failed"] > 0))

    ping_rows = [r for r in rows if r["check"] == "ping"]
    pings = [r["latency_ms"] for r in ping_rows if r["latency_ms"] is not None]
    losses = [r["loss_pct"] for r in ping_rows if r["loss_pct"] is not None]
    jitters = [r["jitter_ms"] for r in ping_rows if r["jitter_ms"] is not None]
    downs = [r["speed_mbps"] for r in rows if r["check"] == "speed_down" and r["speed_mbps"] is not None]
    ups = [r["speed_mbps"] for r in rows if r["check"] == "speed_up" and r["speed_mbps"] is not None]

    add("# Internet connectivity report")
    add("")
    if args.isp:
        add(f"**Provider:** {args.isp}  ")
    if args.account:
        add(f"**Account / line reference:** {args.account}  ")
    add(f"**Monitoring period:** {fmt_ts(start_ms)} to {fmt_ts(end_ms)} "
        f"({fmt_dur((end_ms - start_ms) / 1000)})  ")
    add(f"**Test rounds:** {len(rounds)}  ")
    add(f"**Individual checks:** {len(rows)} ({len(conn)} connectivity, "
        f"{len(downs) + len(ups)} speed)  ")
    add(f"**Report generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    add("")
    add("All timestamps are UTC. Measurements were taken from a single machine on the "
        "customer side of the router against public reference hosts "
        "(Cloudflare 1.1.1.1, Google 8.8.8.8, and HTTPS endpoints).")
    add("")

    # --- headline ----------------------------------------------------------
    availability = pct(len(conn) - len(fails), len(conn))
    down_rounds = sum(1 for r in rounds if r["down"])
    add("## Summary")
    add("")
    add(f"- **Availability:** {availability:.2f}% of {len(conn)} connectivity checks succeeded.")
    add(f"- **Full outages:** {len(outages)} period(s) where every check failed, "
        f"covering {fmt_dur(sum(w['duration_s'] for w in outages))} "
        f"({down_rounds} of {len(rounds)} rounds).")
    add(f"- **Degraded periods:** {len(degraded)} period(s) with partial failures, "
        f"packet loss >= {LOSS_DEGRADED_PCT}%, or latency >= {LATENCY_DEGRADED_MS:.0f} ms.")
    if losses:
        add(f"- **Packet loss:** {statistics.mean(losses):.2f}% average, "
            f"{max(losses):.0f}% worst sample.")
    if pings:
        add(f"- **Latency (ICMP RTT):** median {statistics.median(pings):.0f} ms, "
            f"p95 {percentile(pings, 95):.0f} ms, max {max(pings):.0f} ms.")
    if jitters:
        add(f"- **Jitter (mdev):** median {statistics.median(jitters):.1f} ms, "
            f"max {max(jitters):.1f} ms.")
    if downs:
        line = (f"- **Download:** median {statistics.median(downs):.1f} Mbps, "
                f"slowest {min(downs):.1f} Mbps, fastest {max(downs):.1f} Mbps "
                f"({len(downs)} tests).")
        if args.plan_down:
            line += (f" Advertised {args.plan_down:.0f} Mbps - median is "
                     f"{pct(statistics.median(downs), args.plan_down):.0f}% of plan.")
        add(line)
    if ups:
        line = (f"- **Upload:** median {statistics.median(ups):.1f} Mbps, "
                f"slowest {min(ups):.1f} Mbps, fastest {max(ups):.1f} Mbps "
                f"({len(ups)} tests).")
        if args.plan_up:
            line += (f" Advertised {args.plan_up:.0f} Mbps - median is "
                     f"{pct(statistics.median(ups), args.plan_up):.0f}% of plan.")
        add(line)
    add("")

    # --- outages -----------------------------------------------------------
    add("## Outages (no connectivity at all)")
    add("")
    if not outages:
        add("No round lost every check. The line did not drop completely during the "
            "monitoring period.")
    else:
        add("| # | Started | Recovered by | Duration | Rounds affected |")
        add("|---:|---|---|---|---:|")
        for i, w in enumerate(outages, 1):
            add(f"| {i} | {fmt_ts(w['start'])} | {fmt_ts(w['recovered'])} | "
                f"{fmt_dur(w['duration_s'])} | {w['rounds']} |")
        add("")
        add("An outage window starts at the first failing round and ends at the first "
            "round that succeeded, so the true duration is between "
            "(duration - one round interval) and the value shown.")
    add("")

    # --- degraded ----------------------------------------------------------
    add("## Degraded periods (connected but impaired)")
    add("")
    if not degraded:
        add("No degraded periods recorded.")
    else:
        add("| # | Started | Ended | Duration | Worst loss | Worst avg ping |")
        add("|---:|---|---|---|---:|---:|")
        for i, w in enumerate(degraded, 1):
            add(f"| {i} | {fmt_ts(w['start'])} | {fmt_ts(w['end'])} | "
                f"{fmt_dur(w['duration_s'])} | {num(w['worst_loss'], 1, '%')} | "
                f"{num(w['worst_ping'], 0, ' ms')} |")
    add("")

    # --- per target --------------------------------------------------------
    add("## Per-target results")
    add("")
    add("| Check | Target | Samples | Failed | Success rate | Median | p95 | Max |")
    add("|---|---|---:|---:|---:|---:|---:|---:|")
    by_target = defaultdict(list)
    for r in conn:
        by_target[(r["check"], r["target"])].append(r)
    for (check, target), rs in sorted(by_target.items()):
        vals = [r["latency_ms"] for r in rs if r["latency_ms"] is not None]
        failed = sum(1 for r in rs if r["status"] == "fail")
        add(f"| {check} | {target} | {len(rs)} | {failed} | "
            f"{pct(len(rs) - failed, len(rs)):.2f}% | {num(statistics.median(vals) if vals else None, 0, ' ms')} | "
            f"{num(percentile(vals, 95), 0, ' ms')} | {num(max(vals) if vals else None, 0, ' ms')} |")
    add("")

    # --- speed detail ------------------------------------------------------
    if downs or ups:
        add("## Speed tests")
        add("")
        add("| Time (UTC) | Direction | Speed |")
        add("|---|---|---:|")
        for r in rows:
            if r["check"] in ("speed_down", "speed_up"):
                if r["status"] == "fail":
                    add(f"| {fmt_ts(r['epoch_ms'])} | "
                        f"{'download' if r['check'] == 'speed_down' else 'upload'} | failed |")
                elif r["speed_mbps"] is not None:
                    add(f"| {fmt_ts(r['epoch_ms'])} | "
                        f"{'download' if r['check'] == 'speed_down' else 'upload'} | "
                        f"{r['speed_mbps']:.1f} Mbps |")
        add("")

    # --- hourly ------------------------------------------------------------
    add("## Hour-by-hour breakdown")
    add("")
    L.extend(hourly_table(rows, rounds))
    add("")

    # --- method ------------------------------------------------------------
    add("## Method")
    add("")
    add("- Every round, the monitor sent ICMP echo requests to each reference IP "
        "(loss and jitter come from these), resolved DNS names, and fetched HTTPS "
        "endpoints. Speed tests ran on a slower cadence against Cloudflare's speed "
        "endpoints.")
    add("- A round is counted as a full outage only when every check in that round "
        "failed, which rules out a single unreachable host being reported as an outage.")
    add(f"- Raw data: {', '.join(os.path.basename(f) for f in files)} "
        "(CSV, one row per check). Available on request.")
    add("")
    return "\n".join(L) + "\n"


def main():
    args = parse_args()
    rows, files = load_rows(args.log_dir)
    if not rows:
        raise SystemExit("log files contained no data rows")
    text = report(rows, files, args)
    if args.out:
        with open(args.out, "w") as fh:
            fh.write(text)
        print(f"wrote {args.out} ({len(rows)} samples from {len(files)} log file(s))")
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
