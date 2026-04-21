# NVIDIA AIQ Exploration Setup

This branch contains the NVIDIA AIQ repository set up for exploration with both DeepResearch Bench branches.

## Directory Structure

- **aiq/** - Cloned NVIDIA AIQ repository
  - **aiq/drb1/** - Git worktree for `drb1` branch (DeepResearch Bench)
  - **aiq/drb2/** - Git worktree for `drb2` branch (DeepResearch Bench II)
  - **aiq/** (main) - Develop branch for reference

## Quick Start

To explore either branch:

```bash
cd aiq/drb1   # For DeepResearch Bench v1 results
cd aiq/drb2   # For DeepResearch Bench v2 results
```

Each directory is a fully independent working tree with its own git state.

## Repository Reference

- **Official Repository**: https://github.com/NVIDIA-AI-Blueprints/aiq
- **Branch Info**:
  - `drb1`: Features for Deep Research Bench Leaderboard (AI-Q v2.0 pre-release)
  - `drb2`: Features for Deep Research Bench II Leaderboard (AI-Q v2.0 pre-release)

## Notes

- Both branches are active research branches with experimental updates
- For production use, refer to the `main` branch (v1.2.1 stable release)
