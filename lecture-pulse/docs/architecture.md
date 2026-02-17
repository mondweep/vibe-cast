# LecturePulse - Architecture & Design Document

## 1. Overview

LecturePulse is a real-time lecture engagement platform that uses computer vision to monitor student posture, providing presenters with live analytics and students with posture feedback. Camera frames never leave the student's device -- only computed scores are transmitted.

---

## 2. High-Level System Architecture

```mermaid
graph TB
    subgraph Students["Student Browsers (N clients)"]
        S1[Student 1<br/>Camera + MediaPipe]
        S2[Student 2<br/>Camera + MediaPipe]
        SN[Student N<br/>Camera + MediaPipe]
    end

    subgraph Server["Node.js Server :3000"]
        EX[Express Static Server]
        WS[WebSocket Server<br/>/ws endpoint]
        SM[SessionManager<br/>In-Memory State]
        AG[Aggregator<br/>Stats Engine]
        BC[Broadcast Loop<br/>Every 2s]
    end

    subgraph Presenter["Presenter Browser"]
        DB[Dashboard Layout]
        QR[QR Code Display]
        CH[Engagement Chart]
        LB[Leaderboard]
        PP[Posture Pie]
        SC[Session Controls]
    end

    S1 -->|posture_update| WS
    S2 -->|posture_update| WS
    SN -->|posture_update| WS

    WS --> SM
    SM --> AG
    AG --> BC

    BC -->|dashboard_state| DB
    WS -->|stretch_break| S1
    WS -->|stretch_break| S2
    WS -->|stretch_break| SN

    DB --> QR
    DB --> CH
    DB --> LB
    DB --> PP
    DB --> SC

    SC -->|trigger_stretch_break| WS
    SC -->|create_session / end_session| WS

    style Students fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style Server fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style Presenter fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
```

---

## 3. Technology Stack

```mermaid
graph LR
    subgraph Frontend["Frontend"]
        React["React 18.3"]
        RR["React Router 6"]
        TW["Tailwind CSS 3.4"]
        RC["Recharts 2.15"]
        QRC["qrcode.react 4.2"]
        TS1["TypeScript 5.7"]
    end

    subgraph ML["Computer Vision"]
        MP["MediaPipe Pose 0.10"]
        GPU["GPU Delegate<br/>WebGL Acceleration"]
    end

    subgraph Backend["Backend"]
        Node["Node.js"]
        Exp["Express 4.21"]
        WSLib["ws 8.18<br/>WebSocket"]
        TS2["TypeScript 5.7"]
        TSX["tsx 4.19<br/>Runtime"]
    end

    subgraph Build["Build & Test"]
        Vite["Vite 6.0"]
        Vitest["Vitest 2.1"]
        PC["PostCSS"]
    end

    React --- RR
    React --- TW
    React --- RC
    React --- QRC
    MP --- GPU
    Exp --- WSLib
    Vite --- Vitest

    style Frontend fill:#1e3a5f,stroke:#3b82f6,color:#e2e8f0
    style ML fill:#1e3a5f,stroke:#f59e0b,color:#e2e8f0
    style Backend fill:#1e3a5f,stroke:#10b981,color:#e2e8f0
    style Build fill:#1e3a5f,stroke:#8b5cf6,color:#e2e8f0
```

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **UI Framework** | React | 18.3.1 | Component rendering |
| **Routing** | React Router | 6.28.0 | SPA client-side routing |
| **Styling** | Tailwind CSS | 3.4.16 | Utility-first dark-theme styling |
| **Charts** | Recharts | 2.15.0 | Line & pie chart visualizations |
| **QR Generation** | qrcode.react | 4.2.0 | SVG QR codes for session join |
| **Pose Detection** | MediaPipe Pose | 0.10.18 | On-device skeleton tracking |
| **Server** | Express | 4.21.2 | HTTP + static file serving |
| **WebSocket** | ws | 8.18.0 | Real-time bidirectional comms |
| **Language** | TypeScript | 5.7.2 | Type safety across stack |
| **Build Tool** | Vite | 6.0.3 | Dev server + production bundler |
| **Test Framework** | Vitest | 2.1.8 | Unit + component testing |

