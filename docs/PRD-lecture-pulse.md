# PRD: LecturePulse + DeskBreak

> **Product:** LecturePulse — Real-time lecture engagement & posture wellness app
> **Version:** 1.0 (MVP for Greenwich University guest lecture)
> **Date:** 2026-02-17
> **Author:** Mondweep Chakravorty
> **Status:** Draft

---

## 1. Problem Statement

During a 60–90 minute lecture, students progressively disengage — slouching,
looking at phones, losing focus. Lecturers have no objective signal of audience
state and no mechanism to intervene before attention is lost. Prolonged poor
sitting posture also contributes to discomfort and reduced cognitive performance.

ErgoFit demonstrated that browser-based pose detection can track posture in
real time. This product extends that concept from a single user at a desk to an
entire lecture theatre of ~30 participants.

---

## 2. Target Users

| Persona | Device | Goal |
|---------|--------|------|
| **Student** | Personal smartphone (iOS/Android), browser | Get gentle posture nudges, see personal score, participate in the session |
| **Lecturer / Presenter** | Laptop connected to projector | See aggregate room engagement, spot attention dips, trigger stretch breaks |

---

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Student participation | % of attendees who join via QR | ≥ 70% (21 of 30) |
| Posture awareness | Average posture score improvement (start vs end) | ≥ 10% |
| Engagement visibility | Lecturer can see live aggregate data | Real-time (< 2s latency) |
| Zero-friction onboarding | Time from QR scan to tracking | < 15 seconds |
| No install required | Runs in mobile browser | 100% (PWA-capable) |

---

## 4. Functional Requirements

### 4.1 Student Mobile View

| ID | Requirement | Priority |
|----|-------------|----------|
| S-01 | Landing page with session join (via QR code or short URL) | P0 |
| S-02 | Camera permission request with clear explanation of privacy | P0 |
| S-03 | Real-time pose detection using front camera (MediaPipe Pose) | P0 |
| S-04 | Posture score calculation (0–100) based on head tilt, shoulder alignment, slouch angle | P0 |
| S-05 | Visual posture indicator (colour arc: green/amber/red) | P0 |
| S-06 | Gentle nudge notification when posture score < 40 for > 120 seconds | P1 |
| S-07 | Session summary at end: average score, time in good posture, improvement trend | P1 |
| S-08 | Anonymous nickname generation (no personal data collected) | P0 |
| S-09 | Camera preview with skeleton overlay (toggleable) | P1 |
| S-10 | Stretch break participation mode when triggered by presenter | P1 |

### 4.2 Presenter Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| P-01 | Dashboard accessible at `/dashboard` route (laptop browser, projector-friendly) | P0 |
| P-02 | Real-time aggregate engagement score (average posture score across all participants) | P0 |
| P-03 | Participant count (connected / total) | P0 |
| P-04 | Engagement timeline chart (score over time, 1-minute intervals) | P0 |
| P-05 | Posture distribution visualisation (pie/donut: good / fair / poor) | P1 |
| P-06 | Anonymous leaderboard (top 5 posture scores, nicknames only) | P1 |
| P-07 | "Trigger Stretch Break" button — sends signal to all connected students | P1 |
| P-08 | QR code display for students to scan and join | P0 |
| P-09 | Session controls: start / pause / end session | P0 |
| P-10 | Dark theme optimised for projection | P0 |

### 4.3 Session Management

