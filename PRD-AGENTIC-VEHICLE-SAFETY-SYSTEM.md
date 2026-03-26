# Product Requirements Document: Agentic Vehicle Safety System (AVSS)

**Project:** Intelligent Multi-Agent Vehicle Safety Platform  
**Version:** 1.0  
**Date:** March 26, 2026  
**Author:** Mondweep Chakravorty  
**Repository:** https://github.com/mondweep/vibe-cast  
**Branch:** `agentics/vehicle-safety-innovation`

---

## Executive Summary

The Agentic Vehicle Safety System (AVSS) retrofits older vehicles with modern AI-driven safety capabilities through a distributed multi-agent architecture. Using multiple specialized OpenClaw instances running on edge compute, AVSS processes real-time data from cameras, radar, and CAN bus to provide intelligent risk assessment, predictive safety warnings, and self-learning capabilities. The system is designed as a foundation for future V2X (Vehicle-to-Everything) integration, enabling legacy vehicles to participate in connected mobility ecosystems.

**Key Innovation:** Multi-agent orchestration where specialized AI agents (vision, radar, telemetry) coordinate through a master orchestrator to create emergent safety intelligence greater than the sum of individual sensors.

---

## Problem Statement

### Current State
- **Legacy vehicle gap:** Millions of older vehicles lack modern ADAS (Advanced Driver Assistance Systems)
- **Safety disparity:** Owners of older vehicles have no access to AI-driven safety features
- **Fragmented aftermarket:** Existing retrofit solutions are single-purpose (dash cam OR radar OR tracker), not integrated
- **No learning capability:** Traditional aftermarket systems are static, don't improve over time
- **V2X exclusion:** Older vehicles cannot participate in emerging connected vehicle infrastructure

### Target Impact
- **Democratize safety:** Make AI-powered safety accessible to any vehicle, regardless of age
- **Prove agentic architecture:** Demonstrate real-world value of coordinated multi-agent systems in safety-critical applications
- **Enable V2X readiness:** Create upgrade path for legacy vehicles to participate in smart city/road infrastructure
- **Open innovation:** Establish open-source reference architecture for vehicle AI retrofits

---

## Goals and Objectives

### Phase 1: Foundation (Months 1-3)
✅ **Deploy multi-agent system** on edge compute in single vehicle  
✅ **Real-time data fusion** from cameras, radar, CAN bus  
✅ **Basic risk scoring** and driver alerts  
✅ **Data logging pipeline** for continuous learning

### Phase 2: Intelligence (Months 4-6)
✅ **Predictive modeling** for collision risk, driver fatigue, road hazards  
✅ **Self-learning** from driving patterns and near-miss events  
✅ **Contextual awareness** (weather, traffic, time of day)  
✅ **Driver behavior profiling** for personalized safety recommendations

### Phase 3: Connected (Months 7-12)
✅ **V2X integration** (vehicle-to-infrastructure, vehicle-to-vehicle)  
✅ **Fleet analytics** (multi-vehicle insights)  
✅ **Crowdsourced hazard mapping**  
✅ **API ecosystem** for third-party safety services

---

## System Architecture

### Hardware Components

#### 1. Sensors & Data Sources
- **External Cameras:**
  - Front-facing (1080p+, 60fps min)
  - Rear-facing (1080p+, 30fps min)
  - Side mirrors (optional, 720p)
- **Internal Camera:**
  - Driver-facing (720p, 30fps, IR night vision)
- **Radar System:**
  - Forward-facing automotive radar (77 GHz preferred)
  - Range: 150m+ forward detection
  - Angular coverage: 60° horizontal
- **CAN Bus Interface:**
  - OBD-II connector or direct CAN tap
  - Real-time vehicle telemetry (speed, RPM, steering angle, brake pressure, etc.)
- **GPS Module:**
  - High-precision location (1-3m accuracy)
  - Heading and velocity

#### 2. Edge Compute Platform
- **Primary Option:** NVIDIA Jetson Orin Nano (8GB)
  - Rationale: AI acceleration, automotive-grade, sufficient I/O
- **Alternative:** Raspberry Pi 5 (8GB) + Coral TPU
  - Rationale: Cost-effective, mature ecosystem
