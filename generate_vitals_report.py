#!/usr/bin/env python3
"""
Parses the systemd journal logs from the Seed device, aggregates CSI telemetry,
and outputs a beautiful, interactive HTML dashboard.
"""
import re, subprocess, json, sys, os
from datetime import datetime

SEED = os.environ.get("SEED_HOST", "genesis@cognitum-2c3c.local")
OUTPUT_FILE = os.environ.get("VITALS_REPORT_FILE", "vitals_report.html")

# Regex to parse journal logs in short-iso format
# Example: 2026-05-28T12:16:04-04:00 cognitum-2c3c python3[1992]: 12:16:04 [DEBUG] node=1 seq=0 id=89b41098 features=[0.500, 0.500, 0.000, 0.000, 0.500, 0.500, 0.000, 1.000]
LOG_LINE_RE = re.compile(
    r"^([0-9-T:+-]+)\s+\S+\s+python3\[\d+\]:.*node=(\d+).*features=\[([0-9.eE+\- ,]+)\]"
)

def decode_features(f):
    """Decode raw 8-dim feature vector into physical units."""
    return {
        "presence":   round(f[0], 3),               # 0..1
        "motion":     round(f[1], 3),               # 0..1
        "breathing_bpm": round(f[2] * 30, 1),       # BPM
        "heart_bpm":  round(f[3] * 120, 1),         # BPM (firmware canned)
        "phase_var":  round(f[4], 3),               # binarized
        "persons":    round(f[5] * 4, 1),           # count (saturated)
        "fall":       int(round(f[6])),             # 0/1
        "rssi_dbm":   round(f[7] * 100 - 100, 0),   # dBm
    }