| ID | Requirement | Priority |
|----|-------------|----------|
| M-01 | Presenter creates a session, receives a 4-character room code | P0 |
| M-02 | Students join via QR code or by entering room code | P0 |
| M-03 | Session state persisted in-memory (no database required for MVP) | P0 |
| M-04 | Session auto-ends after 2 hours of inactivity | P1 |
| M-05 | Session summary exportable as JSON at end | P2 |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-01 | Latency: pose detection to dashboard update | < 2 seconds |
| NF-02 | Concurrent connections | ≥ 50 simultaneous |
| NF-03 | Mobile browser support | Chrome (Android), Safari (iOS) |
| NF-04 | No native app install required | Web-only |
| NF-05 | Works on university WiFi (single network) | Same-LAN WebSocket |
| NF-06 | CPU usage on student phone | < 30% sustained |
| NF-07 | All processing on-device; only scores sent to server | Privacy by design |
| NF-08 | Accessible: WCAG AA colour contrast on dashboard | AA compliance |
| NF-09 | Responsive: student view works portrait on any phone | 320px minimum |

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    University WiFi                       │
│                                                         │
│  ┌──────────────┐         ┌──────────────────────────┐  │
│  │ Student Phone │────────▶│     Node.js Server       │  │
│  │              │ WS/JSON  │  (Express + ws)          │  │
│  │ React SPA    │◀────────│                          │  │
│  │ MediaPipe    │         │  - Session management    │  │
│  │ Pose (local) │         │  - Score aggregation     │  │
│  └──────────────┘         │  - WebSocket broadcast   │  │
│        ×30                │                          │  │
│                           └──────────┬───────────────┘  │
│                                      │                  │
│                           ┌──────────▼───────────────┐  │
│                           │  Presenter Dashboard     │  │
│                           │  React SPA               │  │
│                           │  (Charts, Leaderboard,   │  │
│                           │   QR code, Controls)     │  │
│                           │  Displayed on projector  │  │
│                           └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + TypeScript | Fast dev, component model, hooks |
| Pose Detection | MediaPipe Pose (via @mediapipe/tasks-vision) | Runs on-device, no server GPU needed, works in mobile browser |
| Charts | Recharts or Chart.js | Lightweight, React-friendly |
| QR Generation | qrcode.react | Generate joinable QR on dashboard |
| Server | Node.js + Express | Lightweight, JS everywhere |
| WebSocket | ws (npm) | Native WebSocket, low overhead |
| Styling | Tailwind CSS | Utility-first, fast to style, dark theme |
| Build | Vite | Fast HMR, single build for client + server |

### Data Flow

1. **Student phone** runs MediaPipe Pose on camera frames (on-device)
2. Pose landmarks → posture scoring algorithm (head angle, shoulder delta, torso lean)
3. Score (0–100) + anonymous nickname sent to server via WebSocket every 3 seconds
4. Server aggregates all scores, computes room average, updates timeline
5. Server broadcasts aggregate state to presenter dashboard via WebSocket
6. Dashboard renders charts, leaderboard, engagement arc in real time

### WebSocket Message Protocol

```typescript
// Student → Server
interface StudentUpdate {
  type: "posture_update";
  roomCode: string;
  nickname: string;
  score: number;        // 0–100
  headTilt: number;     // degrees
  shoulderDelta: number; // px difference
  timestamp: number;
}

// Server → Dashboard
interface DashboardState {
  type: "dashboard_state";
  participantCount: number;
  averageScore: number;
  distribution: { good: number; fair: number; poor: number };
  leaderboard: { nickname: string; score: number }[];
  timeline: { time: string; score: number }[];
}

// Server → All Students
interface StretchBreak {
  type: "stretch_break";
  duration: number; // seconds
}
```

---

## 7. Posture Scoring Algorithm

Borrowed and adapted from ErgoFit:

```
score = 100
  - (headTiltPenalty)        // 0–30 pts: angle of head from vertical
  - (shoulderAsymmetry)      // 0–20 pts: left/right shoulder height diff
  - (torsoLeanPenalty)       // 0–30 pts: forward/backward lean angle
  - (neckForwardPenalty)     // 0–20 pts: ear-to-shoulder horizontal offset

Thresholds:
  good:  score ≥ 70  (green)
  fair:  score 40–69 (amber)
  poor:  score < 40  (red)
```

Key landmarks from MediaPipe Pose used:
- Nose (0), Left/Right Ear (7, 8), Left/Right Shoulder (11, 12),
  Left/Right Hip (23, 24)

---

## 8. Privacy & Ethics

| Concern | Mitigation |
|---------|-----------|
| Camera access | Explicit opt-in with clear explanation; students can decline |
| Video data | **Never** leaves the device — only numeric scores sent to server |
| Identity | Anonymous auto-generated nicknames; no login, no personal data |
| Storage | No data persisted beyond session; in-memory only |
| Consent | Verbal consent at start of lecture; participation is voluntary |
| GDPR | No personal data collected or stored — no GDPR obligations triggered |

---

## 9. Project Structure

