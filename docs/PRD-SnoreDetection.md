# Product Requirements Document — Somnus
## A phone-based snore monitoring, assessment and coaching web app

**Version:** 1.0
**Date:** 2026-09-16
**Status:** Approved for build
**Method:** Domain-Driven Design (strategic + tactical)

---

## 0. Safety statement (read first)

Somnus is a **wellness and self-tracking tool. It is not a medical device, it
does not diagnose, and it must never imply that it does.**

Loud habitual snoring is a recognised symptom of **obstructive sleep apnoea
(OSA)**, a condition with real cardiovascular and daytime-safety consequences
that requires clinical diagnosis (usually polysomnography or a home sleep
apnoea test). A phone microphone on a bedside table cannot measure airflow,
blood oxygen saturation, or respiratory effort, and therefore **cannot detect
apnoeas or compute an Apnoea-Hypopnoea Index (AHI)**.

Two requirements follow, and they are non-negotiable acceptance criteria:

1. **Signposting, not diagnosis.** The product screens for OSA *risk* using the
   validated STOP-BANG questionnaire and, above threshold, tells the user
   plainly to speak to a clinician. It never says "you have sleep apnoea", and
   never says "you do not".
2. **Honest metrics.** The headline metric is a **Snore Index (SI)** —
   snore episodes per monitored hour. It is deliberately *not* called an AHI
   and the UI states the difference wherever SI is shown.

---

## 1. Problem statement

