from app.state import MeshState


def test_text_message_creates_node_and_message():
    s = MeshState()
    s.record_packet("text", "!abc123", region="US")
    s.add_message("!abc123", "hello mesh", region="US", channel="LongFast")

    snap = s.snapshot()
    assert snap["stats"]["node_count"] == 1
    assert snap["messages"][0]["text"] == "hello mesh"
    assert snap["nodes"][0]["id"] == "!abc123"


def test_position_scales_integer_lat_lon():
    s = MeshState()
    s.apply_position("!node1", {"latitude_i": 377749000, "longitude_i": -1224194000})

    node = s.snapshot()["nodes"][0]
    assert round(node["latitude"], 4) == 37.7749
    assert round(node["longitude"], 4) == -122.4194


def test_telemetry_and_nodeinfo_merge_into_same_node():
    s = MeshState()
    s.apply_nodeinfo("!node1", {"longname": "Base Station", "shortname": "BASE"})
    s.apply_telemetry("!node1", {"battery_level": 87})

    snap = s.snapshot()
    assert snap["stats"]["node_count"] == 1
    node = snap["nodes"][0]
    assert node["longname"] == "Base Station"
    assert node["battery_level"] == 87