---

## 4. Frontend Architecture

### 4.1 Component Tree

```mermaid
graph TD
    App["App<br/>(Router)"]

    App --> JP["JoinPage<br/>Route: /"]
    App --> SP["SessionPage<br/>Route: /session"]
    App --> DL["DashboardLayout<br/>Route: /dashboard"]

    JP --> JS["JoinSession<br/>Room code input"]

    SP --> SV["SessionView"]
    SV --> CV["CameraView<br/>Video + Skeleton"]
    SV --> PS["PostureScore<br/>SVG Arc Gauge"]
    SV --> PN["PostureNudge<br/>Alert Overlay"]
    SV --> SM2["StretchMode<br/>Break Overlay"]
    CV --> SO["SkeletonOverlay<br/>Canvas Drawing"]

    DL --> QR["QRDisplay"]
    DL --> RS["RoomStats"]
    DL --> EC["EngagementChart"]
    DL --> LB["Leaderboard"]
    DL --> PP["PosturePie"]
    DL --> SC["SessionControls"]
    LB --> SB["ScoreBadge"]

    style App fill:#3b82f6,stroke:#60a5fa,color:#fff
    style JP fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style SP fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style DL fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
    style SV fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
```

### 4.2 Hooks Architecture

```mermaid
graph LR
    subgraph StudentHooks["Student Hooks"]
        WS["useWebSocket<br/>WS connection + messages"]
        PD["usePoseDetection<br/>MediaPipe model + landmarks"]
        PSc["usePostureScore<br/>Score calculation"]
    end

    subgraph DashHooks["Dashboard Hooks"]
        DS["useDashboardSocket<br/>WS + actions + state"]
    end

    Camera["Camera<br/>getUserMedia"] --> PD
    PD -->|landmarks| PSc
    PSc -->|score, headTilt, shoulderDelta| WS
    WS -->|stretchBreak| StretchMode

    DS -->|dashboardState| Charts["Charts &<br/>Leaderboard"]
    DS -->|createSession<br/>endSession<br/>triggerStretch| ServerWS["Server WS"]

    style StudentHooks fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style DashHooks fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
```

| Hook | Concern | Key State | Frequency |
|------|---------|-----------|-----------|
| `useWebSocket` | Student WS connection | `isConnected`, `stretchBreak`, `error` | On score change |
| `usePoseDetection` | MediaPipe model + detection | `landmarks`, `isLoading`, `error` | Every 3s |
| `usePostureScore` | Score from landmarks | `score`, `classification`, `isTracking` | On landmark change |
| `useDashboardSocket` | Presenter WS + actions | `dashboardState`, `roomCode`, `sessionActive` | Every 2s (receives) |

---

## 5. Backend Architecture

### 5.1 Server Components

```mermaid
graph TD
    subgraph ExpressServer["Express Server :3000"]
        HTTP["HTTP Layer<br/>Static Files + SPA Fallback"]
        Health["/health endpoint"]
    end

    subgraph WSServer["WebSocket Server /ws"]
        MH["Message Handler<br/>switch(msg.type)"]
        CM["Connection Metadata<br/>Map&lt;ws, {role, roomCode, nickname}&gt;"]
    end

    subgraph SessionLayer["Session Layer"]
        SMgr["SessionManager<br/>Map&lt;roomCode, Session&gt;"]
        Cleanup["Auto-Cleanup Timer<br/>Every 60s, TTL 2h"]
    end

    subgraph BroadcastLayer["Broadcast Layer"]
        BLoop["Broadcast Loop<br/>setInterval 2000ms"]
        AGG["aggregateStats()"]
        BTS["broadcastToStudents()"]
        BTD["broadcastToDashboards()"]
    end

    HTTP --> Health
    WSServer --> MH
    MH --> CM
    MH --> SMgr
    SMgr --> Cleanup
    BLoop --> AGG
    AGG --> BTD
    MH --> BTS

    style ExpressServer fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style WSServer fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style SessionLayer fill:#1e293b,stroke:#f59e0b,color:#e2e8f0
    style BroadcastLayer fill:#1e293b,stroke:#ef4444,color:#e2e8f0
```

