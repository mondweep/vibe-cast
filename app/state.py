"""Thread-safe in-memory store for live Meshtastic mesh state."""

import threading
import time
from collections import deque

MAX_MESSAGES = 500
MAX_OWN_MESSAGES = 50


class MeshState:
    def __init__(self):
        self._lock = threading.Lock()
        self._nodes = {}
        self._messages = deque(maxlen=MAX_MESSAGES)
        # Messages this app itself published, tracked separately so they
        # don't get lost in the global feed's high churn (the public mesh
        # can push through hundreds of messages a minute).
        self._own_messages = deque(maxlen=MAX_OWN_MESSAGES)
        self._packet_count = 0
        self._started_at = time.time()

    def touch_node(self, node_id, region=None):
        node = self._nodes.setdefault(
            node_id,
            {
                "id": node_id,
                "longname": None,
                "shortname": None,
                "hardware": None,
                "region": region,
                "battery_level": None,
                "voltage": None,
                "latitude": None,
                "longitude": None,
                "altitude": None,
                "last_seen": None,
                "packet_count": 0,
            },
        )
        node["last_seen"] = time.time()
        node["packet_count"] += 1
        if region:
            node["region"] = region
        return node

    def record_packet(self, packet_type, sender, region=None):
        with self._lock:
            self._packet_count += 1
            self.touch_node(sender, region=region)

    def apply_nodeinfo(self, sender, payload):
        with self._lock:
            node = self.touch_node(sender)
            node["longname"] = payload.get("longname") or node["longname"]
            node["shortname"] = payload.get("shortname") or node["shortname"]
            node["hardware"] = payload.get("hardware") or node["hardware"]

    def apply_position(self, sender, payload):
        with self._lock:
            node = self.touch_node(sender)
            lat = payload.get("latitude", payload.get("latitude_i"))
            lon = payload.get("longitude", payload.get("longitude_i"))
            if lat is not None and abs(lat) > 90:
                lat = lat / 1e7
            if lon is not None and abs(lon) > 180:
                lon = lon / 1e7
            if lat is not None:
                node["latitude"] = lat
            if lon is not None:
                node["longitude"] = lon
            if payload.get("altitude") is not None:
                node["altitude"] = payload.get("altitude")

    def apply_telemetry(self, sender, payload):
        with self._lock:
            node = self.touch_node(sender)
            if payload.get("battery_level") is not None:
                node["battery_level"] = payload.get("battery_level")
            if payload.get("voltage") is not None:
                node["voltage"] = payload.get("voltage")

    def add_message(self, sender, text, region=None, channel=None, own=False):
        with self._lock:
            self.touch_node(sender, region=region)
            entry = {
                "sender": sender,
                "text": text,
                "region": region,
                "channel": channel,
                "ts": time.time(),
                "own": own,
            }
            self._messages.appendleft(entry)
            if own:
                self._own_messages.appendleft(entry)

    def snapshot(self):
        with self._lock:
            nodes = sorted(
                self._nodes.values(),
                key=lambda n: n["last_seen"] or 0,
                reverse=True,
            )
            return {
                "nodes": nodes,
                "messages": list(self._messages),
                "own_messages": list(self._own_messages),
                "stats": {
                    "packet_count": self._packet_count,
                    "node_count": len(self._nodes),
                    "uptime_seconds": time.time() - self._started_at,
                },
            }


state = MeshState()