- **Storage:** 256GB NVMe SSD (high-endurance, automotive-rated)
- **Power:** 12V DC input, UPS backup for graceful shutdown
- **Connectivity:** 4G/5G modem for V2X, WiFi for updates
- **Enclosure:** Ruggedized, vibration-resistant, thermal management

### Software Architecture

#### OpenClaw Multi-Agent System

```
┌─────────────────────────────────────────────────────┐
│           Master Orchestrator (OpenClaw)             │
│  - Coordinates specialist agents                     │
│  - Fuses multi-modal data                            │
│  - Risk assessment & decision logic                  │
│  - V2X communication hub                             │
└──────────┬──────────────┬──────────────┬────────────┘
           │              │              │
    ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼────────┐
    │   Vision    │ │  Radar   │ │   Telemetry  │
    │    Agent    │ │  Agent   │ │    Agent     │
    │ (OpenClaw)  │ │(OpenClaw)│ │  (OpenClaw)  │
    └──────┬──────┘ └────┬─────┘ └─────┬────────┘
           │              │              │
    ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼────────┐
    │   Cameras   │ │  Radar   │ │   CAN Bus    │
    │ (3-4 feeds) │ │  (77GHz) │ │   (OBD-II)   │
    └─────────────┘ └──────────┘ └──────────────┘
```

#### Agent Responsibilities