```
lecture-pulse/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── server/
│   ├── index.ts              # Express + WebSocket server
│   ├── session.ts            # Session & room management
│   └── aggregator.ts         # Score aggregation logic
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router: student vs dashboard
│   ├── components/
│   │   ├── student/
│   │   │   ├── CameraView.tsx      # Camera + MediaPipe integration
│   │   │   ├── PostureScore.tsx     # Score display (arc indicator)
│   │   │   ├── JoinSession.tsx      # Room code entry
│   │   │   ├── PostureNudge.tsx     # Nudge overlay
│   │   │   └── StretchMode.tsx      # Stretch break participation
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.tsx  # Main dashboard grid
│   │   │   ├── EngagementChart.tsx  # Timeline chart
│   │   │   ├── PosturePie.tsx       # Distribution donut
│   │   │   ├── Leaderboard.tsx      # Top 5 anonymous scores
│   │   │   ├── QRDisplay.tsx        # Joinable QR code
│   │   │   ├── RoomStats.tsx        # Participant count, avg score
│   │   │   └── SessionControls.tsx  # Start/pause/end + stretch break
│   │   └── shared/
│   │       ├── ScoreBadge.tsx       # Reusable score indicator
│   │       └── SkeletonOverlay.tsx  # Pose landmark visualisation
│   ├── hooks/
│   │   ├── usePoseDetection.ts      # MediaPipe Pose hook
│   │   ├── usePostureScore.ts       # Score calculation from landmarks
│   │   └── useWebSocket.ts          # WebSocket connection hook
│   ├── lib/
│   │   ├── posture.ts               # Scoring algorithm
│   │   ├── nicknames.ts             # Anonymous name generator
│   │   └── constants.ts             # Thresholds, intervals
│   └── types/
│       └── index.ts                 # Shared TypeScript types
├── public/
│   └── favicon.svg
└── tests/
    ├── posture.test.ts              # Scoring algorithm unit tests
    ├── aggregator.test.ts           # Aggregation logic tests
    ├── session.test.ts              # Session management tests
    └── components/
        ├── JoinSession.test.tsx
        ├── PostureScore.test.tsx
        └── DashboardLayout.test.tsx
```

---

## 10. User Flows

### Flow 1: Student Joins & Tracks Posture

```
1. Lecturer displays QR code on projector
2. Student scans QR → mobile browser opens /join?room=ABCD
3. App assigns random nickname ("Blue Falcon")
4. Camera permission prompt → student allows
5. MediaPipe loads (~2s) → skeleton overlay appears
6. Posture score starts updating (every 3s → server)
7. Score arc shows green/amber/red
8. After 2 mins of slouching → gentle nudge appears
9. Student adjusts → score improves → nudge dismissed
10. Lecturer ends session → summary screen shown
```

### Flow 2: Presenter Monitors Room

```
1. Lecturer opens /dashboard on laptop
2. Clicks "Create Session" → room code generated (e.g. "PULSE")
3. QR code displayed → students start joining
4. Participant counter increments as students connect
5. Aggregate score and timeline populate in real time
6. Lecturer notices dip in engagement → asks a question
7. Mid-lecture: clicks "Stretch Break" → students get prompt
8. Engagement recovers → visible on timeline
9. End of session → final summary with peak/trough moments
```

---

## 11. Stretch Break Feature

When the presenter triggers a stretch break:

1. All connected students receive a `stretch_break` message
2. Student UI shows a full-screen stretch prompt with a timer
3. Simple guided poses: "Raise your arms... Roll your shoulders..."
4. MediaPipe detects raised arms / movement → participation registered
5. Dashboard shows live participation count: "23 of 28 stretching!"
6. Timer ends → students return to normal tracking

---

## 12. Deployment for Lecture Day

```bash
# On lecturer's laptop (same WiFi as students)
npm install
npm run build
npm start
# → Server runs on http://<laptop-ip>:3000
# → QR code on dashboard points to this address
```

No cloud deployment needed. Everything runs on the local network.
Fallback: deploy to a free tier (Render / Railway) if network issues.

---

## 13. Out of Scope (v1)

- Facial expression / emotion detection
- Audio analysis (voice energy, silence detection)
- Historical session comparison
- Multi-room support
- Native mobile app
- Cloud persistence / user accounts
- Video recording or streaming
- AI-generated lecture feedback

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| University WiFi blocks WebSocket | App fails to connect | Fallback: deploy to public URL; or use HTTP polling |
| MediaPipe too slow on older phones | Poor UX, battery drain | Reduce detection frequency to every 5s; allow score-only mode |
| Students decline camera access | Low participation | Offer manual check-in mode (tap to rate own posture) |
| Too many connections overwhelm server | Dashboard lag | Throttle updates to 1/3s; tested for 50 concurrent |
| Projector resolution too low for dashboard | Unreadable charts | Large fonts, high-contrast dark theme, minimal detail |

---

## 15. Implementation Phases

| Phase | Scope | Agents |
|-------|-------|--------|
| 1 | Server: Express + WS + session management + aggregation | Backend agents |
| 2 | Student view: camera, MediaPipe, posture scoring, nudges | Frontend + ML agents |
| 3 | Dashboard: charts, leaderboard, QR, session controls | Frontend agents |
| 4 | Integration: end-to-end flow, stretch break feature | Integration agents |
| 5 | Quality: tests, accessibility, performance tuning | QE agents |
