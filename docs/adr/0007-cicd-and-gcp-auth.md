# 0007 — GitHub Actions deploying via Workload Identity Federation

**Status:** Accepted · **Date:** 2026-09-05

## Context

Deploys must be reproducible and must not depend on a developer's laptop or on
an ephemeral agent container. This repository is public and shared with unrelated
projects, and it already runs repo-wide secret scanning — so a long-lived service
account key in repository secrets is exactly the artefact we should not create.

## Decision

GitHub Actions deploys to Firebase Hosting, authenticating by **Workload Identity
Federation**: GitHub's OIDC token is exchanged for short-lived Google credentials
scoped to a deploy service account. No service account JSON key exists anywhere.

Pipeline, on every push to the project branch:

1. Install, typecheck, lint.
2. Unit and integration tests, including Firestore rules against the emulator.
3. Validate the lesson graph — schema, citations, acyclicity (ADR 0004).
4. Build.
5. Pull request → deploy to a Hosting **preview channel**, URL posted on the PR.
   Project branch → deploy to **live**.

Interactive `gcloud auth login` is used only for one-time human-in-the-loop
project setup, never by the pipeline.

## Alternatives considered

- **Service account JSON key in GitHub secrets.** The common approach and much
  quicker to set up. Rejected: a long-lived credential for a cloud project, held
  in a public repository's settings, with no natural expiry.
- **Deploying from a developer machine or an agent container.** Not reproducible,
  and the container here is ephemeral — its credentials vanish with it, so the
  deploy could not be repeated.
- **Cloud Build triggers.** Keeps everything inside GCP, but splits CI across two
  systems when the tests already run in Actions.

## Consequences

- One-time setup cost: a workload identity pool, a provider bound to this
  repository, and a deploy service account with least-privilege Hosting roles.
- The pool's attribute condition must pin the repository, otherwise any GitHub
  repository could mint tokens for the project. This is the security-critical
  line in the configuration and is called out in the setup docs.
- Preview channels give every pull request a real URL, which matters
  disproportionately for scrollytelling — this work cannot be reviewed from a diff.