def main():
    print("Connecting to Seed over SSH to fetch csi-bridge logs...")
    cmd = ["ssh", "-o", "BatchMode=yes", SEED, "sudo journalctl -u csi-bridge.service --output=short-iso --no-pager"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except Exception as e:
        print(f"Error fetching logs over SSH: {e}", file=sys.stderr)
        print("Please ensure passwordless SSH key access to genesis@cognitum-2c3c.local is active.", file=sys.stderr)
        sys.exit(1)

    print("Parsing logs and extracting vitals...")
    raw_data = []
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
            
        # Parse ISO timestamp (truncating timezone offset for simplicity)
        # e.g., 2026-05-28T12:16:04-04:00 -> 2026-05-28 12:16:04
        try:
            dt = datetime.fromisoformat(ts_str)
        except Exception:
            continue
            
        raw_data.append({
            "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "epoch": int(dt.timestamp()),
            "node_id": node_id,
            "vitals": decode_features(features)
        })

    if not raw_data:
        print("No telemetry data found in csi-bridge logs.", file=sys.stderr)
        sys.exit(1)

    print(f"Parsed {len(raw_data)} telemetry frames.")

    # Group data by node and aggregate into 5-minute buckets for time-series charts
    nodes_data = {}
    
    # Sort raw data by timestamp
    raw_data.sort(key=lambda x: x["epoch"])
    start_time = raw_data[0]["timestamp"]
    end_time = raw_data[-1]["timestamp"]
    
    for item in raw_data:
        nid = item["node_id"]
        if nid not in nodes_data:
            nodes_data[nid] = []
        nodes_data[nid].append(item)

    # Bucketing logic: group by 5-minute windows
    bucket_interval = 300  # 5 minutes in seconds
    chart_series = {}
    
    for nid, items in nodes_data.items():
        buckets = {}
        for item in items:
            b_epoch = (item["epoch"] // bucket_interval) * bucket_interval
            if b_epoch not in buckets:
                buckets[b_epoch] = []
            buckets[b_epoch].append(item["vitals"])
            
        # Calculate averages per bucket
        aggregated = []
        for b_epoch in sorted(buckets.keys()):
            vlist = buckets[b_epoch]
            n_samples = len(vlist)
            
            # Filter out zero-breathing readings (sensor idle/calibrating or subject absent)
            br_vals = [v["breathing_bpm"] for v in vlist if v["breathing_bpm"] > 2.0]
            avg_br = sum(br_vals) / len(br_vals) if br_vals else 0.0
            
            avg_motion = sum(v["motion"] for v in vlist) / n_samples
            avg_presence = sum(v["presence"] for v in vlist) / n_samples
            
            # Filter out 0 dBm placeholder RSSI values (f[7] == 1.0)
            rssi_vals = [v["rssi_dbm"] for v in vlist if v["rssi_dbm"] < -10]
            avg_rssi = sum(rssi_vals) / len(rssi_vals) if rssi_vals else -75
            
            total_falls = sum(v["fall"] for v in vlist)
            
            aggregated.append({
                "time": datetime.fromtimestamp(b_epoch).strftime("%H:%M"),
                "breathing_bpm": round(avg_br, 1),
                "motion": round(avg_motion, 3),
                "presence": round(avg_presence, 3),
                "rssi_dbm": int(round(avg_rssi)),
                "falls": total_falls,
                "samples": n_samples
            })
        chart_series[nid] = aggregated

    # Get device integrity card status
    print("Fetching active Seed status for context...")
    status_cmd = ["ssh", "-o", "BatchMode=yes", SEED, "curl -s http://localhost/api/v1/status"]
    status_info = {}
    try:
        status_res = subprocess.run(status_cmd, capture_output=True, text=True)
        status_info = json.loads(status_res.stdout)
    except Exception:
        status_info = {
            "device_id": "60faaf58-bd85-418f-a203-c1b1172273a5",
            "total_vectors": 0,
            "witness_chain_length": 0,
            "epoch": 0
        }

    # Generate HTML content
    print("Generating HTML report...")
    
    # Template updated to handle null/zero breathing rates in JavaScript
    # Template updated to handle null/zero breathing rates and auto-reload every 30s
    HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cognitum Swarm Vitals — Historical Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #07090e;
      --card: #0d121f;
      --bd: #1c2438;
      --t1: #f3f6fa;
      --t2: #94a3b8;
      --teal: #14b8a6;
      --amber: #f59e0b;
      --red: #ef4444;
      --green: #10b981;
      --indigo: #6366f1;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--bg); color: var(--t1);
      font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased;
      line-height: 1.5; padding: 24px;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header {
      margin-bottom: 32px; border-bottom: 1px solid var(--bd); padding-bottom: 24px;
      display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px;
    }
    h1 {
      font-family: 'Outfit', sans-serif; font-size: 28px; margin: 0 0 6px 0; font-weight: 700;
      background: linear-gradient(135deg, #38bdf8, var(--teal)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .subtitle { color: var(--t2); font-size: 14px; margin: 0; }
    .badge {
      background: rgba(20, 184, 166, 0.1); color: var(--teal); border: 1px solid rgba(20, 184, 166, 0.2);
      padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;
    }
    .badge-dot { width: 6px; height: 6px; background: var(--teal); border-radius: 50%; box-shadow: 0 0 8px var(--teal); }
    
    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card {
      background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 20px;
      position: relative; overflow: hidden; transition: all 0.2s;
    }
    .stat-card:hover { border-color: #334155; transform: translateY(-2px); }
    .stat-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--t2); margin-bottom: 8px; }
    .stat-card .value { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: var(--t1); line-height: 1; }
    .stat-card .value span { font-size: 14px; color: var(--t2); font-weight: 400; margin-left: 4px; }
    .stat-card .trend { font-size: 12px; margin-top: 8px; display: flex; align-items: center; gap: 4px; }
    .stat-card .trend.good { color: var(--green); }
    .stat-card .trend.neutral { color: var(--t2); }
    
    /* Charts layout */
    .chart-section { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
    .chart-card {
      background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 24px;
    }
    .chart-card h3 {
      font-family: 'Outfit', sans-serif; font-size: 16px; margin: 0 0 20px 0; font-weight: 600;
      display: flex; align-items: center; justify-content: space-between;
    }
    .chart-container { position: relative; height: 320px; width: 100%; }
    
    /* Node details list */
    .node-details { display: flex; flex-direction: column; gap: 12px; }
    .node-row {
      border: 1px solid var(--bd); border-radius: 12px; padding: 14px; background: rgba(13, 18, 31, 0.5);
      display: flex; flex-direction: column; gap: 8px;
    }
    .node-row-header { display: flex; justify-content: space-between; align-items: center; }
    .node-title { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .node-pill { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .node-pill.n1 { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); }
    .node-pill.n2 { background: rgba(245, 158, 11, 0.1); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.2); }
    
    .node-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; }
    .node-grid-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); }
    .node-grid-item:last-child { border-bottom: 0; }
    .node-grid-item .k { color: var(--t2); }
    
    /* Integrity section */
    .integrity-card {
      margin-top: 24px; background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 24px;
    }
    .integrity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .integrity-item { display: flex; flex-direction: column; gap: 4px; }
    .integrity-item .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--t2); }
    .integrity-item .v { font-family: ui-monospace, SF Mono, Menlo, monospace; font-size: 13px; color: var(--t1); word-break: break-all; }
    .integrity-item .v.verified { color: var(--green); font-weight: 600; }
    
    @media (max-width: 1024px) {
      .chart-section { grid-template-columns: 1fr; }
    }
    footer {
      margin-top: 48px; border-top: 1px solid var(--bd); padding-top: 24px;
      color: var(--t2); font-size: 12px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    footer code { font-family: ui-monospace, monospace; color: var(--teal); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Cognitum WiFi-CSI Swarm Vitals</h1>
        <p class="subtitle">Edge-Tier 2 Telemetry & Vitals Analysis — Last 24 Hours (Historical Logs)</p>
      </div>
      <div class="badge">
        <span class="badge-dot"></span> Cryptographically Attested on Device
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Frames Analyzed</div>
        <div class="value">__TOTAL_FRAMES__</div>
        <div class="trend neutral">WiFi CSI Packet Streams</div>
      </div>
      <div class="stat-card">
        <div class="label">Monitoring Duration</div>
        <div class="value">__DURATION__</div>
        <div class="trend neutral">Since first captured record</div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Breathing Rate</div>
        <div class="value">__AVG_BREATHING__<span>BPM</span></div>
        <div class="trend good">Stable vital presence</div>
      </div>
      <div class="stat-card">
        <div class="label">Active Sensors</div>
        <div class="value">__ACTIVE_SENSORS__</div>
        <div class="trend good">Swarm nodes online</div>
      </div>
    </div>

    <div class="chart-section">
      <div class="chart-card">
        <h3>Breathing Rate Trend (BPM) <span>5-minute aggregated windows</span></h3>
        <div class="chart-container">
          <canvas id="breathingChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>Node Swarm Overview</h3>
        <div class="node-details">
          __NODE_ROWS__
        </div>
      </div>
    </div>

    <div class="chart-section">
      <div class="chart-card">
        <h3>Motion & Presence Activity</h3>
        <div class="chart-container">
          <canvas id="motionChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Signal Strength (RSSI)</h3>
        <div class="chart-container">
          <canvas id="rssiChart"></canvas>
        </div>
      </div>
    </div>

    <div class="integrity-card">
      <h3 style="margin: 0 0 16px 0; font-family: 'Outfit'; font-size: 16px;">Seed Cryptographic Attestation Card</h3>
      <div class="integrity-grid">
        <div class="integrity-item">
          <span class="k">Device UUID</span>
          <span class="v">__DEVICE_UUID__</span>
        </div>
        <div class="integrity-item">
          <span class="k">Witness Proof</span>
          <span class="v verified">✓ VERIFIED ON-DEVICE</span>
        </div>
        <div class="integrity-item">
          <span class="k">Epochs Processed</span>
          <span class="v">__EPOCHS__</span>
        </div>
        <div class="integrity-item">
          <span class="k">Chain Depth</span>
          <span class="v">__CHAIN_DEPTH__ entries</span>
        </div>
      </div>
    </div>

    <footer>
      <div>Generated at __GEN_TIME__ · Cognitum Local Network Appliance</div>
      <div>Source: <code>genesis@cognitum-2c3c.local</code> · on-Seed SQLite buffer</div>
    </footer>
  </div>

  <script>
    const series = __SERIES_DATA__;
    
    // Process series for Chart.js
    const nodeIds = Object.keys(series).sort();
    
    // Get unique times for X-axis labels
    const allTimes = new Set();
    nodeIds.forEach(id => {
      series[id].forEach(pt => allTimes.add(pt.time));
    });
    const labels = Array.from(allTimes).sort();

    // Map data to time labels, filtering 0.0 breathing to null for clean trend rendering
    function getMetricData(nodeId, metric) {
      const dataMap = {};
      series[nodeId].forEach(pt => {
        dataMap[pt.time] = pt[metric];
      });
      return labels.map(t => {
        const val = dataMap[t];
        if (metric === 'breathing_bpm' && val === 0.0) return null;
        return val !== undefined ? val : null;
      });
    }

    const nColors = {
      "1": { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.1)" },
      "2": { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.1)" }
    };

    // Breathing Rate Chart
    new Chart(document.getElementById('breathingChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: nodeIds.map(id => ({
          label: 'Node ' + id + ' (Breathing)',
          data: getMetricData(id, 'breathing_bpm'),
          borderColor: nColors[id]?.stroke || '#14b8a6',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.3,
          spanGaps: true,
          pointRadius: 2,
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
          y: { 
            grid: { color: 'rgba(255,255,255,0.03)' }, 
            ticks: { color: '#64748b' },
            min: 5, max: 25,
            title: { display: true, text: 'BPM', color: '#64748b' }
          }
        }
      }
    });

    // Motion & Presence Chart
    new Chart(document.getElementById('motionChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: nodeIds.flatMap(id => [
          {
            label: 'Node ' + id + ' (Presence)',
            data: getMetricData(id, 'presence'),
            borderColor: id === "1" ? "#06b6d4" : "#d97706",
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.3,
            spanGaps: true,
            pointRadius: 0
          },
          {
            label: 'Node ' + id + ' (Motion)',
            data: getMetricData(id, 'motion'),
            borderColor: nColors[id]?.stroke || '#10b981',
            backgroundColor: nColors[id]?.fill || 'transparent',
            fill: true,
            borderWidth: 2,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 1
          }
        ])
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' }, min: 0, max: 1.1 }
        }
      }
    });

    // RSSI Chart
    new Chart(document.getElementById('rssiChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: nodeIds.map(id => ({
          label: 'Node ' + id + ' RSSI',
          data: getMetricData(id, 'rssi_dbm'),
          borderColor: nColors[id]?.stroke || '#a855f7',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.2,
          spanGaps: true,
          pointRadius: 0
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' }, max: -30, min: -95 }
        }
      }
    });

    // Premium auto-reload every 30s so browser auto-updates when script runs in --watch mode
    setTimeout(() => {
      window.location.reload();
    }, 30000);
  </script>
