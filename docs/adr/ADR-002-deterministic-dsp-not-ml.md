# ADR-002: Deterministic DSP classifier, not a neural network

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** NFR-3, NFR-4, G2

## Context

ADR-001 puts the classifier on the phone, running in real time for eight hours
on battery. We must choose how it decides whether a burst of sound is a snore.

The obvious modern answer is a small CNN over mel-spectrograms — that is what
the published literature uses and it would likely beat hand-tuned features on
a benchmark. But this product's first job is to be *believed*. A user who is
told "you snored 214 times" and doubts it has no recourse if the answer came
from an opaque model.

## Decision

**Use a transparent, deterministic signal-processing pipeline** — RMS envelope
against a rolling ambient baseline, then a four-predicate classifier over
low-band energy ratio, duration, spectral flatness and periodicity, as
specified in PRD §8.

Every threshold is a named constant with a documented rationale, and every
rejection reason is recorded, so the app can answer "why wasn't that a snore?".

## Alternatives considered

1. **Small CNN on mel-spectrograms (TensorFlow.js / ONNX Runtime Web).** Higher
   ceiling on accuracy, handles acoustic variety we'd never hand-tune for.
   Rejected for v1: we have no labelled corpus to train on (and ADR-001 means
   we can't easily build one); a 2–5 MB model is a heavy PWA download; WASM/WebGL
   inference every 46 ms is a real battery risk against NFR-2; and it is
   unexplainable exactly where explanation matters most.
2. **Energy threshold alone.** What most "snore tracker" apps actually do.
   Rejected: it cannot distinguish snoring from a passing lorry, a partner
   talking, or a fan. It would produce numbers, and they would be wrong, which
   is worse than producing none.
3. **Hybrid: DSP gate feeding a small model on candidates only.** Cheap, because
   the model runs on ~1 % of frames. This is the right v2 architecture and the
   DSP stage we build now is exactly the gate it needs. Deferred, not rejected.

## Consequences

**Positive**
- Every stage is a pure function of its inputs — directly unit-testable, which
  is what makes the London-school approach in ADR-008 work for the core domain.
- Zero model download; the classifier is a few kilobytes of TypeScript.
- Per-frame cost is dominated by one FFT — comfortably inside NFR-3's 5 ms.
- Fully explainable: the UI can state why a candidate was rejected.
- Thresholds are user-adjustable (Sensitive/Normal/Strict) without retraining.

**Negative**
- Accuracy ceiling is lower than a trained model's. NFR-4 targets (P ≥ 0.85,
  R ≥ 0.75) are set to what this approach can honestly reach, not to what a
  CNN could.
- Thresholds were chosen from literature and synthesised fixtures, and will need
  revision against real-world data.
- Unusual snoring phenotypes (very high-pitched, whistling) may fall outside the
  30–300 Hz low-band assumption and be systematically missed.

## Validation

- Fixture corpus in `packages/domain/tests/fixtures`, scored in CI against NFR-4.
- Each predicate has its own test proving it rejects a specific named confounder
  (traffic, speech, fan hum, a single door slam).
