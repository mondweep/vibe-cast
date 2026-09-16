# Architecture Decision Records — Somnus

Each ADR follows: Context → Decision → Alternatives → Consequences → Validation.
Status values: Proposed / Accepted / Superseded / Rejected.

| ADR | Title | Status | Drives |
|-----|-------|--------|--------|
| [001](ADR-001-on-device-audio-processing.md) | All audio processing happens on-device | Accepted | NFR-1, FR-D5 |
| [002](ADR-002-deterministic-dsp-not-ml.md) | Deterministic DSP classifier, not a neural network | Accepted | NFR-3, NFR-4 |
| [003](ADR-003-pwa-not-native.md) | Installable PWA rather than native apps | Accepted | Delivery, cost |
| [004](ADR-004-hexagonal-domain-package.md) | Hexagonal architecture with a platform-free domain package | Accepted | Testability, London-school TDD |
| [005](ADR-005-cloud-run-firestore.md) | Cloud Run + Firestore in europe-west2 | Accepted | NFR-5/7/9 |
| [006](ADR-006-firebase-auth.md) | Firebase Authentication with Google sign-in | Accepted | FR-D1 |
| [007](ADR-007-offline-first-sync.md) | Offline-first capture with IndexedDB and idempotent sync | Accepted | FR-C6, NFR-5 |
| [008](ADR-008-london-school-tdd.md) | London-school (mockist) TDD, outside-in | Accepted | Whole build |
| [009](ADR-009-versioned-immutable-analysis.md) | Analyses are immutable and version-stamped | Accepted | I-A4, FR-A4 |
| [010](ADR-010-safeguarding-as-bounded-context.md) | Safeguarding is a first-class bounded context, not UI copy | Accepted | FR-S*, G5 |