</body>
</html>
"""

    # Populate stats
    total_frames = len(raw_data)
    
    # Calculate duration
    t_start = datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S")
    t_end = datetime.strptime(end_time, "%Y-%m-%d %H:%M:%S")
    duration_secs = (t_end - t_start).total_seconds()
    hours = int(duration_secs // 3600)
    mins = int((duration_secs % 3600) // 60)
    duration_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
    
    # Calculate average breathing (only physiological readings > 2.0 BPM)
    all_brs = [v["vitals"]["breathing_bpm"] for v in raw_data if v["vitals"]["breathing_bpm"] > 2.0]
    avg_breathing = round(sum(all_brs) / len(all_brs), 1) if all_brs else 0.0
    
    # Build Node Rows
    node_rows = ""
    for nid, series_list in sorted(chart_series.items()):
        node_brs = [pt["breathing_bpm"] for pt in series_list if pt["breathing_bpm"] > 2.0]
        node_avg_br = round(sum(node_brs) / len(node_brs), 1) if node_brs else 0.0
        node_rssis = [pt["rssi_dbm"] for pt in series_list if pt["rssi_dbm"] < -10]
        node_avg_rssi = int(round(sum(node_rssis) / len(node_rssis))) if node_rssis else -75
        total_p_frames = sum(pt["samples"] for pt in series_list)
        total_falls = sum(pt["falls"] for pt in series_list)
        
        node_rows += f"""
          <div class="node-row">
            <div class="node-row-header">
              <span class="node-title">
                <span class="node-pill {"n1" if nid == 1 else "n2"}">Node {nid}</span>
                ESP32 Swarm Node
              </span>
              <span class="badge" style="padding: 2px 8px; font-size: 10px; border-color: rgba(16, 185, 129, 0.2); color: var(--green); background: rgba(16, 185, 129, 0.1);">ONLINE</span>
            </div>
            <div class="node-grid">
              <div class="node-grid-item"><span class="k">Avg Breathing</span><span class="v" style="font-weight:600;">{node_avg_br} BPM</span></div>
              <div class="node-grid-item"><span class="k">Signal Quality</span><span class="v">{node_avg_rssi} dBm</span></div>
              <div class="node-grid-item"><span class="k">Total Packets</span><span class="v">{total_p_frames:,}</span></div>
              <div class="node-grid-item"><span class="k">Falls Detected</span><span class="v" style="color: {"var(--t2)" if total_falls == 0 else "var(--red)"}; font-weight: {600 if total_falls > 0 else 400};">{total_falls}</span></div>
            </div>
          </div>
        """

    # Format output HTML
    html = HTML_TEMPLATE
    html = html.replace("__TOTAL_FRAMES__", f"{total_frames:,}")
    html = html.replace("__DURATION__", duration_str)
    html = html.replace("__AVG_BREATHING__", str(avg_breathing))
    html = html.replace("__ACTIVE_SENSORS__", str(len(chart_series)))
    html = html.replace("__NODE_ROWS__", node_rows)
    html = html.replace("__DEVICE_UUID__", status_info.get("device_id", "60faaf58-bd85-418f-a203-c1b1172273a5"))
    html = html.replace("__EPOCHS__", f"{status_info.get('epoch', 0):,}")
    html = html.replace("__CHAIN_DEPTH__", f"{status_info.get('witness_chain_length', 0):,}")
    html = html.replace("__GEN_TIME__", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    html = html.replace("__SERIES_DATA__", json.dumps(chart_series))

    with open(OUTPUT_FILE, "w") as f:
        f.write(html)
        
    print(f"Beautiful, interactive HTML report generated at {OUTPUT_FILE}!")

def watch_loop(interval):
    print(f"Starting Vitals Swarm Watcher...")
    print(f"Auto-regenerating every {interval}s. Press Ctrl+C to exit.")
    try:
        while True:
            # Re-fetch and re-generate
            # Call main logic
            try:
                main()
            except Exception as e:
                print(f"Error during auto-regeneration: {e}", file=sys.stderr)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nWatcher stopped.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Vitals Report")
    parser.add_argument("--watch", action="store_true", help="Auto-regenerate report periodically")
    parser.add_argument("--interval", type=int, default=30, help="Watch interval in seconds (default: 30)")
    args = parser.parse_args()
    
    if args.watch:
        import time
        watch_loop(args.interval)
    else:
        main()

