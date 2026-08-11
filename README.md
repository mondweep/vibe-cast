# Overnight internet connectivity testing

Standalone tooling to prove out a patchy internet line: leave it running
overnight, and in the morning generate a timestamped report you can send to
your ISP.

This is an **orphan branch** — it shares no history with `main` and contains
none of the application code. It exists purely to hold this diagnostic
toolkit.

Two files, no dependencies beyond `bash`, `curl` and `python3`:

- `connectivity-test.sh` — runs a round of checks every minute and appends CSV rows.
- `analyze-results.py` — turns those CSV logs into a Markdown report for the ISP.

## Tonight: start the test

```bash
chmod +x connectivity-test.sh
./connectivity-test.sh --hours 10 | tee run.log
```

Leave the terminal open. To survive a closed laptop lid / SSH disconnect:

```bash
nohup ./connectivity-test.sh --hours 10 > run.log 2>&1 &
```

Defaults: a round every 60 seconds, a speed test every 30 minutes. Each round
measures

| Check | What it tells the ISP |
|---|---|
| ICMP ping to `1.1.1.1` and `8.8.8.8` (10 packets) | packet loss, latency, jitter |
| DNS lookup of `www.google.com`, `cloudflare.com` | resolver failures — a common cause of "internet is down" |
| HTTPS fetch of Google and Cloudflare endpoints | whether real traffic completes, plus TLS/TTFB timings |
| Download + upload against Cloudflare's speed endpoints | throughput vs. your advertised plan |

Useful flags:

```bash
./connectivity-test.sh --interval 30        # more granular, more data
./connectivity-test.sh --speed-every 15     # speed test every 15 min
./connectivity-test.sh --no-speed           # latency/loss only (no bandwidth use)
./connectivity-test.sh --log-dir /var/log/connectivity
```

A speed test moves ~25 MB down and ~5 MB up. At the default cadence that is
roughly 600 MB down / 120 MB up over ten hours — check your data cap before
running it on a metered connection, or use `--no-speed`.

## In the morning: generate the report

```bash
python3 analyze-results.py --log-dir logs --out isp-report.md \
    --isp "Your ISP" --account "Account 12345678" \
    --plan-down 500 --plan-up 50
```

`--plan-down` / `--plan-up` are your advertised speeds; passing them adds a
"median is N% of plan" line, which is the sentence ISPs respond to. The report
contains:

- headline availability, loss, latency, jitter and speed figures;
- a table of **outages** — windows where every check failed, with start,
  recovery and duration;
- a table of **degraded periods** — connected but with loss ≥ 2% or latency
  ≥ 150 ms;
- per-target success rates, so a single dead host is not mistaken for an outage;
- every speed test result with a timestamp;
- an hour-by-hour breakdown showing when the line is worst.

Send `isp-report.md` and attach the raw `logs/connectivity-*.csv` — the raw CSV
is what a network engineer will actually want.

## Getting a report the ISP can't wave away

- **Test wired if you can.** Plug into the router over Ethernet. Otherwise the
  first response will be "it's your Wi‑Fi", and they will be hard to argue with.
- **Run it on a machine that stays awake.** Disable sleep; a sleeping laptop
  looks exactly like an outage in the log.
- **Note anything physical** — a reboot, a storm, someone streaming — the log
  cannot see these, and unexplained gaps weaken the report.
- **Run more than one night** if the fault is intermittent. Point `--log-dir`
  at the same directory each night and the analyzer will cover all of them in
  one report.
- Latency to `1.1.1.1`/`8.8.8.8` includes your ISP's network but nothing beyond
  it, which is what makes it fair evidence about their line.

## Log format

`logs/connectivity-YYYY-MM-DD.csv`, one row per check:

```
timestamp_utc,epoch_ms,round,check,target,status,latency_ms,loss_pct,jitter_ms,speed_mbps,http_code,detail
```

`check` is one of `ping`, `dns`, `http`, `speed_down`, `speed_up`; `status` is
`ok` or `fail`. Unused columns are left empty, so the file loads cleanly into a
spreadsheet if you would rather chart it yourself.

## Running it as a service

`deploy/connectivity-test.service` is a systemd unit that restarts on failure
and survives logout:

```bash
sudo cp deploy/connectivity-test.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now connectivity-test
journalctl -u connectivity-test -f
```

Edit `WorkingDirectory`, `User` and the log path in the unit first.
