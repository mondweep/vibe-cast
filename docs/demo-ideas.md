# Demo Ideas: Agentic Engineering for Lecture Hall Wellness

> **Context:** Guest lecture at Greenwich University, ~30 students in a lecture theatre.
> Students seated at desks. Goal: demonstrate the power of agentic AI engineering
> by building something live that borrows concepts from the
> [ErgoFit](https://github.com/mondweep/ergofit) posture-tracking app.

---

## Idea 1 — LecturePulse: Audience Engagement & Posture Dashboard

**The presenter's view of the room.**

- The lecturer's laptop camera (or a room-facing webcam) detects the audience
- Tracks aggregate signals: **leaning forward** (engaged), **slouching** (fading),
  **heads down** (on phones / lost), **upright** (attentive)
- Displays a real-time dashboard on the projector: engagement score, posture
  heatmap, attention trend over time
- Could trigger the lecturer to take a break, ask a question, or shift tone

**Why it works as a demo:** You're literally using it *while* delivering the lecture.
Meta and memorable.

---

## Idea 2 — DeskBreak: Student Self-Check via Phone

**Each student's personal posture coach during the lecture.**

- Students open a web app on their phone (propped on desk or held)
- Front camera tracks their posture: head tilt, shoulder alignment, slouch angle
- Gentle nudges: *"You've been slouching for 8 mins — try sitting up"*
- Gamified: posture score shown at end of session, anonymous leaderboard on
  the projector

**Why it works as a demo:** Every student participates. Shows the
phone-as-sensor pattern. Crowd energy.

---

## Idea 3 — VibeCheck: Real-Time Lecture Mood Ring

**Collective wellness pulse of the room.**

- Combines posture signals with optional emoji reactions (students tap phone)
- Aggregates into a live "room vibe" visualisation on the projector — calm,
  energised, restless, focused
- Tracks the vibe over the lecture timeline so you can see where energy
  peaked or dipped
- End of lecture: *"Here's how the room felt across the session"*

**Why it works as a demo:** Visual, interactive, gives the talk a narrative arc.

---

## Idea 4 — PostureParty: Stretch Break Orchestrator

**Guided micro-break for the whole room, tracked live.**

- At a chosen moment, trigger a 60-second guided stretch break
- Students' phone cameras track whether they're actually doing the stretch
  (arms up, neck rolls, shoulder shrugs)
- Live participation meter on the projector — *"23 of 30 stretching!"*
- Ties directly to the ergonomic research behind ErgoFit

**Why it works as a demo:** Physical, fun, breaks up the lecture, directly
demonstrates pose estimation.

---

## Idea 5 — SitScore: Before/After Posture Snapshot

**The simplest version — still impressive.**

- Start of lecture: students take a "posture selfie" via a web app
- The app scores their sitting posture (spine angle, shoulder symmetry,
  head position)
- End of lecture: take another snapshot. Compare. *"Did you improve?"*
- Shows the core ML pipeline in the simplest possible way

**Why it works as a demo:** Low complexity, high impact. Easy to build live.

---

## Recommended Approach

**Combine Idea #1 (LecturePulse) + Idea #2 (DeskBreak)** into a single app:

| Component | What it does |
|---|---|
| **Student view** (phone browser) | Personal posture tracking via front camera, gentle nudges, personal score |
| **Presenter dashboard** (laptop, projected) | Aggregate engagement/posture of the room, live timeline, anonymous leaderboard |

**Tech stack:** Single web app (React + MediaPipe Pose via TensorFlow.js),
no install needed — students scan a QR code. A lightweight WebSocket server
aggregates data for the presenter dashboard.

See `docs/PRD-lecture-pulse.md` for the full product requirements document.
