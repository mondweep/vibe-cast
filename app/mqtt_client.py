"""Subscribes to the public Meshtastic MQTT bridge and feeds MeshState.

Meshtastic nodes with internet-connected gateways bridge their mesh
traffic onto a shared MQTT broker (mqtt.meshtastic.org by default) using
a well-known, publicly documented topic layout and default credentials
(these are not secrets -- they're published in the Meshtastic docs so
anyone can observe the public mesh):

    msh/<REGION>/2/json/<CHANNEL>/<NODE_ID>

Each message is a small JSON packet: {"type": "text"|"position"|
"telemetry"|"nodeinfo"|..., "from": <node id>, "payload": {...}}.
"""

import json
import logging
import os
import re

import paho.mqtt.client as mqtt

from app.state import state

log = logging.getLogger("mqtt_client")

DEFAULT_HOST = "mqtt.meshtastic.org"
DEFAULT_PORT = 1883
DEFAULT_TOPIC = "msh/+/2/json/#"
DEFAULT_USERNAME = "meshdev"
DEFAULT_PASSWORD = "large4cats"

TOPIC_RE = re.compile(r"^msh/(?P<region>[^/]+)/2/json/(?P<channel>[^/]+)/(?P<node>.+)$")


def _region_from_topic(topic):
    m = TOPIC_RE.match(topic)
    if not m:
        return None, None
    return m.group("region"), m.group("channel")


def _on_connect(client, userdata, flags, reason_code, properties=None):
    topic = os.environ.get("MQTT_TOPIC", DEFAULT_TOPIC)
    if reason_code == 0 or str(reason_code) == "Success":
        log.info("connected to MQTT broker, subscribing to %s", topic)
        client.subscribe(topic)
    else:
        log.warning("MQTT connect failed: %s", reason_code)


def _on_message(client, userdata, msg):
    region, channel = _region_from_topic(msg.topic)
    try:
        packet = json.loads(msg.payload.decode("utf-8", errors="ignore"))
    except (ValueError, UnicodeDecodeError):
        return

    sender = str(packet.get("from") or packet.get("sender") or "unknown")
    packet_type = packet.get("type", "unknown")
    payload = packet.get("payload") or {}

    state.record_packet(packet_type, sender, region=region)

    if packet_type == "text":
        text = payload.get("text") if isinstance(payload, dict) else str(payload)
        if text:
            state.add_message(sender, text, region=region, channel=channel)
    elif packet_type == "position":
        state.apply_position(sender, payload)
    elif packet_type in ("telemetry", "device_metrics"):
        state.apply_telemetry(sender, payload)
    elif packet_type == "nodeinfo":
        state.apply_nodeinfo(sender, payload)


def build_client():
    host = os.environ.get("MQTT_HOST", DEFAULT_HOST)
    port = int(os.environ.get("MQTT_PORT", DEFAULT_PORT))
    username = os.environ.get("MQTT_USERNAME", DEFAULT_USERNAME)
    password = os.environ.get("MQTT_PASSWORD", DEFAULT_PASSWORD)
    use_tls = os.environ.get("MQTT_TLS", "false").lower() == "true"

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="", clean_session=True)
    client.username_pw_set(username, password)
    if use_tls:
        client.tls_set()
    client.on_connect = _on_connect
    client.on_message = _on_message

    log.info("connecting to %s:%s (tls=%s)", host, port, use_tls)
    client.connect_async(host, port, keepalive=30)
    return client


def run_forever():
    client = build_client()
    client.loop_forever(retry_first_connection=True)


def start_background():
    """Starts the MQTT loop on a daemon thread; safe to call once at app startup."""
    client = build_client()
    client.loop_start()
    return client