### 5.2 Session Data Model

```mermaid
classDiagram
    class SessionManager {
        -sessions: Map~string, Session~
        -cleanupTimer: Timer
        +createSession() string
        +joinSession(roomCode, nickname) boolean
        +leaveSession(roomCode, nickname) void
        +updateScore(roomCode, nickname, score, headTilt, shoulderDelta) void
        +endSession(roomCode) void
        +getAllSessions() Map
    }

    class Session {
        +roomCode: string
        +students: Map~string, Student~
        +timeline: TimelineEntry[]
        +createdAt: number
        +lastActivity: number
    }

    class Student {
        +id: string
        +nickname: string
        +score: number
        +label: good | fair | poor
        +headTilt: number
        +shoulderDelta: number
        +lastUpdate: number
    }

    class TimelineEntry {
        +time: string
        +score: number
    }

    class DashboardState {
        +type: dashboard_state
        +participantCount: number
        +averageScore: number
        +distribution: Distribution
        +leaderboard: LeaderboardEntry[]
        +timeline: TimelineEntry[]
    }

    SessionManager "1" --> "*" Session
    Session "1" --> "*" Student
    Session "1" --> "*" TimelineEntry
    Session ..> DashboardState : aggregateStats()
```

---

## 6. WebSocket Protocol

### 6.1 Message Flow Sequence

```mermaid
sequenceDiagram
    participant P as Presenter
    participant S as Server
    participant St as Student

    Note over P,St: Session Lifecycle

    P->>S: create_session
    S->>P: session_created {roomCode: "ABCD"}

    St->>S: join_session {roomCode, nickname}
    S->>St: join_confirmed

    loop Every 3 seconds
        Note over St: MediaPipe detects pose
        Note over St: calculatePostureScore()
        St->>S: posture_update {score, headTilt, shoulderDelta}
        S->>S: sessionManager.updateScore()
    end

    loop Every 2 seconds
        S->>S: aggregateStats(session)
        S->>P: dashboard_state {participants, avg, distribution, leaderboard, timeline}
    end

    Note over P,St: Stretch Break

    P->>S: trigger_stretch_break {roomCode, duration: 30}
    S->>St: stretch_break {duration: 30}
    S->>P: stretch_break {duration: 30}
    Note over St: StretchMode overlay (30s countdown)

    Note over P,St: Session End

    P->>S: end_session {roomCode}
    S->>St: session_ended
    S->>P: session_ended
```

### 6.2 Message Types Reference

```mermaid
graph LR
    subgraph ClientToServer["Client -> Server"]
        CS1["create_session"]
        CS2["join_session<br/>{roomCode, nickname}"]
        CS3["posture_update<br/>{roomCode, nickname, score,<br/>headTilt, shoulderDelta}"]
        CS4["trigger_stretch_break<br/>{roomCode, duration}"]
        CS5["end_session<br/>{roomCode}"]
        CS6["subscribe_dashboard<br/>{roomCode?}"]
    end

    subgraph ServerToClient["Server -> Client"]
        SC1["session_created<br/>{roomCode}"]
        SC2["join_confirmed"]
        SC3["dashboard_state<br/>{participantCount, averageScore,<br/>distribution, leaderboard, timeline}"]
        SC4["stretch_break<br/>{duration}"]
        SC5["session_ended<br/>{roomCode}"]
        SC6["error<br/>{message}"]
    end

    style ClientToServer fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style ServerToClient fill:#1e293b,stroke:#10b981,color:#e2e8f0
```

