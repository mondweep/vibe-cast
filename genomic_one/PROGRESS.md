# PROGRESS — genomic_one

> Cross-agent sync file. If you're picking up work, read this first.

## Active branch
- Repo: https://github.com/mondweep/vibe-cast
- Working branch: `dna-input-pipeline` (forked from `genomics-exploration`)
- Project subdirectory: `genomic_one/` — the GitHub repo wraps this. Tree paths are `genomic_one/frontend/...`, `genomic_one/src/...`. The git root is one level above `genomic_one/` on disk.

## Live deployments
- Frontend (production): https://genomics-one.vercel.app — Vercel project `genomics-one` under team `mondweeps-projects` (deploys `genomics-exploration`).
- Backend (production): https://genomic-one-api.onrender.com — does NOT yet have `/api/analyze`.
- Frontend (this branch): https://genomic-one-dna-review.vercel.app — Vercel project `genomic-one-dna-review` (id `prj_4TmenjnDXq67gwqMoYVaTVtwujqC`) under team `mondweeps-projects`, deploys `dna-input-pipeline`, `NEXT_PUBLIC_API_URL` set to the new Render service.
- Backend (this branch): https://genomic-one-api-dna.onrender.com — Render service `genomic-one-api-dna` (id `srv-d7mvrba8qa3s739uoek0`), Frankfurt, free tier, Rust, deploys `dna-input-pipeline`.
- Plan: separate Vercel project + separate Render service per phase. The pair above is the active phase environment.

## Current phase
Adding user-supplied DNA analysis. Practitioner uploads FASTA → backend runs the full pipeline → frontend renders results.

### Done on this branch
- Backend: `src/analyze.rs` with FASTA parser, validation, and a 6-stage pipeline runner (stats, best-gene Smith-Waterman, k-mer similarity, alignment-based variant diff, frame-0 protein translation, conditional CYP2D6 pharma).
- `POST /api/analyze` registered on the Axum router (text/plain body, 100 KB max, 50–50000 bp, ACGTN alphabet, structured JSON errors).
- Frontend `/upload` page with drag-drop, paste textarea, "Load HBB" / "Load HbS" sample buttons, results panel.
- `analyzeSequence()` in `frontend/src/lib/api.ts` (45 s timeout for Render cold start).
- "Analyze DNA" item added to the sidebar nav.
- Local smoke-tested: HBB reference matches HBB cleanly; HbS sample produces a position-19 A→T variant and `MVHLTPV…` protein change.

### Next
- New Render service deploying `dna-input-pipeline` so `/api/analyze` is reachable from the new Vercel preview.
- New Vercel project for this branch with `NEXT_PUBLIC_API_URL` pointing at the new Render service.
- End-to-end smoke test via the upload page.

## Gotchas (will bite again if forgotten)
1. **Global `~/.gitignore` line 79 has `lib/`** (Python wheel artefact rule) — silently excludes any `lib/` source folder. Already had to `git add -f frontend/src/lib/` once. Watch for any new `lib/`-named source dir.
2. **Vercel Root Directory must be `genomic_one/frontend`** (not just `frontend`). The repo root contains `genomic_one/` as a subdirectory.
3. **`output: 'export'` + Vercel strips `.html`** on static deployments. References like `<iframe src="/foo.html" />` 404. Use `/foo` (extension-less) instead.
4. **Render free tier cold start is ~13–15 s.** Anything below ~30 s timeout will fall back to static data on the first hit after idle. `analyzeSequence()` uses 45 s.
5. **Vercel preview deployments are 401-protected** (Deployment Protection). Only the production alias is public unless you turn that off.
6. **rvdna's `Result<T>` alias** (`pub type Result<T> = std::result::Result<T, DnaError>`) shadows the stdlib `Result<T, E>`. When you bring in `rvdna::prelude::*`, two-arg `Result` declarations need fully-qualified `std::result::Result<T, E>`.

## Decisions made (don't relitigate)
- **Single combined `/api/analyze` endpoint** (vs splitting per stage). Pipeline stages depend on each other; N round trips × Render cold start would be unusable.
- **Sequence cap: 50 kbp / 100 KB body.** Covers all panel genes; keeps Render free-tier RAM and SW timing comfortable.
- **Strict alphabet `A C G T N` only.** Matches reference genomes and synthetic test data; ambiguity codes (R/Y/S/W/etc.) require non-trivial handling and aren't worth it now.
- **Variant detection = alignment-based diff** (not pileup). Real pileup needs multiple reads; users upload a single sequence. We walk the aligned region and report mismatches with the relevant ref/alt. Honest limitation noted in the response.

## Frameworks evaluated, discarded
- **bhil** (`.claude/commands/bhil.md`) — spec-first slash command. Its own time budget allocates 10 % to implementation. Useful only for upfront thinking; doesn't write code.
- **forge** (`SKILL.md`) — 8-agent "Build/Verify/Heal" swarm with 7 blocking quality gates. Designed for fixing failing tests in existing codebases. Overkill for greenfield feature work.
- Going native Claude Code with a tight upfront spec instead. No meta-framework.

## MCP servers (local)
- `vercel` — OAuth-authenticated. Read-only on most things; cannot create projects or update settings; can read deployments/projects/build logs and list teams.
- `render` — API key auth (from `~/Documents/Claude/Projects/Genomics-Exploration/.env`, var `RENDER_API_KEY`). Newly added in this session; tools may need a Claude Code restart to register.

## Security note
- The Render API key was echoed to stdout when `claude mcp add` confirmed its headers — meaning it's in this session's chat transcript. **Rotate it** in the Render dashboard once this work session ends.
- Vercel Deploy Hook URLs pasted into chat earlier belonged to the old project that has since been deleted, so those URLs are invalid.

## How to run locally
```bash
# Backend (Axum :8080)
cargo run --features server -- --serve

# Frontend (Next.js :3005)
cd frontend && npm run dev

# Smoke test the new endpoint
curl -X POST -H 'Content-Type: text/plain' \
  --data 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTC' \
  http://localhost:8080/api/analyze
```
