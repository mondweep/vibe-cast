#!/usr/bin/env python3
"""
Pushes parsed vital telemetry directly from the Seed RPi device to the Supabase Cloud Database.
This runs natively on the Seed and does not require a laptop to be connected or powered.
"""
import os, re, subprocess, json, sys, time, urllib.request
from datetime import datetime

# ─── CONFIGURATION ───
# Loaded from environment (or .env on the Seed). See .env.example.
SUPABASE_URL = ""
SUPABASE_KEY = ""

LOG_LINE_RE = re.compile(
    r"^([0-9-T:+-]+)\s+\S+\s+python3\[\d+\]:.*node=(\d+).*features=\[([0-9.eE+\- ,]+)\]"
)

def decode_features(f):
    """Decode raw 8-dim feature vector into physical units."""
    return {
        "presence":   round(f[0], 3),
        "motion":     round(f[1], 3),
        "breathing_bpm": round(f[2] * 30, 1),
        "fall":       int(round(f[6])),
        "rssi_dbm":   round(f[7] * 100 - 100, 0),
    }

def push_to_supabase(records):
    """Inserts records into Supabase using the REST API."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/swarm_vitals"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    req = urllib.request.Request(
        url, 
        data=json.dumps(records).encode('utf-8'), 
        headers=headers, 
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"  ! Supabase push failed: {e}", file=sys.stderr)
        return False

def main():
    print("=== Supabase Swarm Vitals Pusher ===")
    print(f"Reading local journal logs...")
    
    # Only fetch the last 15 minutes of logs to avoid duplicates
    cmd = ["journalctl", "-u", "csi-bridge.service", "--output=short-iso", "--since", "15 minutes ago", "--no-pager"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except Exception as e:
        print(f"Error reading local journalctl logs: {e}", file=sys.stderr)
        sys.exit(1)

    records = []
    lines = res.stdout.splitlines()
    for line in lines:
        m = LOG_LINE_RE.match(line)
        if not m:
            continue
        ts_str = m.group(1)
        node_id = int(m.group(2))
        try:
            features = [float(x) for x in m.group(3).split(",")]
        except ValueError:
            continue
        
        if len(features) != 8:
            continue
            
        try:
            dt = datetime.fromisoformat(ts_str)
        except Exception:
            continue
            
        v = decode_features(features)
        
        # Filters: skip idle breathing rates and placeholder RSSIs
        if v["breathing_bpm"] <= 2.0 or v["rssi_dbm"] >= -10:
            continue

        records.append({
            "node_id": node_id,
            "timestamp": dt.isoformat(),
            "presence": v["presence"],
            "motion": v["motion"],
            "breathing_bpm": v["breathing_bpm"],
            "rssi_dbm": int(v["rssi_dbm"]),
            "fall": v["fall"]
        })

    if not records:
        print("No new valid telemetry frames found in this window.")
        return

    print(f"Parsed {len(records)} valid vital records. Uploading to Supabase...")
    
    # Batch inserts in chunks of 100
    chunk_size = 100
    success_count = 0
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i+chunk_size]
        if push_to_supabase(chunk):
            success_count += len(chunk)
            
    print(f"✓ Successfully synced {success_count}/{len(records)} records with Supabase.")

def load_env_file(path=".env"):
    """Load KEY=VAL pairs from a .env file into os.environ if present."""
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                os.environ.setdefault(k, v)
    except FileNotFoundError:
        pass

if __name__ == "__main__":
    # On the Seed this runs under systemd which loads /etc/cognitum/seed.env.
    # For ad-hoc local runs we also accept a .env in the current directory.
    load_env_file()

    SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set (env or .env). See .env.example.",
              file=sys.stderr)
        sys.exit(1)

    # Simple continuous watch loop (designed to be managed by systemd)
    import argparse
    parser = argparse.ArgumentParser(description="Seed Supabase Pusher")
    parser.add_argument("--interval", type=int, default=30, help="Sync interval in seconds")
    args = parser.parse_args()

    print(f"Starting Seed Supabase Pusher loop (every {args.interval}s)...")
    try:
        while True:
            main()
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nPusher stopped.")
