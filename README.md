# Somnus

Phone-based snore monitoring, assessment and coaching. Put your phone on the
bedside table; it measures your snoring, shows you what moves the number, and
tells you when it thinks a doctor is the better answer.

**Your audio never leaves your phone.**

---

## What this is, and what it isn't

Somnus is a **wellness and self-tracking tool. It is not a medical device, it
does not diagnose, and it never claims to.**

Loud habitual snoring is a recognised symptom of **obstructive sleep apnoea**,
which carries real cardiovascular and road-safety consequences and needs
clinical diagnosis. A phone microphone on a bedside table cannot measure
airflow, blood oxygen or respiratory effort, so it **cannot detect apnoeas and
cannot compute an AHI**.

So the product does two things about that, and both are enforced in code rather
than in footer text:

- It screens for OSA *risk* with the validated **STOP-BANG** questionnaire and
  signposts to a clinician above threshold. It never says you have sleep
  apnoea, and never says you don't.
- Its headline metric is the **Snore Index** — snore episodes per monitored
  hour. Deliberately not an AHI, and the component that renders it carries the
  distinction with it, so no screen can show the number without the framing.

## How it works

```
 microphone ──► AudioWorklet ──► FrameFeatures ──► Session ──► Candidate
              (samples live     (4 scalars,      (ambient      (a possible
               only here)        no audio)        baseline)     snore)
                                                                    │
                                     NightAnalysis ◄── classifier ◄─┘
                                     (Snore Index)    (4 predicates)
```

Every stage after the worklet is a pure function of its inputs, which is why
an eight-hour overnight behaviour is testable in milliseconds.

**Detection** (PRD §8) is a deterministic DSP pipeline, not a neural network —
chosen so the app can answer *"why wasn't that a snore?"*. A candidate becomes
an episode only if all four hold: low-band (30–300 Hz) energy share ≥ 0.55,
duration 0.3–6 s, spectral flatness ≤ 0.4, and spacing consistent with a
breathing cycle. Those reject, in order: speech, blips and sustained noise, fan
hum and rain, and isolated bangs.

## Documents

| | |
|---|---|
| [PRD](docs/PRD-SnoreDetection.md) | Domain-Driven Design: 7 bounded contexts, ubiquitous language, context map, aggregates, invariants |
| [ADRs](docs/adr/README.md) | 10 architecture decisions with alternatives and consequences |
| [TDD plan](docs/TDD-PLAN.md) | London-school outside-in approach, and the tests that changed the code |
| [Deployment](docs/DEPLOYMENT.md) | Cloud Run, Firestore, and the access caveat |

## Layout

```
packages/domain/   Pure domain core. No I/O, no framework, no platform globals.
                   Shared by the PWA and the API so a metric cannot mean two
                   things. 142 tests, ~3.5 s, zero dependencies.
backend/           Express API + Firestore adapters. Every collaborator is
                   injected, so the surface is driven outside-in with fakes.
frontend/          Installable PWA. The audio worklet is the only place in the
                   system where samples exist.
```

Architecture is hexagonal ([ADR-004](docs/adr/ADR-004-hexagonal-domain-package.md)):
adapters depend on ports, ports are depended on by the domain, and the domain
depends on nothing. A test asserts that, so it stays true.

## Running it

```bash
npm install
npx tsc -b backend/tsconfig.json          # domain is a project reference
npm test                                   # domain + backend suites

npm run dev  --workspace @somnus/frontend  # PWA on :5173
npm run dev  --workspace @somnus/backend   # API on :8080
```

The Firestore contract tests run when `FIRESTORE_EMULATOR_HOST` is set, and
skip otherwise, so you don't need an emulator installed to work on the domain.

### On a phone

Capture needs a secure context, so use the deployed URL rather than a LAN IP.
Add to Home Screen, keep it foregrounded, screen dimmed, plugged in. Screen
Wake Lock is requested and a warning is shown if the device refuses it —
iOS Safari backgrounding is the PWA's known weak point
([ADR-003](docs/adr/ADR-003-pwa-not-native.md), PRD Q1).

## Privacy, concretely

Raw audio exists in exactly one place: a 2048-sample window inside the
AudioWorklet, which is reduced to four numbers and overwritten by the next
window. Nothing copies, posts or stores it. This is enforced three ways
([ADR-001](docs/adr/ADR-001-on-device-audio-processing.md)):

1. `AudioPort`'s signature has no type through which audio could reach the domain
2. `privacy.test.ts` deep-scans payloads for buffers, long numeric arrays and
   audio-sounding field names — including a test that deliberately breaks the
   rule, so the check can't pass vacuously
3. CI runs both on every push

A full eight-hour night serialises to a few tens of kilobytes. Audio would be
tens of megabytes.

## Status

M1 and M2 are built and deployed: capture, detection, analysis, STOP-BANG,
Red Flags, journal, associations, trials and coaching suppression. M3 and M4
screens are partly in place. See the
[epic](https://github.com/mondweep/vibe-cast/issues/65) for the backlog.

## Licence

MIT.
