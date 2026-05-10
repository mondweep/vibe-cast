# Vibe Cast

> Build-in-public learning lab by **[Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)**.
> AI, agents, trading, multimedia, IoT, regional/cultural tech, and everything in between.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mondweepchakravorty)

---

## What is this repository?

**Vibe Cast is a single repository with many lives.** Each branch is a separate project — a working prototype, a research notebook, a production demo, a hackathon entry, or a learning sprint. I use it as a public lab to explore ideas end-to-end, share my journey, and invite others to follow along, fork, and contribute.

The `main` branch is intentionally minimal (only `LICENSE`, this `README.md`, and the navigation file `MASTER-README.md`). The actual code, demos, and writeups live in the ~100+ feature branches.

If you stumbled here looking for one specific thing, jump straight to **[MASTER-README.md](./MASTER-README.md)** — it's the full catalogue of every branch with descriptions, tech stacks, and run instructions.

---

## Why a single repo with many branches?

- **Cross-pollination**: ideas from a trading experiment often inform an agent framework, and vice versa.
- **Build-in-public**: every direction I explore is visible — including the abandoned ones.
- **Low friction**: a new idea = a new branch. No new repo, no new CI to configure.
- **One place to follow**: subscribe once, see everything.

---

## Highlights — Some Things You'll Find Here

| Area | Pick-a-project starting point |
|---|---|
| **Real-time chat & collab** | `claude/pubnub-tinkering-*` (chat), `tribe-knowledgeGraph` (3D collaborative graph) |
| **Agentic AI & Claude Flow V3** | `claude/qe-framework-session-id-JB4dj`, `claude/ikenna-forge-YbUEZ`, `claude-flow-browser` |
| **AI security** | `aidms-tinkering` — AI Manipulation Defense System demo |
| **Algorithmic trading** | `claude/neural-trading-setup-*`, `cognitum-one-neuraltrader` |
| **DeFi & on-chain** | `aave-mcp` (Rust MCP for Aave), `claude/create-defi-orphan-branch-MwFdJ` (Next.js DeFi tutor) |
| **Multimedia & music** | `song-translation-working`, `claude/sanskrit-english-songs-*`, `claude/sheet-music-player-*` |
| **IoT & edge** | `esb32-tinker-ruview` (ESP32 + WiFi-CSI), `tcl-move-platform` (Tata MOVE) |
| **Genomics** | `genomics-exploration` (full-stack AI genomics) |
| **India / Assam / regional** | `claude/assamese-travel-companion-*`, `NMC-2026-assam`, `claude/rari-jaipur-ai-summit-2026-*` |
| **Structured learning** | `aws-advanced-networking`, `claude/learning-rust-basics-*`, `claude/ai-architecture-analysis-*` |
| **Hackathons & meetups** | `42-london-demo`, `london-meetup-8Apr`, `hackathon-tv5monde-guidance` |

A full categorised catalogue lives in **[MASTER-README.md](./MASTER-README.md)**.

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast

# 2. List every branch
git fetch --all
git branch -r

# 3. Open the catalogue
$EDITOR MASTER-README.md

# 4. Check out a branch that interests you
git checkout <branch-name>

# 5. Follow that branch's README for setup
#    (commonly: npm install / pip install -r requirements.txt / cargo build)
```

Most web projects in this repo ship with a `netlify.toml`, `vercel.json`, `railway.toml`, or `Dockerfile`, so you can deploy them with one click after forking.

---

## Repository Conventions

- **`main`** — intentionally minimal. Holds only `LICENSE`, `README.md`, and `MASTER-README.md`.
- **`claude/<slug>-<id>`** — branches created during a Claude Code session. The slug describes the experiment.
- **`<topic>` / `<topic>-tinkering`** — manually-created exploration branches.
- **`agentics/*`**, **`claude-flow-*`** — agentic-system experiments and integrations.
- Each branch contains its own `README.md`, dependency manifest, and (where relevant) deployment config.

---

## Following the Journey

I treat Vibe Cast as a notebook in the open. The most reliable place to follow what I'm working on, why, and what I'm learning is LinkedIn:

- **LinkedIn**: <https://www.linkedin.com/in/mondweepchakravorty>
- **GitHub**: <https://github.com/mondweep/vibe-cast>

---

## Contributing

This is primarily a personal lab, but contributions are very welcome — especially if a particular branch sparks ideas for you. The flow:

1. Identify the branch your contribution targets (most contributions are branch-local).
2. Fork the repo, then create a feature branch *from that project branch*.
3. Open an issue first if the change is non-trivial.
4. Submit a PR back to the project branch (not `main`).

Please be kind, curious, and patient — many of these branches are works-in-progress or learning artifacts rather than polished products.

---

## License

This repository is licensed under the [MIT License](LICENSE).

---

**See the full catalogue → [MASTER-README.md](./MASTER-README.md)**