---

## 7. Posture Detection Pipeline

### 7.1 End-to-End Flow

```mermaid
graph TD
    CAM["Camera Feed<br/>getUserMedia()"] --> VID["Video Element<br/>(mirrored)"]
    VID --> MP["MediaPipe PoseLandmarker<br/>GPU-accelerated, float16 lite"]
    MP --> LM["33 Pose Landmarks<br/>{x, y, z, visibility}"]
    LM --> EXT["Extract Key Points<br/>Ears (7,8), Shoulders (11,12), Hips (23,24)"]

    EXT --> HT["Head Tilt<br/>Ear-to-Shoulder angle<br/>Penalty: 0-30"]
    EXT --> SA["Shoulder Asymmetry<br/>|left.y - right.y|<br/>Penalty: 0-20"]
    EXT --> TL["Torso Lean<br/>Shoulder-to-Hip angle<br/>Penalty: 0-30"]
    EXT --> NF["Neck Forward<br/>Ear-to-Shoulder distance<br/>Penalty: 0-20"]

    HT --> CALC["score = 100 - sum(penalties)<br/>clamp(0, 100)"]
    SA --> CALC
    TL --> CALC
    NF --> CALC

    CALC --> CLASS{"score >= 70?"}
    CLASS -->|Yes| GOOD["Good"]
    CLASS -->|No| CLASS2{"score >= 40?"}
    CLASS2 -->|Yes| FAIR["Fair"]
    CLASS2 -->|No| POOR["Poor"]

    CALC --> WS_SEND["Send via WebSocket<br/>to Server"]
    CALC --> UI["Update UI<br/>PostureScore Arc"]

    style CAM fill:#3b82f6,stroke:#60a5fa,color:#fff
    style MP fill:#f59e0b,stroke:#fbbf24,color:#1e293b
    style CALC fill:#10b981,stroke:#34d399,color:#1e293b
    style GOOD fill:#10b981,stroke:#34d399,color:#fff
    style FAIR fill:#f59e0b,stroke:#fbbf24,color:#1e293b
    style POOR fill:#ef4444,stroke:#f87171,color:#fff
```

### 7.2 Landmark Indices Used

```mermaid
graph TD
    subgraph Skeleton["Key Landmarks (7 of 33)"]
        NOSE["0: Nose"]
        LEAR["7: Left Ear"]
        REAR["8: Right Ear"]
        LSHO["11: Left Shoulder"]
        RSHO["12: Right Shoulder"]
        LHIP["23: Left Hip"]
        RHIP["24: Right Hip"]
    end

    LEAR --- REAR
    LSHO --- RSHO
    LHIP --- RHIP
    LEAR --- LSHO
    REAR --- RSHO
    LSHO --- LHIP
    RSHO --- RHIP

    style Skeleton fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
```

### 7.3 Scoring Thresholds

| Metric | Max Penalty | Full Penalty At |
|--------|-------------|-----------------|
| Head Tilt | 30 pts | 45 degrees |
| Shoulder Asymmetry | 20 pts | 0.1 normalized units |
| Torso Lean | 30 pts | 45 degrees |
| Neck Forward | 20 pts | 0.15 normalized units |

---

## 8. Dashboard Visualization Pipeline

```mermaid
graph LR
    DS["dashboard_state<br/>(every 2s)"] --> PARSE["Parse JSON"]

    PARSE --> RS["RoomStats<br/>3 stat cards"]
    PARSE --> EC["EngagementChart<br/>Recharts LineChart"]
    PARSE --> LB["Leaderboard<br/>Top 5 students"]
    PARSE --> PP["PosturePie<br/>Recharts PieChart"]

    RS --> PC["participantCount"]
    RS --> AS["averageScore<br/>color-coded"]
    RS --> DUR["sessionDuration<br/>MM:SS timer"]

    EC --> TL["timeline[]<br/>{time, score}"]

    LB --> TOP["Top 5 by score<br/>Medal emojis"]

    PP --> DIST["distribution<br/>{good, fair, poor}"]

    style DS fill:#10b981,stroke:#34d399,color:#1e293b
```