**1. Vision Agent (OpenClaw Instance #1)**
- **Input:** Camera feeds (front, rear, internal)
- **Processing:**
  - Object detection (vehicles, pedestrians, cyclists, animals)
  - Lane detection and departure warnings
  - Traffic sign recognition
  - Driver attention monitoring (gaze, drowsiness)
  - Weather/lighting condition assessment
- **Output:** Structured vision events → Master Orchestrator
- **Model:** YOLOv8 or EfficientDet (optimized for edge)

**2. Radar Agent (OpenClaw Instance #2)**
- **Input:** Radar point cloud data
- **Processing:**
  - Forward collision warning (FCW)
  - Adaptive cruise control data (ACC-ready)
  - Blind spot detection
  - Cross-traffic alerts
  - Range and closing velocity calculations
- **Output:** Radar tracking data → Master Orchestrator
- **Algorithm:** CFAR (Constant False Alarm Rate) + Kalman filtering

**3. Telemetry Agent (OpenClaw Instance #3)**
- **Input:** CAN bus messages (vehicle state)
- **Processing:**
  - Real-time telemetry parsing (speed, acceleration, braking, steering)
  - Driver behavior analysis (harsh braking, rapid acceleration, aggressive cornering)
  - Vehicle health monitoring (engine codes, diagnostics)
  - Trip logging and analytics
- **Output:** Vehicle state updates → Master Orchestrator
- **Protocol:** ISO 15765-4 (CAN), J1979 (OBD-II)

**4. Master Orchestrator (OpenClaw Instance #4)**
- **Input:** Fused data streams from Vision, Radar, Telemetry agents
- **Processing:**
  - **Risk Fusion Engine:**
    - Multi-modal threat assessment (e.g., camera sees pedestrian + radar confirms distance + CAN shows high speed → HIGH RISK)
    - Temporal reasoning (predict trajectories, time-to-collision)
    - Context-aware scoring (weather, traffic density, driver fatigue)
  - **Predictive Safety:**
    - Machine learning models for near-miss prediction
    - Driver behavior profiling (personalized risk thresholds)
    - Route-based hazard anticipation (learned from historical data)
  - **Decision & Action:**
    - Real-time alerts (visual, audio, haptic)
    - Data logging for post-trip analysis
    - V2X message generation (hazard broadcasts, cooperative awareness)
- **Output:** Driver warnings, safety recommendations, V2X messages, logged events

---

## Data Flow

### 1. Real-Time Processing Pipeline
```
Sensors → Specialist Agents → Master Orchestrator → Driver Interface
  (10-30Hz)    (5-10Hz)            (1-5Hz)            (Immediate)
```

### 2. Continuous Learning Pipeline
```
Logged Events → Local Storage → Batch Processing → Model Updates
  (Real-time)     (Daily sync)    (Weekly/Monthly)   (OTA push)
```

### 3. V2X Communication (Phase 3)
```
Master Orchestrator ↔ V2X Network ↔ Infrastructure / Other Vehicles
     (Event-driven, <100ms latency)
```

---

## Functional Requirements

### FR-001: Multi-Agent Coordination
- [ ] Deploy 4 independent OpenClaw instances on edge device
- [ ] Inter-agent communication via secure IPC (ZeroMQ or gRPC)
- [ ] Master orchestrator receives updates from specialists at 5-10Hz
- [ ] Graceful degradation if any specialist agent fails

### FR-002: Vision Processing
- [ ] Detect and classify objects: vehicles (5 classes), pedestrians, cyclists, animals
- [ ] Lane detection with confidence scoring
- [ ] Traffic sign recognition (speed limits, warnings, regulatory)
- [ ] Driver attention monitoring: gaze tracking, blink rate, head pose
- [ ] Weather/lighting classification: sunny, rain, snow, fog, night

### FR-003: Radar Processing
- [ ] Track up to 32 simultaneous targets
- [ ] Forward collision warning with time-to-collision estimation
- [ ] Blind spot detection (left/right zones)
- [ ] Rear cross-traffic alert
- [ ] Output: target ID, range, velocity, angle

### FR-004: Telemetry Processing
- [ ] Parse CAN bus messages for core vehicle state (speed, RPM, brake, throttle, steering angle)
- [ ] Detect harsh events: hard braking (>0.4g), rapid acceleration, aggressive turns
- [ ] Vehicle health monitoring: engine codes, battery voltage, coolant temp
- [ ] Trip logging: distance, duration, fuel consumption, elevation

### FR-005: Risk Assessment & Prediction
- [ ] Multi-modal risk fusion (vision + radar + telemetry)
- [ ] Real-time risk score (0-100 scale) updated every 200ms
- [ ] Predictive collision warning (3-5 second horizon)
- [ ] Driver fatigue detection (70% accuracy target)
- [ ] Context-aware thresholds (adjust for weather, traffic, time of day)

### FR-006: Driver Alerts
- [ ] Visual HUD (LED strip or small display)
- [ ] Audio alerts (3 priority levels: info, warning, critical)
- [ ] Haptic feedback (seat vibration, optional)
- [ ] Alert priority queue (suppress low-priority during high-priority events)

### FR-007: Self-Learning
- [ ] Log all sensor data + risk events (near-misses, alerts, driver overrides)
- [ ] Batch training pipeline (weekly model updates)
- [ ] Personalized driver profiling (adapt thresholds over 100+ hours of driving)
- [ ] A/B testing framework for model improvements

### FR-008: V2X Integration (Phase 3)
- [ ] Broadcast hazard warnings (sudden braking, obstacles, weather)
- [ ] Receive infrastructure alerts (traffic lights, construction, accidents)
- [ ] Vehicle-to-vehicle cooperative awareness (share position, velocity, trajectory)
- [ ] Crowdsourced hazard map (aggregate data from multiple vehicles)

---

## Non-Functional Requirements

### NFR-001: Safety & Reliability
- **Target:** 99.9% uptime during vehicle operation
- **Fault tolerance:** System continues with degraded functionality if 1 specialist agent fails
- **Watchdog:** Auto-restart crashed agents within 5 seconds
- **Testing:** FMEA (Failure Modes and Effects Analysis) before deployment

### NFR-002: Latency
- **Critical alerts:** <200ms from sensor input to driver notification
- **Risk score update:** <500ms end-to-end
- **V2X messaging:** <100ms latency (Phase 3)

### NFR-003: Data Privacy
- **Local-first:** All processing on-device, no mandatory cloud dependency
- **Opt-in telemetry:** User controls data sharing for model improvement
- **Anonymization:** Remove PII before any off-device sync
- **Encryption:** AES-256 for stored data, TLS 1.3 for V2X

### NFR-004: Power Efficiency
- **Target:** <30W average power draw (edge device + sensors)
- **Sleep mode:** When vehicle ignition is off (wake on CAN bus activity)
- **Battery protection:** Auto-shutdown if vehicle battery <11.5V

### NFR-005: Environmental
- **Operating temperature:** -20°C to +70°C (automotive-grade)
- **Vibration resistance:** ISO 16750-3 standards
- **Water/dust:** IP54 minimum (enclosure)

### NFR-006: Maintainability
- **OTA updates:** Over-the-air firmware and model updates (4G/5G or WiFi)
- **Remote diagnostics:** SSH access for troubleshooting (secure, owner-authorized)
- **Logging:** Structured logs with rotation (7 days retention on-device)

---

## Technical Specifications

### OpenClaw Configuration

#### Agent #1: Vision Agent
```yaml
name: vision-agent
model: anthropic/claude-sonnet-4-5
thinking: low
plugins:
  - image-analysis
  - object-detection
  - driver-monitoring
tools:
  - camera_read
  - object_detect
  - lane_detect
  - sign_recognize
  - driver_attention
memory:
  - daily_events.md
  - vision_calibration.json
```

#### Agent #2: Radar Agent
```yaml
name: radar-agent
model: anthropic/claude-haiku-4-5  # Lightweight for high-frequency updates
thinking: minimal
plugins:
  - radar-processing
tools:
  - radar_read
  - target_track
  - collision_predict
memory:
  - radar_calibration.json
  - tracked_objects.json
```

#### Agent #3: Telemetry Agent
```yaml
name: telemetry-agent
model: anthropic/claude-haiku-4-5
thinking: low
plugins:
  - can-bus-parser
tools:
  - can_read
  - telemetry_parse
  - trip_log
  - health_monitor
memory:
  - vehicle_profile.json
  - trip_history.md
```

#### Agent #4: Master Orchestrator
```yaml
name: master-orchestrator
model: anthropic/claude-sonnet-4-5
thinking: medium  # Higher reasoning for risk fusion
plugins:
  - risk-fusion
  - decision-engine
  - v2x-protocol (Phase 3)
tools:
  - fuse_sensor_data
  - assess_risk
  - predict_collision
  - alert_driver
  - log_event
  - v2x_broadcast (Phase 3)
memory:
  - risk_history.md
  - driver_profile.json
  - learned_routes.json
subagents:
  - vision-agent
  - radar-agent
  - telemetry-agent
```

### Hardware Bill of Materials (BOM)

| Component | Specification | Estimated Cost |
|-----------|---------------|----------------|
| **Compute** | NVIDIA Jetson Orin Nano 8GB | £400 |
| **Storage** | 256GB NVMe SSD (automotive-grade) | £80 |
| **Front Camera** | 1080p60, 140° FOV, night vision | £60 |
| **Rear Camera** | 1080p30, 120° FOV | £40 |
| **Internal Camera** | 720p30, IR, driver-facing | £35 |
| **Radar** | 77 GHz automotive radar module | £250 |
| **CAN Interface** | OBD-II to USB-C adapter (CAN FD) | £50 |
| **GPS Module** | High-precision GNSS (1-3m) | £40 |
| **4G/5G Modem** | LTE Cat-4 minimum (for V2X) | £60 |
| **Power Supply** | 12V to 5V/12V DC-DC converter (50W) | £30 |
| **Enclosure** | Ruggedized, IP54, thermal management | £80 |
| **Wiring & Mounting** | Cable harnesses, brackets, adhesives | £50 |
| **HUD Display** | Optional: 5" touchscreen | £60 |
| **Audio Alert** | Piezo buzzer or speaker | £15 |
| **Total** | | **~£1,250** |

*Note: Costs are estimates. Bulk purchasing or alternative components can reduce total.*

---

## Data Flows & Interfaces

### 1. Sensor → Agent Communication
- **Protocol:** Each sensor streams data to its specialist agent via direct interface (USB, MIPI CSI, CAN, UART)
- **Format:** Binary (camera frames), CAN frames, radar point clouds
- **Frequency:** 10-60 Hz depending on sensor

### 2. Agent → Orchestrator Communication
- **Protocol:** gRPC or ZeroMQ (IPC for local, optional TCP for distributed testing)
- **Format:** Protobuf-serialized structured events
- **Frequency:** 5-10 Hz (agents send updates only on significant changes or at heartbeat intervals)
- **Example Message (Vision Agent → Orchestrator):**
  ```protobuf
  message VisionEvent {
    uint64 timestamp_ns = 1;
    repeated DetectedObject objects = 2;
    LaneInfo lanes = 3;
    DriverState driver = 4;
    string weather_condition = 5;
  }
  ```

### 3. Orchestrator → Driver Interface
- **Visual:** GPIO-controlled LED strip (Red/Yellow/Green for risk level)
- **Audio:** PWM buzzer or I2S audio output
- **Display (optional):** HDMI or DSI touchscreen with web-based UI
- **Haptic (optional):** Relay-controlled seat vibration motor

### 4. Data Logging
- **Local Storage:** SQLite database + raw video/radar files
- **Schema:**
  - `trips` (id, start_time, end_time, distance, max_speed, avg_risk)
  - `events` (id, trip_id, timestamp, event_type, risk_score, sensor_data_json)
  - `alerts` (id, trip_id, timestamp, alert_type, driver_response)
- **Rotation:** Keep last 30 days on-device, archive to cloud (opt-in)

### 5. V2X Communication (Phase 3)
- **Protocol:** IEEE 802.11p (DSRC) or C-V2X (Cellular Vehicle-to-Everything)
- **Message Types:**
  - CAM (Cooperative Awareness Message): position, speed, heading
  - DENM (Decentralized Environmental Notification): hazards, warnings
- **Frequency:** CAM broadcast at 1-10 Hz, DENM event-triggered

---

## Self-Learning Framework

### Learning Objectives
1. **Personalized Risk Thresholds:** Adapt alert sensitivity to driver's skill level and behavior
2. **Contextual Models:** Learn which road segments, weather conditions, or times of day correlate with higher risk
3. **Collision Prediction:** Improve time-to-collision estimates based on historical near-miss data
4. **Driver Coaching:** Identify patterns (e.g., frequent hard braking on specific routes) and suggest improvements

### Learning Pipeline

#### Phase 1: Data Collection (Continuous)
- Log all sensor data during trips (compressed video, radar tracks, CAN messages)
- Annotate events: near-misses (high risk score without collision), alerts issued, driver overrides
- Privacy-preserving: Data stays local unless user opts in to cloud sync

#### Phase 2: Feature Engineering (Nightly)
- Extract features from logged trips:
  - Vision: object density, lane departure frequency, driver attention lapses
  - Radar: average time-to-collision, close-call counts
  - Telemetry: harsh event frequency, speed distribution, route characteristics
- Build driver behavior profile (e.g., "aggressive accelerator, cautious braker")

#### Phase 3: Model Training (Weekly)
- Train lightweight models on-device or in cloud (if opt-in):
  - **Personalized risk scorer:** XGBoost or Random Forest (input: sensor fusion features, output: adjusted risk threshold)
  - **Collision predictor:** LSTM or Transformer (input: time-series sensor data, output: collision probability over 5-second horizon)
- Validate on holdout set (last 10% of trips)

#### Phase 4: Model Deployment (OTA)
- Push updated models to device via OTA update
- A/B testing: Run new model on 50% of trips, compare alert precision/recall vs. baseline
- Rollback mechanism if new model underperforms

### Success Metrics (Learning)
- **Personalization:** 20% reduction in false-positive alerts after 100 hours of driving
- **Prediction Accuracy:** 80%+ precision for near-miss prediction (5-second horizon)
- **Driver Engagement:** Users report 30%+ improvement in perceived alert relevance (survey)

---

## Roadmap

### Phase 1: MVP (Months 1-3)
**Goal:** Deploy functional multi-agent system in single vehicle

#### Month 1: Hardware Assembly & Integration
- [ ] Procure and test all hardware components
- [ ] Install cameras, radar, CAN interface, GPS in test vehicle
- [ ] Set up edge compute platform (Jetson or RPi + Coral)
- [ ] Validate sensor connectivity and data streams

#### Month 2: Agent Development
- [ ] Deploy 4 OpenClaw instances with basic functionality
- [ ] Implement Vision Agent: object detection + lane detection
- [ ] Implement Radar Agent: target tracking + FCW
- [ ] Implement Telemetry Agent: CAN parsing + trip logging
- [ ] Implement Master Orchestrator: basic risk fusion

#### Month 3: Integration & Testing
- [ ] End-to-end data flow testing (sensors → agents → orchestrator → alerts)
- [ ] Field testing: 100+ hours of real-world driving
- [ ] Tune alert thresholds for acceptable false-positive rate (<5%)
- [ ] Document system architecture and deployment guide

**Deliverables:**
- Working prototype in test vehicle
- Data logging pipeline operational
- Initial safety metrics (alert accuracy, system uptime)

---

### Phase 2: Intelligence (Months 4-6)
**Goal:** Add predictive capabilities and self-learning

#### Month 4: Advanced Vision & Radar
- [ ] Enhance Vision Agent: traffic sign recognition, weather detection, driver attention monitoring
- [ ] Enhance Radar Agent: blind spot detection, cross-traffic alerts
- [ ] Implement multi-target tracking (Kalman filtering)

#### Month 5: Predictive Modeling
- [ ] Develop collision prediction model (LSTM, trained on logged near-misses)
- [ ] Implement driver behavior profiling (clustering, personalized thresholds)
- [ ] Add contextual risk scoring (time of day, weather, traffic density)

#### Month 6: Self-Learning Pipeline
- [ ] Deploy nightly feature engineering jobs
- [ ] Implement weekly model retraining (XGBoost risk scorer)
- [ ] A/B testing framework for model updates
- [ ] OTA update mechanism for models and firmware

**Deliverables:**
- Self-improving risk assessment
- Personalized driver profiles
- Predictive collision warnings (5-second horizon)

---

### Phase 3: Connected (Months 7-12)
**Goal:** Enable V2X and fleet-scale insights

#### Month 7-8: V2X Protocol Implementation
- [ ] Integrate 802.11p or C-V2X radio module
- [ ] Implement CAM/DENM message encoding/decoding
- [ ] Broadcast vehicle state (position, velocity, heading) at 1 Hz
- [ ] Receive and process infrastructure alerts (traffic lights, hazards)

#### Month 9-10: Vehicle-to-Vehicle (V2V)
- [ ] Implement cooperative collision warning (exchange trajectories with nearby vehicles)
- [ ] Crowdsourced hazard mapping (vehicles report road hazards, aggregate in cloud)
- [ ] Fleet-level analytics dashboard (optional cloud service)

#### Month 11-12: Ecosystem & Scaling
- [ ] Develop API for third-party integrations (insurance telematics, fleet management)
- [ ] Publish open-source reference architecture
- [ ] Deploy in 10+ test vehicles for fleet validation
- [ ] Prepare for pilot partnerships (rideshare, commercial fleets)

**Deliverables:**
- V2X-enabled system communicating with infrastructure and other vehicles
- Crowdsourced hazard map (proof-of-concept)
- Open-source release (hardware design, agent code, deployment guide)

---

## Success Metrics

### Phase 1 (MVP)
| Metric | Target |
|--------|--------|
| System uptime during driving | >99% |
| Alert false-positive rate | <5% |
| Latency (sensor to alert) | <500ms |
| Data logging completeness | >98% |

### Phase 2 (Intelligence)
| Metric | Target |
|--------|--------|
| Near-miss prediction accuracy (5s horizon) | >80% precision |
| False-positive reduction (personalized) | -20% vs. Phase 1 |
| Driver engagement score (survey) | >7/10 |
| Model update frequency | Weekly |

### Phase 3 (Connected)
| Metric | Target |
|--------|--------|
| V2X message latency | <100ms |
| Hazard broadcast reliability | >95% |
| Fleet vehicles instrumented | 10+ |
| Third-party API integrations | 2+ partners |

### Long-Term Impact (Year 2+)
| Metric | Target |
|--------|--------|
| Collision rate reduction | -30% vs. baseline |
| Insurance premium savings | 10-20% |
| User retention (active use after 1 year) | >70% |
| Open-source adoption | 100+ forks, 10+ contributors |

---

## Risk & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Edge compute performance insufficient for real-time processing | HIGH | MEDIUM | Benchmark early; use model quantization (INT8); downgrade to Haiku for non-critical agents |
| Sensor calibration drift over time | MEDIUM | HIGH | Monthly auto-calibration routines; user-triggered recalibration; store calibration history |
| CAN bus incompatibility (vehicle-specific) | MEDIUM | MEDIUM | Maintain vehicle compatibility matrix; community-sourced CAN databases (OpenDBC) |
| V2X infrastructure unavailable (Phase 3) | LOW | HIGH | Design system to work offline-first; V2X as optional enhancement, not dependency |

### Safety Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| False alerts cause driver distraction | HIGH | MEDIUM | Tune thresholds aggressively in testing; implement alert prioritization; allow user customization |
| System failure during critical event | CRITICAL | LOW | Redundant watchdog; fail-safe mode (revert to basic alerts); extensive FMEA testing |
| Driver over-reliance on system | HIGH | MEDIUM | Explicit disclaimers; "driver monitoring" reminders; periodic engagement checks |

### Legal/Regulatory Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Aftermarket safety device liability | HIGH | MEDIUM | Clear terms of use; classify as "driver assistance, not autonomous"; liability insurance |
| Data privacy violations (GDPR, CCPA) | MEDIUM | LOW | Local-first processing; opt-in telemetry; anonymization; transparent privacy policy |
| V2X spectrum licensing (Phase 3) | MEDIUM | MEDIUM | Use unlicensed bands where possible; partner with licensed operators; track regulatory changes |

---

## Business Model (Optional / Future)

### Target Market Segments
1. **Enthusiast Owners:** Classic car collectors, older vehicle owners who want modern safety
2. **Fleet Operators:** Taxi, rideshare, delivery drivers (insurance savings, safety compliance)
3. **Developing Markets:** Regions where average vehicle age is 10-15 years
4. **Research/Academia:** Universities studying connected vehicles, autonomous systems

### Revenue Streams (Potential)
- **Hardware Kit Sales:** £1,250 per vehicle (BOM cost + margin)
- **SaaS Subscription:** £5-10/month for cloud analytics, OTA updates, V2X premium features
- **Data Licensing:** Anonymized fleet data for insurance, urban planning, automotive OEMs
- **API Access:** Third-party developers building on AVSS platform

### Open-Source Strategy
- **Core system:** Apache 2.0 license (encourage adoption, derivative works)
- **Premium features:** Dual-license model (open-source for personal use, commercial license for fleets)
- **Community:** Foster contributor ecosystem (hardware mods, agent enhancements, vehicle compatibility)

---

## Appendices

### A. Glossary
- **ADAS:** Advanced Driver Assistance Systems
- **CAM:** Cooperative Awareness Message (V2X standard)
- **CAN:** Controller Area Network (vehicle data bus)
- **DENM:** Decentralized Environmental Notification Message (V2X standard)
- **FCW:** Forward Collision Warning
- **FMEA:** Failure Modes and Effects Analysis
- **OTA:** Over-The-Air (remote software updates)
- **V2X:** Vehicle-to-Everything (communication protocol)

### B. References
- IEEE 802.11p: Wireless Access in Vehicular Environments (WAVE)
- ISO 26262: Functional Safety for Road Vehicles
- OpenDBC: Open-source CAN bus database project
- NHTSA ADAS Guidelines: National Highway Traffic Safety Administration recommendations

### C. Related Work
- OpenPilot (Comma.ai): Open-source ADAS, but single-agent architecture
- Apollo (Baidu): Full autonomous stack, overly complex for retrofit
- Mobileye: Proprietary, closed ecosystem, expensive

**AVSS Differentiation:** Multi-agent agentic architecture, open-source, retrofit-first design, V2X-ready

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-26 | Mondweep Chakravorty | Initial PRD |

---

**Next Steps:**
1. Review and refine PRD with stakeholders
2. Finalize hardware selection (Jetson vs. Raspberry Pi)
3. Set up development environment (OpenClaw multi-instance testing)
4. Begin Phase 1 Month 1 tasks (hardware procurement)

**Questions / Feedback:** mondweep@dxsure.uk
