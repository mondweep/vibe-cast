# 🌐 From Edge CPU Starvation to Headless Cloud Realtime: Building a Resilient Physical AI Swarm

We hear a lot about large language models, but the frontier of **Physical AI**—where software interfaces with physical space, movement, and human physiology—is where the real engineering rubber meets the road.

Today, I took our local WiFi CSI (Channel State Information) sensing swarm from a delicate local setup to a highly resilient, 100% headless, edge-to-cloud streaming architecture.

Here is a breakdown of the deep-tech challenges my team and I tackled, the architectural design, and why **zero-dependency edge engineering** is the key to building ambient sensing environments that actually work in production.

---

### 1. The Bottleneck: Edge Database Corruption & Single-Board Pegging

Our setup consists of two ESP32-S3 nodes capturing raw WiFi subcarrier CSI phase/amplitude features at 10Hz, forwarding them over UDP to a **Raspberry Pi Zero 2 W** (our local "Seed" device).

After 4 days of continuous streaming, the Seed's single-threaded vector database (`memopt.rvf`) swelled to **1,499,337 vectors (167MB)**. This triggered extreme performance degradation:
* CPU pegged at **93.1%** trying to traverse the topological kNN graph.
* Local API response times degraded to an unusable **9.68 seconds**.
* A boot-time witness-chain corruption eventually locked up the database writes completely.

**The Fix:**
I performed an on-device DB compaction, resolved the witness-chain signature corruption, re-established a clean genesis block, and re-enabled active telemetry.
* **The result?** CPU usage dropped to **2.5%**, RAM footprint to **9.0 MB**, and API response latency fell from 9.6 seconds to a crisp **1.9 milliseconds**.

---

### 2. Streamlining the LAN & Physiological Verification

Next, we retired the legacy USB link-local bottlenecks in favour of a clean, static WiFi architecture over mDNS, routing telemetry dynamically over standard UDP/5006 directly onto the Seed.

We also audited the v0.6.3 CSI edge-processing firmware to verify the telemetry's validity. In Physical AI, **scientific integrity is everything**:
* **High Validity:** Breathing rate (averaging 12.9–13.7 BPM) via subcarrier phase variance in the first Fresnel zone, spatial motion levels, presence indicators, and RSSI link degradation.
* **Firmware Placeholders:** We isolated and filtered out canned heart rate (40/48 BPM) and saturated person counts to ensure our cloud charts only represent true physical data.

---

### 3. The Architecture: Headless Edge-to-Cloud Pipeline

I wanted this dashboard to update in real-time, shareable with anyone, with **zero local laptop dependency**. To achieve this, we designed a serverless pipeline:

```
[ ESP32 Node 1 ] ──┐
                   ├──► WiFi UDP/5006 ──► [ Raspberry Pi Seed ] ──► [ Native RPi Python Service ]
[ ESP32 Node 2 ] ──┘                      (Local DB Ingest)         (Direct Outbound POST)
                                                                             │
                                                                             ▼
[ Shared Dashboard ] ◄── WebSockets ◄── [ Supabase Cloud DB ] ◄──────────────┘
(HTML5 / Chart.js)                     (Postgres Realtime + RLS)
```

#### 🛡️ The Cloud Database & Security Layer
I created a custom table schema in **Supabase (PostgreSQL)** with optimised composite indexes for timestamp-series queries. I applied strict **Row Level Security (RLS)** policies to allow public reads while locking down anonymous writes, and hooked the table into the PostgreSQL `supabase_realtime` publication channel.

#### 🐍 Zero-Dependency Python Pusher on the Pi
Edge devices should not carry heavy, fragile dependency trees. I wrote a zero-dependency Python script using only standard libraries (`urllib` and `subprocess`) to extract local journalctl logs, parse the telemetry vectors, and POST them directly to the Supabase REST API in batches of 100.

#### ⚙️ The Headless Leap: Systemd Service
To ensure the setup survives power cuts and runs 24/7 without a laptop nearby, we copied the pusher script to the Seed and packaged it as an active systemd daemon: **`csi-supabase-pusher.service`**. It now boots autonomously, handles network reconnections gracefully, and streams telemetry headlessly.

---

### 4. The Payoff: WebSockets Cloud Dashboard

The culmination of this pipeline is a lightweight, responsive, and polished HTML5/Vanilla CSS dashboard. By embedding the Supabase JS SDK, the dashboard loads historical physiological trends and binds directly to the PostgreSQL WebSockets channel.

Now, when a user breathes in front of an ESP32 node in the room, the subcarrier phase variance is calculated at the edge, pushed to the cloud, and plotted on a global web dashboard in under **300ms**—with **zero page reloads and zero intermediate servers**.

---

### 💡 Key Takeaways for Physical AI Architects:

1. **Edge DB Compaction is Critical:** Small IoT devices cannot index massive graph structures indefinitely. Build proactive compaction/truncation routines into your firmware loop.
2. **Design for Headless Autonomy:** Your edge aggregators should recover from cold reboots with zero manual intervention. Package your runtimes as strict OS-level services.
3. **Ditch Heavy Frameworks at the Edge:** Standard-library code is your best friend when deploying to microcontrollers or single-board computers. It minimises memory leaks, avoids package mismatch hell, and ensures lightning-fast boot times.
4. **Lock Down Cloud Ingestion with RLS:** Any key that ships in a public HTML file is a public key. Use your database's Row Level Security to enforce read-only access for the public key, and restrict all writes to your authenticated edge device.

The barrier between digital interfaces and physical environments is dissolving. By combining low-power edge sensing with modern serverless cloud real-time engines, we can build spatial intelligence systems that are not just demos, but robust infrastructure.

*What are you building in the ambient sensing and Physical AI space? Let's connect and discuss in the comments!*

#PhysicalAI #EdgeComputing #IoT #Supabase #AmbientSensing #EmbeddedSystems #RaspberryPi #ESP32 #Serverless #RealtimeWeb
