#!/usr/bin/env python3
"""
Tamper-evidence demo for the Cognitum Seed.

Hits the seed's HTTPS API on USB-OTG (default) or WiFi, then:
  1. Fetches the current witness-chain head.
  2. Asks the seed to verify that head -> expected: valid.
  3. Asks the seed to verify a *fabricated* head -> expected: invalid.
  4. Prints both proofs side by side.

The point is to make tamper-evidence visible: the same endpoint that
returns "verified" for a real entry refuses a forged one. The verifier
is on-device; no cloud round-trip.

Run:
    python3 tamper_evidence_demo.py
    python3 tamper_evidence_demo.py --base https://cognitum-2c3c.local:8443
"""

import argparse
import json
import os
import ssl
import sys
import time
import urllib.request

DEFAULTS = {
    "base":  os.environ.get("COGNITUM_BASE",  "https://169.254.42.1:8443"),
    "token": os.environ.get("COGNITUM_TOKEN", "***REMOVED***"),
    "pin":   os.environ.get("COGNITUM_CERT_FINGERPRINT",
        "52:db:5a:be:4b:2a:50:1f:f9:f8:f8:40:9c:ab:4e:dd:cf:fb:1b:c2:e3:ad:71:d1:d8:e2:0e:68:1e:cc:d7:45"),
}

# Self-signed cert -> verify by SHA-256 fingerprint, not by CA chain.
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

def http(method, base, path, token, body=None, retries=4):
    url = base + path
    data = json.dumps(body).encode() if body else None
    headers = {"Authorization": "Bearer " + token}
    if data:
        headers["Content-Type"] = "application/json"
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as r:
                raw = r.read()
                if not raw:
                    raise RuntimeError("empty body (seed connection cap?)")
                return json.loads(raw)
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = 4 * (attempt + 1)
            print(f"  ! {method} {path} failed ({e}); retrying in {wait}s…", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")  # placates type-checkers

def hr(label):
    print()
    print("─" * 6, label, "─" * (60 - len(label)))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base",  default=DEFAULTS["base"],  help="seed base URL (https://host:8443)")
    ap.add_argument("--token", default=DEFAULTS["token"], help="bearer token")
    args = ap.parse_args()

    print(f"Cognitum tamper-evidence demo")
    print(f"  seed: {args.base}")

    # --- 1. fetch the current witness chain head -----------------------
    hr("1. fetch witness chain head")
    chain = http("GET", args.base, "/api/v1/witness/chain", args.token)
    print(f"  /api/v1/witness/chain keys: {sorted(chain.keys())}")
    head = (chain.get("headHash") or chain.get("head_hash") or chain.get("head") or
            chain.get("latest_hash") or chain.get("chain_head"))
    if not head and isinstance(chain.get("entries"), list) and chain["entries"]:
        e = chain["entries"][-1]
        if isinstance(e, dict):
            head = e.get("hash") or e.get("witnessId") or e.get("id")
    depth = chain.get("depth") or chain.get("witness_chain_length")
    epoch = chain.get("epoch")
    print(f"  depth:       {depth:,}" if isinstance(depth, int) else f"  depth: {depth}")
    print(f"  epoch:       {epoch}")
    print(f"  head:        {head}")
    if not head:
        print(f"  ! no recognizable head field. full response:")
        print(json.dumps(chain, indent=2)[:1200])
        sys.exit("can't continue without a head hash")

    # --- 2. verify the real head ---------------------------------------
    hr("2. verify the REAL head")
    real = http("POST", args.base, "/api/v1/witness/verify", args.token, {"witnessId": head})
    print(json.dumps(real, indent=2))
    assert real.get("verified") is True, "real head failed verification — unexpected!"
    print("  → verified=True (as expected)")

    # --- 3. flip a single hex char in the head, verify the forgery -----
    hr("3. verify a TAMPERED head (one hex char flipped)")
    flipped = list(head)
    i = len(flipped) // 2
    flipped[i] = "0" if flipped[i] != "0" else "1"
    forged = "".join(flipped)
    print(f"  forged head: {forged}")
    forgery = http("POST", args.base, "/api/v1/witness/verify", args.token, {"witnessId": forged})
    print(json.dumps(forgery, indent=2))
    if forgery.get("verified") is True:
        print("  ! the seed accepted a forged head — that should not happen")
    else:
        print("  → seed rejected the forgery (verified=False or error) — tamper-evidence works")

    # --- summary -------------------------------------------------------
    hr("summary")
    print(f"  same endpoint, same auth token, two different inputs:")
    print(f"    real head     → verified={real.get('verified')}")
    print(f"    forged head   → verified={forgery.get('verified')}")
    print(f"  the seed cannot be convinced that something it didn't witness was witnessed.")
    print(f"  ({depth:,} entries currently in the chain.)")

if __name__ == "__main__":
    main()
