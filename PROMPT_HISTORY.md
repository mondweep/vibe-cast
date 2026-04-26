# Genomic One — Session Prompt History

This document captures the key user requests and technical solutions executed during the stabilization and mastery phase of the Genomics Exploration project.

## 1. Domain Exploration & Mastery
- **The "Why" of Genomics**: Detailed explanations for DNA concepts including:
    - **Alleles & Phenotypes**: The blueprint vs. the trait.
    - **INS Locus**: Linkage to Type 2 Diabetes risk.
    - **CpG Sites**: The epigenetic aging clock.
    - **CYP2D6**: Pharmacogenomic drug metabolism.
- **Mastery Dashboards**: Request to build two self-documenting layers:
    - `Scientific Fundamentals (V1)`: Biological education.
    - `Standalone Mastery (V2)`: Architectural transparency.

## 2. Infrastructure & Repository Hygiene
- **The "Nuclear Reset"**: Addressing the home-directory git contamination issue.
    - *Prompt*: "Can you remove unnecessary files from the remote repository branch so we only have the files that are on our local?"
    - *Solution*: Re-initializing Git at the project root and force-pushing a clean branch.
- **Git Connectivity**: Configuring secure pushes to `mondweep/vibe-cast` using GitHub PATs.

## 3. Application Stabilization
- **Router & Hydration**: Fixing the `Router action dispatched before initialization` error in Next.js 16.
- **CSS & Asset Restoration**: Debugging 404s on Render/Vercel caused by stale `basePath` and `assetPrefix` settings.
- **Chart Visibility**: Resolving "Black Hole" cards in Recharts by updating contrast variables and relative positioning.
- **Local Dev Server**: Fixing the macOS `Operation not permitted (os error 1)` crash by switching from Turbopack to Webpack.

## 4. Documentation & Outreach
- **ARCHITECTURE.md**: Mapping the flow from the Next.js frontend to the Rust analysis engine.
- **DEPLOYMENT.md**: Creating a sequential cross-service guide for Vercel (Frontend) and Render (Backend).
- **LinkedIn Strategy**: Drafting an engaging article that credits **Chris McGrath** and **rUv** while highlighting the new "Mastery" contributions.
- **Visual Identity**: Generating a high-fidelity DNA/AI hero image for professional outreach.
- **Video Script**: Crafting a crisp, 2-minute walkthrough script for a live app demonstration.

---
*Session Summary: 100% Stabilization, Clean Repo, and Launch Ready.*
