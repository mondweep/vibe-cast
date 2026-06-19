# ADR-0002: Host the app on GCP Cloud Run with keyless GitHub Actions CI/CD

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Lead agent (Opus), security-architect, project owner
- **Tags:** infrastructure, deployment, security, ci-cd

## Context

The brief requires the app to be hosted on **GCP Cloud Run** with **GitHub
Actions** for CI. NE India Pulse is a stateless web app that periodically pulls
from the GDELT DOC 2.0 API and serves an aggregated read model — a good fit for
a scale-to-zero container runtime. The owner can authenticate to GCP as
`mondweep@gmail.com`.

## Decision

We will deploy the app as a **container on Google Cloud Run**, built and shipped
by **GitHub Actions**:

1. CI workflow: lint, typecheck, unit tests (London-School), build image.
2. CD workflow (on `main`/release): push image to **Artifact Registry**, deploy
   to Cloud Run.
3. **Authentication: Workload Identity Federation (WIF)** — GitHub's OIDC token
   is exchanged for short-lived GCP credentials via
   `google-github-actions/auth`. **No service-account JSON keys are exported or
   stored in the repo.** A dedicated least-privilege deployer service account is
   used.

## Alternatives considered

- **Exported SA JSON key in GitHub secret** — simplest, but a long-lived
  credential and a standing secret-leak risk. Rejected on security grounds.
- **`gcloud auth login` device flow from CI** — not viable: the CI container is
  ephemeral, headless and has no browser; device auth requires interactive human
  consent and produces user (not workload) credentials. Use only for local dev.
- **Other runtimes (GKE, App Engine, Cloud Functions)** — heavier or less
  flexible than Cloud Run for a single containerised web service.

## Consequences

- **One-time human setup is required, out-of-band, by the owner** (signed in as
  `mondweep@gmail.com`): create/choose a GCP project, enable Cloud Run +
  Artifact Registry + IAM Credentials APIs, create the WIF pool/provider bound
  to this GitHub repo, and create the deployer service account with
  `run.admin` + `artifactregistry.writer` + `iam.serviceAccountUser` (least
  privilege). This **cannot be done from inside this ephemeral CI container**
  (no `gcloud`, no browser for device auth).
- Once WIF is configured, deploys are keyless and auditable.
- App must be stateless (Cloud Run scales to zero); caching/state goes to a
  managed store decided in a later ADR.
- Region, project ID and SA email become CI variables (non-secret) / repo
  variables; no secrets needed for auth.
