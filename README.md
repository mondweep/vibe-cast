# 🧠 Gemma 4 (26B) — Abliterated Model: AI Safety Research Environment

> **For non-technical readers:** This project sets up a powerful AI model on a local computer — completely privately — to study *how* AI models can be manipulated, and *how* to make them safer. Think of it as a controlled laboratory for understanding AI vulnerabilities without putting real users at risk.

---

## 📌 What Is This Project?

This workspace runs **Gemma 4 (26 Billion parameters)** — a large open-source AI model released by Google — in a special research configuration called **"abliterated"**.

### What does "abliterated" mean?

Normally, AI models like ChatGPT or Gemini are trained with **safety guardrails** — rules that prevent them from producing harmful content. "Abliterated" means those guardrails have been deliberately removed through a fine-tuning process.

**Why would anyone do this?**  
For the same reason a car safety lab deliberately crashes vehicles — to understand failure modes in a controlled environment, so we can build better protections for real-world systems.

---

## 🚀 Getting Started — Reproducing This Environment

> **Important:** Several large components are not stored in this repository (they are too large, or are external dependencies). This section tells you exactly what you need to download and how.

### Prerequisites

- **macOS** (tested on macOS 15 Sequoia, Intel x86_64)
- **Python 3.12** — [Download from python.org](https://www.python.org/downloads/)
- **CMake 4.x** — Install via Homebrew: `brew install cmake`
- **Git**
- ~30–50 GB free disk space (for the model weights)
- A Hugging Face account (free) to download the model

---

### Step 1 — Clone This Branch

```bash
git clone --branch gemma-4b-abliterated-tinkering https://github.com/mondweep/vibe-cast.git
cd vibe-cast
```

---

### Step 2 — Clone and Build `llama.cpp`

`llama.cpp` is the engine that runs the AI model locally. It is **not included** in this repo (it's a large C++ codebase that must be compiled for your specific machine).

```bash
# Clone llama.cpp into the project folder
git clone https://github.com/ggml-org/llama.cpp.git

# Build it from source
cd llama.cpp
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
cd ../..
```

> **What this does (plain English):** Downloads the AI engine's source code and compiles it into a program your Mac can run. This takes 5–20 minutes. Your Mac's GPU (Metal) will be detected and enabled automatically for faster inference.

---

### Step 3 — Set Up the Python Environment

A Python virtual environment (`gemma-env/`) is used for running StrongREJECT experiments and analysis scripts. It is **not included** in this repo (virtual environments are machine-specific).

```bash
# Create a fresh virtual environment
python3 -m venv gemma-env

# Activate it
source gemma-env/bin/activate

# Verify Python version (should be 3.12.x)
python --version
```

---

### Step 4 — Clone and Install the StrongREJECT Benchmark

`strong_reject/` is the benchmark repository used to evaluate jailbreak effectiveness. It is **not included** in this repo (it's an external project).

```bash
# Clone it
git clone https://github.com/dsbowen/strong_reject.git

# Install it (with your virtual environment activated)
source gemma-env/bin/activate
pip install -e ./strong_reject
```

> **What this does (plain English):** Downloads the research tool that measures whether an AI can be manipulated, and installs it so our scripts can use it.

---

### Step 5 — Get the Research Paper

The reference paper is too large to store in git. Download it here:

📄 **"A StrongREJECT for Empty Jailbreaks"**  
→ [arXiv: 2402.10260](https://arxiv.org/abs/2402.10260)  
→ Save it as `A STRONGREJECT for Empty Jailbreaks.pdf` in the project root

---

### Step 6 — Download the Gemma Model Weights

The AI model itself (the "brain" — a large data file) must be downloaded separately from Hugging Face. You will need a free account.

```bash
# Install the Hugging Face CLI (with your virtual environment activated)
source gemma-env/bin/activate
pip install huggingface_hub

# Log in to Hugging Face
huggingface-cli login
# (Enter your Hugging Face access token when prompted)

# Download the abliterated Gemma model
# Model: ARA-abliterated version of Gemma-4-IT-26B (GGUF quantised format, Q5_K_M)
huggingface-cli download jenerallee78/gemma-4-26B-A4B-it-ara-abliterated --local-dir ./models/
```

> ✅ **Model source confirmed**: `jenerallee78/gemma-4-26B-A4B-it-ara-abliterated`  
> Variant: Q5_K_M (5-bit quantized, ~17GB) — optimized for Apple Silicon and consumer hardware.

---

### ✅ Expected Directory Structure After Setup

```
vibe-cast/                          ← this repo (branch: gemma-4b-abliterated-tinkering)
├── llama.cpp/                      ← cloned & compiled from github.com/ggml-org/llama.cpp
│   └── build/                      ← compiled binaries (built locally)
├── gemma-env/                      ← created locally with `python3 -m venv`
├── strong_reject/                  ← cloned from github.com/dsbowen/strong_reject
├── models/                         ← downloaded model weights (.gguf files) [create manually]
├── Modelfile                       ← model config (included in repo ✅)
├── README.md                       ← this file (included in repo ✅)
├── PROGRESS_LOG.md                 ← build progress log (included in repo ✅)
├── prior-context.md                ← research notes (included in repo ✅)
├── log_update.sh                   ← progress hook script (included in repo ✅)
├── .gitignore                      ← excludes large/generated files (included in repo ✅)
└── A STRONGREJECT for Empty Jailbreaks.pdf  ← download from arXiv (not in repo)
```

---

## 🔬 The Research Foundation

This project is grounded in an academic paper:  
**"A StrongREJECT for Empty Jailbreaks"** — [arXiv: 2402.10260](https://arxiv.org/abs/2402.10260)

### The Problem the Paper Solves

AI researchers often test **"jailbreaks"** — clever tricks to make AI say things it's not supposed to. The problem? Previous measurement methods were deeply flawed:

| The Old Way | The Problem |
|---|---|
| Did the AI refuse? (Yes/No) | Doesn't measure if the harmful info was actually *useful* |
| Claimed ~100% jailbreak success | Wildly exaggerated — existing evaluators score too generously |
| No standard benchmark | Can't compare results across different papers |

### The Solution: StrongREJECT

The paper introduces **StrongREJECT**, a rigorous benchmark that:

- 📋 **313 carefully constructed forbidden prompts** across 6 harm categories
- 📊 **Two-dimensional scoring** — measures BOTH willingness (did it refuse?) AND capability (was the answer actually specific and useful?)
- 🔬 **Standardised metrics** — so claims can be independently validated

### 💡 The Surprising Key Finding

> *Jailbreaks that work by making prompts unrecognisable actually make the AI less capable at the same time.*

In other words:
- Obfuscated jailbreak prompts **bypass safety training** ✅
- But they also **confuse the model enough** that it gives vague, unhelpful answers ❌

This reveals a crucial distinction: an **abliterated model** (safety removed at training time) behaves *very differently* from a model that's being tricked with prompt hacks. The abliterated model keeps its full reasoning capability — it just has no safety constraints.

---

## 🎯 Research Goals

| # | Goal | Description |
|---|---|---|
| 1 | 🛡️ AI Safety Research | Evaluate how the abliterated model responds to attack patterns vs. the safety-aligned Gemma |
| 2 | 📊 Jailbreak Benchmarking | Test 37+ jailbreak methods using StrongREJECT's rigorous scoring |
| 3 | 🧪 Model Degradation Analysis | Measure how removing safety affects reasoning quality and coherence |
| 4 | ⚖️ Safety Cost Analysis | Quantify whether safety fine-tuning reduces legitimate task capability |
| 5 | 🔒 Developing Better Defences | Use StrongREJECT as a testbed for new safety mechanisms |

---

## ⚠️ Ethical Context

> **This is a research environment, not a consumer tool.**

| ✅ Appropriate Use | ❌ Not Appropriate |
|---|---|
| Academic AI safety research | Deploying to end users |
| Benchmarking safety systems | Attempting to extract harmful content |
| Controlled red-team testing | Sharing outputs publicly without context |
| Understanding model failure modes | Using as a replacement for aligned AI assistants |

The model runs **entirely locally** — no data leaves your machine.

---

## 📊 Build & Progress Log

For a plain-English record of setup progress, see [`PROGRESS_LOG.md`](./PROGRESS_LOG.md).

To add a progress note at any time:

```bash
./log_update.sh "Describe what just happened in plain English"
```

---

## 📚 Key References

| Resource | Link |
|---|---|
| StrongREJECT Paper | [arXiv: 2402.10260](https://arxiv.org/abs/2402.10260) |
| StrongREJECT GitHub | [dsbowen/strong_reject](https://github.com/dsbowen/strong_reject) |
| llama.cpp | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) |
| llama.cpp Build Docs | [docs/build.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md) |
| Gemma (Google) | [ai.google.dev/gemma](https://ai.google.dev/gemma) |
| Hugging Face CLI | [huggingface.co/docs/huggingface_hub/guides/cli](https://huggingface.co/docs/huggingface_hub/guides/cli) |

---

*README last updated: 2026-04-22 (Model source confirmed)*  
*For build progress and research notes, see [PROGRESS_LOG.md](./PROGRESS_LOG.md)*
