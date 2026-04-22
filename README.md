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

## 🔬 The Research Foundation

This project is grounded in an academic paper:  
**"A StrongREJECT for Empty Jailbreaks"**  

📄 [`A STRONGREJECT for Empty Jailbreaks.pdf`](./A%20STRONGREJECT%20for%20Empty%20Jailbreaks.pdf)

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

This setup enables the following research directions:

### 1. 🛡️ AI Safety Research
Use StrongREJECT to evaluate how the abliterated model responds to attack patterns compared to the original safety-aligned Gemma model. Understand *what* the safety training actually prevents — and at what cost.

### 2. 📊 Jailbreak Benchmarking
Test 37+ different jailbreak methods against this model to rigorously measure which attacks are genuinely effective versus those that merely appear to work. Produce reproducible, peer-quality results.

### 3. 🧪 Model Degradation Analysis
Investigate how removing safety constraints affects:
- Reasoning quality
- Coherence and accuracy
- Ability to handle nuanced, sensitive topics responsibly

### 4. ⚖️ Safety Cost Analysis
Compare the abliterated version against the original aligned model on *legitimate* tasks:
- Coding and debugging
- Translation
- Logical reasoning
- Complex analysis

**Goal:** Quantify the true capability cost of safety fine-tuning — does making a model safer also make it less useful?

### 5. 🔒 Developing Better Defences
Use StrongREJECT's evaluation framework as a testbed for new safety mechanisms. Build, test, and validate defences in a controlled environment before they go anywhere near real users.

---

## ⚠️ Important Ethical Context

> **This is a research environment, not a consumer tool.**

| ✅ Appropriate Use | ❌ Not Appropriate |
|---|---|
| Academic AI safety research | Deploying to end users |
| Benchmarking safety systems | Attempting to extract harmful content |
| Understanding model failure modes | Sharing outputs publicly without context |
| Controlled red-team testing | Using as a replacement for aligned AI assistants |

The model is run **entirely locally** — no data leaves the machine, and no outputs are exposed to any network or third-party service.

---

## 🏗️ Technical Setup

### Architecture

```
gemma-4-26B-IT-ARA-Abliterated/
├── llama.cpp/          ← The inference engine (C++ runtime for running AI models)
│   └── build/          ← Compiled binaries (built from source)
├── gemma-env/          ← Python virtual environment for research scripts
├── Modelfile           ← Model configuration (quantisation, context settings)
├── README.md           ← This file
├── PROGRESS_LOG.md     ← Plain-English log of build and research progress
├── prior-context.md    ← Raw research context and notes
└── A STRONGREJECT for Empty Jailbreaks.pdf  ← Reference paper
```

### Runtime Stack

| Component | Technology | Purpose |
|---|---|---|
| Inference engine | **llama.cpp** | Runs the model efficiently on CPU/GPU |
| Build system | **CMake 4.3.1** | Compiles llama.cpp from source |
| Compiler | **AppleClang 16** | macOS native compiler |
| GPU acceleration | **Apple Metal** | Uses Mac GPU for faster inference |
| Math acceleration | **Apple Accelerate** | Optimised matrix operations |
| Model format | **GGUF** | Quantised model weights |

### Build Status

See [`PROGRESS_LOG.md`](./PROGRESS_LOG.md) for a full, plain-English record of setup progress.

**Quick commands:**
```bash
# Build llama.cpp from source
cd llama.cpp && mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release

# Log a progress update (plain English)
./log_update.sh "Describe what just happened"
```

---

## 📚 Key References

- **StrongREJECT Paper:** Souly et al. — *"A StrongREJECT for Empty Jailbreaks"*
- **Gemma Model:** [google/gemma](https://ai.google.dev/gemma) — Google's open-source LLM family
- **llama.cpp:** [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) — Efficient C++ inference engine
- **Abliteration technique:** Removing refusal behaviour via directional activation steering at fine-tune time

---

*README last updated: 2026-04-21*  
*For build progress, see [PROGRESS_LOG.md](./PROGRESS_LOG.md)*