---

## 9. Directory Structure

```mermaid
graph TD
    ROOT["lecture-pulse/"]

    ROOT --> SERVER["server/"]
    SERVER --> SI["index.ts<br/>Express + WS + Broadcasting"]
    SERVER --> SS["session.ts<br/>SessionManager class"]
    SERVER --> SAG["aggregator.ts<br/>Stats computation"]

    ROOT --> SRC["src/"]
    SRC --> COMP["components/"]
    COMP --> STU["student/"]
    STU --> JS2["JoinSession.tsx"]
    STU --> CV2["CameraView.tsx"]
    STU --> PS2["PostureScore.tsx"]
    STU --> PN2["PostureNudge.tsx"]
    STU --> SM3["StretchMode.tsx"]

    COMP --> DASH["dashboard/"]
    DASH --> DL2["DashboardLayout.tsx"]
    DASH --> QR2["QRDisplay.tsx"]
    DASH --> RS2["RoomStats.tsx"]
    DASH --> EC2["EngagementChart.tsx"]
    DASH --> LB2["Leaderboard.tsx"]
    DASH --> PP2["PosturePie.tsx"]
    DASH --> SC2["SessionControls.tsx"]

    COMP --> SH["shared/"]
    SH --> SB2["ScoreBadge.tsx"]
    SH --> SO2["SkeletonOverlay.tsx"]

    SRC --> HK["hooks/"]
    HK --> H1["useWebSocket.ts"]
    HK --> H2["usePoseDetection.ts"]
    HK --> H3["usePostureScore.ts"]
    HK --> H4["useDashboardSocket.ts"]

    SRC --> LIB["lib/"]
    LIB --> L1["posture.ts"]
    LIB --> L2["nicknames.ts"]
    LIB --> L3["constants.ts"]

    SRC --> TYP["types/index.ts"]
    SRC --> APPTSX["App.tsx"]
    SRC --> MAIN["main.tsx"]

    ROOT --> TESTS["tests/"]
    ROOT --> CFG["Config Files<br/>vite, tailwind, tsconfig, etc."]

    style ROOT fill:#3b82f6,stroke:#60a5fa,color:#fff
    style SERVER fill:#10b981,stroke:#34d399,color:#1e293b
    style SRC fill:#8b5cf6,stroke:#a78bfa,color:#fff
    style COMP fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
```

---

## 10. Data Flow Summary

### 10.1 Student -> Server -> Dashboard

```mermaid
flowchart LR
    A["Student Camera<br/>3s interval"] -->|33 landmarks| B["calculatePostureScore()"]
    B -->|"score, headTilt,<br/>shoulderDelta"| C["WebSocket<br/>posture_update"]
    C -->|JSON msg| D["Server<br/>updateScore()"]
    D -->|in-memory| E["Session.students<br/>Map"]
    E -->|2s interval| F["aggregateStats()"]
    F -->|broadcast| G["Dashboard<br/>dashboard_state"]
    G --> H["Charts + Stats<br/>re-render"]

    style A fill:#3b82f6,stroke:#60a5fa,color:#fff
    style D fill:#10b981,stroke:#34d399,color:#1e293b
    style G fill:#8b5cf6,stroke:#a78bfa,color:#fff
```

### 10.2 Presenter -> Server -> Students

