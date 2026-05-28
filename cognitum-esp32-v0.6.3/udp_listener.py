#!/usr/bin/env python3
"""Quick UDP listener for ESP32 CSI node packets. Decodes the three magic types."""
import socket, struct, sys, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5005
MAGICS = {
    0xC5110001: "raw_csi",
    0xC5110002: "vitals",
    0xC5110003: "feature",
    0xC5110005: "compressed",
}

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", PORT))
print(f"listening on udp/{PORT} (Ctrl-C to quit)")
n = 0
while True:
    pkt, addr = s.recvfrom(2048)
    n += 1
    magic = struct.unpack("<I", pkt[:4])[0] if len(pkt) >= 4 else 0
    kind = MAGICS.get(magic, f"unknown(0x{magic:08x})")
    print(f"[{n:>4}] {time.strftime('%H:%M:%S')} from {addr[0]}:{addr[1]:<5} "
          f"len={len(pkt):>4} magic={kind}")
    if kind == "feature" and len(pkt) >= 48:
        # edge_feature_pkt_t: u32 magic, u8 node, u8 rsv, u16 seq, i64 ts, f32[8]
        _, node, _rsv, seq, ts = struct.unpack("<IBBHq", pkt[:16])
        feats = struct.unpack("<8f", pkt[16:48])
        labels = ["pres", "motn", "br", "hr", "phvar", "npers", "fall", "rssi"]
        pretty = " ".join(f"{l}={v:+.2f}" for l, v in zip(labels, feats))
        print(f"        node={node} seq={seq} ts={ts}  {pretty}")