The user (primary persona, and the product's first customer) snores. They know
this socially — from a partner, or from waking unrefreshed — but they have no
data. Specifically they lack:

- **Objective measurement.** How often? How loud? All night, or in bursts?
  Getting worse or better?
- **Causal insight.** Which of their own controllable behaviours — alcohol,
  late meals, sleeping position, body weight, nasal congestion, bedtime —
  actually move the number for *them*, as opposed to what the internet says
  moves it for the average person.
- **A structured path to improvement.** Generic advice ("lose weight, sleep on
  your side") is unactionable without feedback. They need to run a change,
  measure it against their own baseline, and see whether it worked.
- **A safety net.** They do not know whether their snoring is benign or a
  marker of something that needs a doctor.

### Constraints that shape everything

- The only sensor is **the phone they already own**, placed on a bedside table.
- The recording runs for **6–9 hours, unattended, overnight, on battery**.
- The content captured is **audio from the user's bedroom while they and
  possibly a partner sleep** — among the most private data a product can touch.

---

## 2. Vision and goals

**Vision:** turn an invisible, embarrassing, second-hand complaint into a
measured personal signal the user can act on, without ever sending their
bedroom audio to a server.

### Goals

| # | Goal | Success measure |
|---|------|-----------------|
| G1 | Measure snoring objectively and repeatably | ≥ 6 h of usable monitoring from a single overnight run on a mid-range phone at ≥ 30 % starting battery |
| G2 | Make measurement trustworthy | Detection F1 ≥ 0.80 against the labelled fixture corpus; zero raw audio bytes leave the device |
| G3 | Produce insight, not just numbers | Every night's report names the single largest contributing factor from the user's own journal, or states that there isn't enough data yet |
| G4 | Drive measurable improvement | The user can run an A/B intervention trial and get a verdict with an explicit confidence statement |
| G5 | Keep the user safe | STOP-BANG screening at onboarding and every 90 days; red-flag escalation surfaced within one session of the triggering data |

### Non-goals (v1)

- Detecting apnoeas, hypopnoeas, or oxygen desaturation. **Out of scope, by design.**
- Distinguishing the user's snoring from a bed partner's. v1 measures "snoring in this room"; the limitation is stated in the UI.
- Sleep staging (REM/deep/light). A bedside microphone cannot do this credibly.
- Audio playback of recordings. See ADR-001 — no raw audio is retained.
- Native iOS/Android apps. v1 is an installable PWA.

---

## 3. Personas

**P1 — Mon, the self-tracker (primary).** 40s, technical, owns the problem,
partner-motivated. Wants real numbers and will act on them. Will tolerate a
setup step but not a nightly chore. Privacy-aware: would not install an app
that uploads bedroom audio.

**P2 — The bed partner (secondary, indirect).** Has the most complete evidence
and the most to gain. Not a user account in v1, but the product's reports must
be shareable as a summary they'd find credible.

**P3 — The GP / sleep clinician (tertiary, receiving).** Sees the user for
eight minutes. Needs a one-page, honest, clearly-labelled-as-non-clinical
summary plus the STOP-BANG score. Must not be handed something that looks like
a diagnostic report.

---

## 4. Domain-Driven Design — strategic design

### 4.1 Ubiquitous language

These terms mean exactly this, in conversation, in the UI, and in the code.
Where code and this table disagree, the code is wrong.

| Term | Definition |
|------|------------|
| **Night** | One user-initiated monitoring period, from Start to Stop. The unit of reporting. Crosses midnight; dated by the evening it began. |
| **Session** | The device-side execution of a Night: the live capture loop. A Night has exactly one Session. |
| **Frame** | One analysis window of audio, 2048 samples (~46 ms at 44.1 kHz). The atom of capture. Never persisted. |
| **Ambient Baseline** | The rolling median frame loudness of the quiet room, in relative dB. All thresholds are expressed *relative to* it. |
| **Loud Frame** | A Frame whose loudness exceeds Ambient Baseline by the Detection Threshold. |
| **Candidate** | A contiguous run of Loud Frames, after gap-merging. Not yet judged to be a snore. |
| **Snore Episode** | A Candidate that passes acoustic classification. One inhalation/exhalation snore event. The atom of *analysis*. |
| **Episode Intensity** | A Snore Episode's peak loudness above Ambient Baseline, in relative dB. Never an absolute SPL — the mic is uncalibrated. |
| **Intensity Band** | Quiet / Mild / Moderate / Loud — the banding of Episode Intensity. |
| **Snore Index (SI)** | Snore Episodes per hour of monitored time. **The headline metric. Not an AHI.** |
| **Snore Time Fraction (STF)** | Proportion of monitored time inside a Snore Episode. |
| **Quiet Period** | ≥ 10 min of monitored time with no Snore Episode. Reported descriptively only — it is **not** evidence of an apnoea. |
| **Journal Entry** | The user's self-reported context for one Night: alcohol, caffeine, meal timing, congestion, position, bedtime, weight. |
| **Factor** | One journalled variable that may influence snoring (e.g. `alcohol_units`). |
| **Intervention** | A change the user deliberately makes to a Factor (e.g. "no alcohol after 7pm"). |
| **Trial** | A time-boxed comparison of Nights with an Intervention active against the user's Baseline Window. |
| **Verdict** | A Trial's outcome: Improved / No Change / Worse / Inconclusive, always with a stated confidence. |
| **Baseline Window** | The user's reference distribution of SI: the most recent 14 Nights without an active Intervention. |
| **Risk Screen** | A completed STOP-BANG questionnaire and its resulting Risk Band. |
| **Risk Band** | Low / Intermediate / High OSA risk, per published STOP-BANG thresholds. |
| **Red Flag** | A condition obliging the product to recommend clinical consultation. |

**Banned words in code and UI:** *apnoea*, *AHI*, *diagnosis*, *severity of
disease*, *normal*, *abnormal* — except inside the Clinical Safeguarding
context, where they appear only in signposting copy.

### 4.2 Bounded contexts

Seven contexts. Core contexts are where the product's differentiation lives and
get the most design effort and test coverage.

| Context | Type | Responsibility |
|---------|------|----------------|
| **Sleep Capture** | Core | Owns the device-side Session: microphone lifecycle, framing, Ambient Baseline, wake-lock, Candidate extraction. Runs entirely on-device. |
| **Snore Analysis** | Core | Classifies Candidates into Snore Episodes; computes SI, STF, Intensity Bands and the per-Night analysis. Pure computation. |
| **Insight & Coaching** | Core | Correlates Nights with Journal Entries; proposes Interventions; runs Trials; issues Verdicts. |
| **Sleep Journal** | Supporting | Captures and validates the user's self-reported Factors per Night. |
| **Clinical Safeguarding** | Supporting (safety-critical) | STOP-BANG Risk Screens, Risk Bands, Red Flag rules, escalation copy, clinician export. |
| **Reporting** | Supporting | Trends, shareable summaries, clinician one-pager. Read-only projections. |
| **Identity & Consent** | Generic | Authentication, explicit consent capture, retention policy, export and erasure. |

### 4.3 Context map

```
                      ┌───────────────────────┐
                      │  Identity & Consent   │  (Generic)
                      └───────────┬───────────┘
                                  │ Conformist: every context
                                  │ takes UserId from here
        ┌─────────────────────────┼──────────────────────────┐
        │                         │                          │
┌───────▼────────┐  Candidate[]  ┌▼──────────────┐  Analysis ┌▼──────────────┐
│ Sleep Capture  ├──────────────►│Snore Analysis ├──────────►│   Reporting   │
│    (Core)      │   published   │    (Core)     │ published │  (Supporting) │
│   on-device    │   language    │  pure funcs   │  language │               │
└────────────────┘               └───────┬───────┘           └───────▲───────┘
                                         │ NightAnalysed             │
                                         │                           │
                      ┌──────────────────▼────────────┐              │
┌──────────────┐     │     Insight & Coaching         │              │
│Sleep Journal ├────►│           (Core)               ├──────────────┘
│(Supporting)  │ ACL └──────────────┬─────────────────┘
└──────────────┘                    │ RedFlagRaised
                                    │
                      ┌─────────────▼──────────────────┐
                      │   Clinical Safeguarding        │
                      │   (Supporting, safety-critical)│
                      └────────────────────────────────┘
```

**Relationship patterns:**

- *Sleep Capture → Snore Analysis*: **Published Language.** The contract is a
  serialisable `CandidateBatch`. Capture knows nothing about SI; Analysis knows
  nothing about microphones. This seam is what makes the detector testable
  without a browser and the capture layer testable without a classifier.
- *Snore Analysis → Reporting*: **Published Language**, one-way. Reporting
  holds read models only and can never write back.
- *Sleep Journal → Insight & Coaching*: **Anti-Corruption Layer.** The journal
  stores what the user typed ("2 glasses of wine"); Insight needs normalised
  `Factor` values (`alcohol_units: 4.0`). The ACL owns that translation so
  journal UX can change without touching the correlation engine.
- *Insight & Coaching → Clinical Safeguarding*: **Customer/Supplier.** Insight
  is the customer; Safeguarding's Red Flag rules are upstream and Insight must
  suppress any coaching message that contradicts an active Red Flag.
- *Identity & Consent → all*: **Conformist.** Everyone accepts Firebase's
  identity model rather than wrapping it.

### 4.4 Tactical design — aggregates and invariants

#### Sleep Capture

**Aggregate root: `Session`** (device-local, transient)
- Entities: none persisted. Frames are processed and discarded.
- Value objects: `FrameLoudness`, `AmbientBaseline`, `DetectionThreshold`, `Candidate`.
- **Invariants:**
  - I-C1 A Session cannot produce Candidates until the Ambient Baseline has calibrated over ≥ 60 s of audio.
  - I-C2 A Candidate has `endMs > startMs` and duration ≤ 6000 ms (longer runs are split).
  - I-C3 Candidates within one Session never overlap, and are emitted in ascending time order.
  - I-C4 No Frame's sample data outlives the function that computed its features.
- **Domain events:** `SessionStarted`, `BaselineCalibrated`, `CandidateDetected`, `SessionStopped`, `SessionInterrupted`.

#### Snore Analysis

**Aggregate root: `NightAnalysis`**
- Entities: `SnoreEpisode` (identity: `nightId` + `startMs`).
- Value objects: `SnoreIndex`, `SnoreTimeFraction`, `EpisodeIntensity`, `IntensityBand`, `MonitoredDuration`, `QuietPeriod`.
- **Invariants:**
  - I-A1 `SnoreIndex = episodes.length / monitoredHours`, and is undefined (not zero) when `monitoredHours < 1`.
  - I-A2 `0 ≤ SnoreTimeFraction ≤ 1`.
  - I-A3 Every `SnoreEpisode` lies wholly within the Night's monitored window.
  - I-A4 A `NightAnalysis` is immutable once created. Re-analysis creates a new version with a new `analyserVersion`; results are never silently mutated under the user.
  - I-A5 `EpisodeIntensity` is always relative-dB-above-baseline and is never rendered with an absolute SPL unit.
- **Domain events:** `NightAnalysed`, `AnalysisRejected` (insufficient data).

#### Sleep Journal

**Aggregate root: `JournalEntry`** (identity: `userId` + `nightDate`)
- **Invariants:**
  - I-J1 At most one JournalEntry per user per night date.
  - I-J2 All Factor values validate against declared range (e.g. `alcohol_units ∈ [0, 30]`).
  - I-J3 An unanswered Factor is `unknown`, never `0`. Silence is not a zero — this materially changes the correlation maths.
- **Domain events:** `JournalEntryRecorded`, `JournalEntryAmended`.

#### Insight & Coaching

**Aggregate root: `Trial`**
- Entities: `Intervention`.
- Value objects: `BaselineWindow`, `Verdict`, `EffectSize`, `Confidence`.
- **Invariants:**
  - I-I1 A Trial needs ≥ 5 Nights in its Baseline Window and ≥ 5 intervention Nights before a Verdict other than `Inconclusive` may be issued.
  - I-I2 At most one active Trial per user. Concurrent interventions are unattributable.
  - I-I3 A Verdict always carries an explicit `Confidence`; a Verdict without one is unrepresentable in the type system.
  - I-I4 A Trial cannot include a Night whose analysis was rejected.
- **Domain events:** `TrialStarted`, `TrialConcluded`, `RecommendationIssued`.

#### Clinical Safeguarding

**Aggregate root: `RiskAssessment`**
- Value objects: `StopBangAnswers`, `StopBangScore`, `RiskBand`, `RedFlag`.
- **Invariants:**
  - I-S1 A `StopBangScore` is only computed from a complete answer set — partial screens yield no band.
  - I-S2 Risk bands follow published thresholds: 0–2 Low, 3–4 Intermediate, ≥ 5 High.
  - I-S3 A raised Red Flag stays visible until the user explicitly acknowledges it. It cannot be dismissed by a UI state change alone.
  - I-S4 No Safeguarding output ever asserts presence or absence of a disease.
- **Red Flag rules (v1):**
  - RF-1 StopBangScore ≥ 5 (High risk band).
  - RF-2 Reported witnessed breathing pauses (STOP-BANG "Observed" = yes), *at any score*.
  - RF-3 Sustained loud snoring: `IntensityBand = Loud` for ≥ 30 % of episodes across ≥ 7 of the last 14 Nights.
  - RF-4 Reported daytime sleepiness while driving — immediate escalation copy, independent of all other data.
- **Domain events:** `RiskScreenCompleted`, `RedFlagRaised`, `RedFlagAcknowledged`.

### 4.5 Cross-context domain event flow

```
SessionStarted → BaselineCalibrated → CandidateDetected* → SessionStopped
                                                                │
                                                                ▼
                                                    (device) classify Candidates
                                                                │
                                                                ▼
                                                          NightAnalysed
                                              ┌─────────────────┼─────────────────┐
                                              ▼                 ▼                 ▼
                                     update BaselineWindow  RF-3 evaluation   Reporting
                                              │                 │              projection
                                              ▼                 ▼
                                      TrialConcluded?      RedFlagRaised?
```

---

## 5. Functional requirements

### 5.1 Sleep Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-C1 | The user starts a Night with a single tap from the home screen. | Must |
| FR-C2 | The app requests microphone permission with a plain-English explanation of on-device-only processing before the browser prompt. | Must |
| FR-C3 | Capture runs with a Screen Wake Lock; if the lock is refused or lost, the user is warned that monitoring may stop. | Must |
| FR-C4 | The app calibrates an Ambient Baseline over the first 60 s and shows calibration progress. | Must |
| FR-C5 | The app displays a live, low-brightness monitoring screen: elapsed time, episode count, current loudness relative to baseline. | Must |
| FR-C6 | Candidates are buffered to IndexedDB continuously, so a crash or battery death loses at most 60 s of a Night. | Must |
| FR-C7 | The user stops a Night with a deliberate two-step action (prevents accidental 3am stops). | Must |
| FR-C8 | If capture is interrupted (tab killed, OS suspend), the Night is recoverable on next launch and marked `interrupted`. | Should |
| FR-C9 | The app warns before starting if battery < 30 % and not charging. | Should |

### 5.2 Snore Analysis

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A1 | On Stop, Candidates are classified into Snore Episodes on-device. | Must |
| FR-A2 | The app computes SI, STF, episode count, peak and median Intensity, and Intensity Band distribution. | Must |
| FR-A3 | Nights with < 1 h monitored time are marked `insufficient` and excluded from trends and Baseline Windows. | Must |
| FR-A4 | Every analysis records the `analyserVersion` that produced it. | Must |
| FR-A5 | A Night's timeline is shown as an episode density chart across the night. | Should |
| FR-A6 | Quiet Periods are listed descriptively, with explicit copy that they are not apnoea evidence. | Should |

### 5.3 Sleep Journal

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-J1 | On Stop, the user is prompted for a Journal Entry; it is skippable and completable later. | Must |
| FR-J2 | v1 Factors: alcohol units, last-drink time, caffeine after 2pm, last-meal time, nasal congestion (0–3), intended sleep position, bedtime, weight (optional, weekly). | Must |
| FR-J3 | Unanswered Factors record as `unknown`, visibly distinct from zero. | Must |
| FR-J4 | Entries are amendable for 48 h. | Should |

### 5.4 Insight & Coaching

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-I1 | After ≥ 7 analysed Nights, the app reports each Factor's association with SI, ranked by effect size. | Must |
| FR-I2 | Every association is labelled **association, not causation**, with the n it is based on. | Must |
| FR-I3 | The app proposes one Intervention at a time, targeting the largest modifiable Factor. | Must |
| FR-I4 | The user can start a Trial; the app defines the Baseline Window and required duration up front. | Must |
| FR-I5 | On completion the app issues a Verdict with effect size and Confidence, and refuses to over-claim on small n. | Must |
| FR-I6 | Coaching content is suppressed or reframed when a Red Flag is active — improvement advice never substitutes for the escalation message. | Must |

### 5.5 Clinical Safeguarding

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-S1 | STOP-BANG is completed during onboarding, before the first Night. | Must |
| FR-S2 | Risk Band and score are shown with an explanation of what STOP-BANG is and is not. | Must |
| FR-S3 | Any Red Flag produces a persistent, acknowledgeable banner recommending clinical consultation. | Must |
| FR-S4 | The app re-prompts for a Risk Screen every 90 days. | Should |
| FR-S5 | The clinician one-pager includes SI trend, STOP-BANG score, method description, and an explicit non-diagnostic disclaimer. | Should |

### 5.6 Identity & Consent

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-D1 | Sign-in via Google (Firebase Authentication). | Must |
| FR-D2 | Consent is captured explicitly, itemised (processing, storage, retention), and versioned; the consent version is stored per user. | Must |
| FR-D3 | The user can export all their data as JSON. | Must |
| FR-D4 | The user can delete their account and all derived data; deletion completes within 30 days and is confirmed. | Must |
| FR-D5 | The app states, at consent time and in settings, that raw audio never leaves the device and is never written to disk. | Must |

---

## 6. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | **Privacy** — raw audio never transmitted, never persisted. | Zero audio bytes in any network payload or storage. Enforced by test. |
| NFR-2 | **Battery** — overnight capture cost. | ≤ 35 % of a mid-range phone battery over 8 h, screen dimmed. |
| NFR-3 | **CPU** — real-time analysis headroom. | Per-frame processing < 5 ms; no dropped frames at 44.1 kHz / 2048-sample hop. |
| NFR-4 | **Detection quality** — against labelled fixture corpus. | Precision ≥ 0.85, Recall ≥ 0.75, F1 ≥ 0.80. |
| NFR-5 | **Availability** — API. | 99.5 % monthly. Capture must work fully offline regardless. |
| NFR-6 | **Latency** — API reads. | p95 < 400 ms. |
| NFR-7 | **Cost** — infrastructure at single-user scale. | < £5/month; scale-to-zero when idle. |
| NFR-8 | **Accessibility** | WCAG 2.2 AA; night screen usable at minimum brightness; all charts have text equivalents. |
| NFR-9 | **Data residency** | europe-west2 (London). |
| NFR-10 | **Retention** | Episode metadata 24 months; aggregates indefinite; both user-erasable on demand. |

---

## 7. Metrics model (definitions that the code must match)

```
monitoredMs      = sessionStopMs - sessionStartMs - interruptedMs
monitoredHours   = monitoredMs / 3_600_000

SnoreIndex (SI)  = episodeCount / monitoredHours          (requires monitoredHours ≥ 1)
SnoreTimeFraction= Σ episode.durationMs / monitoredMs

EpisodeIntensity = peakFrameDb - ambientBaselineDb        (relative dB, ≥ 0)

IntensityBand:
   Quiet     : 0  ≤ intensity <  5 dB
   Mild      : 5  ≤ intensity < 10 dB
   Moderate  : 10 ≤ intensity < 20 dB
   Loud      : intensity ≥ 20 dB

QuietPeriod      = a gap ≥ 600_000 ms between consecutive episodes
```

**SI interpretation bands** (product framing only, explicitly non-clinical):

| SI | Label | Copy |
|----|-------|------|
| < 5 | Minimal | "Very little snoring detected this night." |
| 5–14 | Light | "Some snoring, mostly quiet." |
| 15–29 | Moderate | "Regular snoring through the night." |
| ≥ 30 | Heavy | "Frequent snoring. Worth discussing with a clinician." |

---

## 8. Detection algorithm specification

Deliberately a **transparent, deterministic signal-processing pipeline**, not a
neural network. Rationale in ADR-002.

**Stage 1 — Framing.** 2048-sample frames, 50 % overlap, Hann window, 44.1 kHz.

**Stage 2 — Ambient Baseline.** Rolling median of frame RMS-dB over a 60 s
window, updated every 5 s, and only from frames not currently inside a
Candidate (otherwise loud snoring drags the baseline up and hides itself).

**Stage 3 — Loud frame detection.** `frameDb > baselineDb + threshold`, with
`threshold` defaulting to 8 dB, user-adjustable in Settings (Sensitive 6 /
Normal 8 / Strict 12).

**Stage 4 — Candidate extraction.** Group contiguous Loud Frames. Merge runs
separated by < 200 ms. Discard runs < 300 ms. Split runs > 6000 ms at their
quietest interior frame.

**Stage 5 — Acoustic classification.** A Candidate becomes a Snore Episode
only if all hold:
- `lowBandRatio ≥ 0.55` — proportion of spectral energy in 30–300 Hz. Snoring
  is soft-tissue vibration: low-frequency and harmonically rich. Speech,
  rustling fabric and traffic sit higher.
- `0.3 s ≤ duration ≤ 6.0 s` — the envelope of one respiratory event.
- `spectralFlatness ≤ 0.4` — snoring is tonal/harmonic, not noise-like. Rejects
  fan hum, rain, white-noise machines.
- `periodicityScore ≥ 0.5` — the gap to neighbouring episodes is consistent
  with a 2–8 s respiratory cycle. Isolated one-off bangs (door, cough) fail.

**Stage 6 — Aggregation.** Episodes → `NightAnalysis` per §7.

**Known limitations, stated in-product:** cannot attribute episodes to a
specific person; a very noisy room raises the baseline and reduces sensitivity;
phone mics are uncalibrated so all loudness is relative; heavy mouth-breathing
and some speech can produce false positives.

---

## 9. Release plan

**M1 — Walking skeleton.** Auth, consent, start/stop a Night, on-device capture
producing Candidates, results persisted, deployed to Cloud Run. Proves the
riskiest seam (browser audio overnight) end-to-end.

**M2 — Measure.** Full classifier, NightAnalysis, night detail view, trend
chart, STOP-BANG + Red Flags. *This alone satisfies G1, G2 and G5.*

**M3 — Understand.** Journal, factor correlation, ranked associations.

**M4 — Improve.** Interventions, Trials, Verdicts, clinician export.

---

## 10. Acceptance criteria for v1

1. A Night can be started, run ≥ 6 h unattended on a phone, and stopped, producing a NightAnalysis.
2. Network capture during a full Night shows **zero audio payloads**.
3. Detection meets NFR-4 on the labelled fixture corpus, verified in CI.
4. STOP-BANG completes at onboarding; a High band raises a persistent Red Flag.
5. Every screen showing SI also shows the "not an AHI / not a diagnosis" framing.
6. Export produces complete JSON; delete removes all user data and is confirmed.
7. The deployed service runs on Cloud Run in europe-west2 and scales to zero.

---

## 11. Open questions

| # | Question | Owner | Resolution path |
|---|----------|-------|-----------------|
| Q1 | Does an 8 h WebAudio capture survive iOS Safari backgrounding? | Eng | M1 spike on real hardware; fallback is "screen on, charging, face down" |
| Q2 | Is the fixture corpus large enough to trust NFR-4? | Eng | Start with synthesised + open-licensed clips; grow with user-donated labelled nights (opt-in, on-device labels only) |
| Q3 | Should the bed partner get a read-only view? | Product | Defer to v2; needs its own consent model |
| Q4 | Minimum Trial length — 5 nights is a compromise. Revisit with real variance data. | Eng | Recompute required n from the user's own SI variance once ≥ 14 nights exist |