```mermaid
flowchart LR
    A["Presenter clicks<br/>Stretch Break"] -->|trigger_stretch_break| B["Server"]
    B -->|stretch_break| C["All Students<br/>StretchMode overlay"]
    B -->|stretch_break| D["Dashboard<br/>(break indicator)"]

    A2["Presenter clicks<br/>End Session"] -->|end_session| B
    B -->|session_ended| C
    B -->|session_ended| D

    style A fill:#8b5cf6,stroke:#a78bfa,color:#fff
    style A2 fill:#ef4444,stroke:#f87171,color:#fff
    style B fill:#10b981,stroke:#34d399,color:#1e293b
```

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pose processing** | Client-side (MediaPipe) | Privacy: camera frames never leave the device |
| **State management** | React hooks (no Redux) | Small app; hooks provide sufficient encapsulation |
| **Real-time transport** | WebSocket (ws library) | Low-latency bidirectional; simpler than Socket.IO |
| **Session storage** | In-memory Maps | No persistence needed; sessions are ephemeral |
| **Detection interval** | 3 seconds | Balances CPU usage vs. responsiveness |
| **Dashboard refresh** | 2 second broadcast | Smooth chart updates without overloading |
| **Scoring algorithm** | Penalty-based (100 - sum) | Intuitive: start at 100, deduct for issues |
| **Room codes** | 4-char alphanumeric (no I/O) | Easy to type on mobile, avoids ambiguous characters |
| **Nicknames** | Random adjective + animal | Anonymous by default, no student accounts needed |
| **Timeline cap** | 1800 entries (~1 hour) | Prevents unbounded memory growth |
| **Auto-cleanup** | 2-hour TTL | Prevents abandoned sessions from leaking memory |

---

## 12. Security & Privacy

- Camera frames are processed **entirely on the client** via MediaPipe WASM/WebGL
- Only **numeric scores** (0-100) and **angle metrics** transit the network
- No authentication required (by design -- low-friction classroom use)
- No persistent storage of student data
- Sessions auto-expire after 2 hours of inactivity
- HTTPS support via WebSocket protocol detection (`wss://` on secure origins)

---

## 13. Component Detail Reference

### Student Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `JoinSession` | `student/JoinSession.tsx` | `onJoin(roomCode, nickname)` | 4-char room code entry, auto-nickname |
| `CameraView` | `student/CameraView.tsx` | `videoRef`, `landmarks`, `isTracking` | Video feed + skeleton overlay |
| `PostureScore` | `student/PostureScore.tsx` | `score`, `classification` | SVG arc gauge (270 degrees, color-coded) |
| `PostureNudge` | `student/PostureNudge.tsx` | `score` | Alert after 2min poor posture |
| `StretchMode` | `student/StretchMode.tsx` | `duration`, `onComplete` | Full-screen guided stretch countdown |

### Dashboard Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `DashboardLayout` | `dashboard/DashboardLayout.tsx` | (none, uses hook) | 12-col grid, timer, connection status |
| `QRDisplay` | `dashboard/QRDisplay.tsx` | `url`, `roomCode` | SVG QR code + room code display |
| `RoomStats` | `dashboard/RoomStats.tsx` | `participantCount`, `averageScore`, `sessionDuration` | 3 stat cards |
| `EngagementChart` | `dashboard/EngagementChart.tsx` | `timeline` | Recharts line chart with thresholds |
| `Leaderboard` | `dashboard/Leaderboard.tsx` | `leaderboard` | Top 5 students, medal emojis |
| `PosturePie` | `dashboard/PosturePie.tsx` | `distribution` | Recharts donut chart |
| `SessionControls` | `dashboard/SessionControls.tsx` | `onCreateSession`, `onEndSession`, `onTriggerStretch`, `sessionActive` | Create / stretch / end buttons |

### Shared Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `ScoreBadge` | `shared/ScoreBadge.tsx` | `score`, `size?` | Inline color-coded pill badge |
| `SkeletonOverlay` | `shared/SkeletonOverlay.tsx` | `landmarks`, `videoWidth`, `videoHeight` | Canvas pose skeleton on video |
