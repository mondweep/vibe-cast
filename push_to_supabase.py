#!/usr/bin/env python3
"""
Pushes parsed vital telemetry from the Seed LAN device to a Supabase Cloud Database.
"""
import os, re, subprocess, json, sys, time, urllib.request
from datetime import datetime

SEED = "genesis@cognitum-2c3c.local"

# ─── CONFIGURATION ───
# Replace these with your Supabase credentials (or set them in your environment)
SUPABASE_URL = "https://ertsvhwtaeityanbmyzw.supabase.co"
SUPABASE_KEY = "***REMOVED***"

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
    print(f"Connecting to Seed over SSH to fetch telemetry...")
    
    # Only fetch the last 15 minutes of logs to avoid pushing duplicates
    cmd = ["ssh", "-o", "BatchMode=yes", SEED, "sudo journalctl -u csi-bridge.service --output=short-iso --since '15 minutes ago' --no-pager"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except Exception as e:
        print(f"Error fetching logs over SSH: {e}", file=sys.stderr)
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
def load_env():
    """Loads key-value pairs from .env if present in the current folder."""
    try:
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("=", 1)
                if len(parts) == 2:
                    k, v = parts[0].strip(), parts[1].strip()
                    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                        v = v[1:-1]
                    os.environ[k] = v
    except FileNotFoundError:
        pass

if __name__ == "__main__":
    # If run with --watch, loop periodically
    import argparse
    parser = argparse.ArgumentParser(description="Supabase Pusher")
    parser.add_argument("--watch", action="store_true", help="Auto-sync data periodically")
    parser.add_argument("--interval", type=int, default=30, help="Sync interval in seconds")
    args = parser.parse_args()

    # Load credentials from .env if present
    load_env()

    # Allow credentials override via env variables
    SUPABASE_URL = os.environ.get("SUPABASE_URL", SUPABASE_URL)
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", SUPABASE_KEY)

    if SUPABASE_URL.startswith("https://your-") or SUPABASE_KEY == "your-anon-or-service-role-key":
        print("ERROR: Please configure your SUPABASE_KEY (anon or service key) first.")
        print("You can add it to your .env file as SUPABASE_KEY=your_key_here")
        sys.exit(1)

    if args.watch:
        print(f"Pusher loop active. Syncing every {args.interval}s. Press Ctrl+C to stop.")
        try:
            while True:
                main()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nPusher stopped.")
    else:
        main()
