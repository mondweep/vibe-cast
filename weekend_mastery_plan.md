# Weekend Mastery Plan
## Genomics, AI & Mathematical Biology — From Understanding to Creation

**Goal:** Move from orientation to mastery of the genomic_one codebase, and ship a first novel addition.
**Timeframe:** Weekend of 26–27 April 2026
**Repository:** https://github.com/cmcgrath2023/genomic_one

---

> Your original aim has three stages: **understand → master → create**. You've already done the orientation — you have the concept map, you know the architecture, and you've explained it to others (which is itself a powerful learning technique). This weekend is the right moment to go from reading about the codebase to *inhabiting* it.

---

## Saturday — Run it, Read it, Break it

### Morning (2–3 hours): Get the platform alive in front of you

Don't just browse the GitHub Pages demo. Clone the repo, get the Rust backend running locally, and hit the real API endpoints from your browser. When the SSE stream fires and you watch variants appear in real time, the abstractions become concrete in a way no amount of reading achieves.

```bash
git clone https://github.com/cmcgrath2023/genomic_one.git
cd genomic_one
cargo run -- --serve          # backend on :8080
cd frontend && npm install && npm run dev   # frontend on :3005
```

Open each `/brain/*` page one by one — not to browse, but to ask: *what API call is this page making, and what does the JSON response actually contain?* Open DevTools Network tab while you click around. You'll see the raw data behind every chart.

---

### Afternoon (3–4 hours): Layer-by-layer code reading with a question in hand

Work through `src/main.rs` and `src/api.rs` with the concept guide open beside you. For each of the 8 pipeline stages, ask yourself one question and find the answer *in the code*:

| Stage | File / Function | Question to Answer |
|-------|----------------|--------------------|
| 1 — Sequences | `GenePanel::load()` | What does `DnaSequence::from_str` actually do with the raw A/C/G/T string? |
| 2 — K-mers | `KmerResults::compute()` | How does `to_kmer_vector(11, 512)` produce exactly 512 numbers? Where does the dimensionality reduction happen? |
| 3 — Alignment | `SmithWaterman::align()` | Change the fragment start from 100 to 200 — does the score go up or down? Why? |
| 4 — Variants | `VariantCaller::call_snp()` | Find `SICKLE_CELL_POS` in the `rvdna` crate. Confirm it maps to codon 6 of HBB. |
| 5 — Protein | `translate_dna()` | Manually decode the first two codons (ATG = Met, GTG = Val) and verify the output `MVHLTPEEKS…` |
| 6 — Epigenetics | `HorvathClock::predict_age()` | The clock is a linear model. Where is the intercept? Does ~27.9 years make sense given the synthetic methylation values? |
| 7 — Pharma | `pharma::predict_phenotype()` | Trace how `*1/*4` becomes `Intermediate` metaboliser. Find the match arm. |
| 8 — RVDNA | `RvdnaReader::stats()` | The format uses 3.2 bits/base vs the theoretical 2-bit minimum. Where does the overhead come from? |

Each investigation is 15–20 minutes. By the end you'll know where everything lives — not just what it does.

---

## Sunday — Deepen the Hard Bits, Then Start Building

### Morning (2 hours): The three hardest concepts, properly

These are the three concepts most people skim and most worth owning deeply.

---

#### 1. Bayesian Updating with Beta Distributions

Open a Python notebook (or [Observable](https://observablehq.com)) and simulate the prior updating process yourself.

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import beta

# Start with complete ignorance: Beta(1,1)
alpha, beta_param = 1, 1

fig, axes = plt.subplots(1, 11, figsize=(22, 3))
x = np.linspace(0, 1, 200)

for i, ax in enumerate(axes):
    ax.plot(x, beta.pdf(x, alpha, beta_param))
    ax.set_title(f'Beta({alpha},{beta_param})', fontsize=7)
    ax.set_yticks([])
    alpha += 1  # add a "pathogenic" observation each time

plt.tight_layout()
plt.show()
```

Watch the distribution narrow from flat uncertainty to a sharp peak. Then add a contradictory observation (`beta_param += 1`) and see how the posterior shifts. **This is exactly what Savant AI is doing internally** — and once you've seen it animate, you'll never forget it.

---

#### 2. Cosine Similarity in High Dimensions

The k-mer vectors live in 512 dimensions. HBB vs TP53 scores 0.486. Try this:

```python
import numpy as np

# Two random 512-dimensional unit vectors
a = np.random.randn(512); a /= np.linalg.norm(a)
b = np.random.randn(512); b /= np.linalg.norm(b)
print(f"Random vectors cosine similarity: {np.dot(a, b):.4f}")
# → Nearly 0. Random vectors are almost orthogonal in high dimensions.

# The fact that HBB/TP53 score 0.486 tells you they share meaningful k-mer patterns.
```

Now look at the heatmap: TP53/CYP2D6 is the *highest* pair at 0.510. Ask yourself: what biological story could explain that? (Hint: both are involved in responses to cellular stress and drug metabolism pathways.)

---

#### 3. FTLE and Why Disease Trajectories Have Confidence Bands

The Lyapunov exponent measures how fast nearby trajectories diverge. In the context of the BRCA1 risk curve: the confidence band isn't just statistical uncertainty about the model — it represents genuine sensitivity to initial conditions (the patient's baseline state). A patient at the edge of the band could follow a very different trajectory from one at the centre.

**Do this:** Open `frontend/src/components/DiseaseTrajectory.tsx` and find where `lower` and `upper` band values are consumed by the `AreaChart`. Then open `frontend/src/lib/static-data.ts` and trace where those values come from. Ask: if you shifted a patient's baseline epigenetic age up by 5 years, which direction would the band shift, and why?

Read the [Temporal Attractor Studio README](https://crates.io/crates/temporal-attractor-studio) and understand what "attractor basin" means before you look at the chart again.

---

### Afternoon (3–4 hours): Build Your First Novel Addition

Choose one of the three options below. They are ordered by difficulty. **Pick the one that excites you most, not the easiest one.**

---

#### Option A — Add APOE as a Sixth Gene *(3 hours)*

**Why:** APOE ε4 is the strongest known genetic risk factor for late-onset Alzheimer's disease — arguably more clinically significant than any of the five genes currently in the panel. Adding it touches every layer from L1 to L5 and forces you to understand the full data flow end-to-end.

**What to build:**
- Add the real APOE coding sequence to `src/main.rs` in the `GenePanel` struct
- Compute its GC content, k-mer vector, and add it to the similarity matrix
- Add it to `frontend/src/lib/static-data.ts` in `panelData`
- Add a pharmacogenomic note to `pharmaData`: APOE ε4 carriers have altered response to statins and are at higher risk of adverse effects from certain anti-amyloid therapies
- Add a disease trajectory entry for Alzheimer's risk (age 60: 15%, age 70: 28%, age 80: 45% for ε4/ε4 homozygotes)

**Files to touch:** `src/main.rs`, `src/api.rs`, `frontend/src/lib/static-data.ts`

---

#### Option B — Wire the 23andMe Upload UI *(4 hours)*

**Why:** The backend function `run_23andme()` already exists in `main.rs`. The frontend has no upload page. This is the feature most likely to make the platform feel real and personal to users.

**What to build:**
- Add `POST /api/23andme` to `src/api.rs` — accept a multipart file, pass it to `genotyping::analyze()`, return JSON
- Add a new page at `frontend/src/app/upload/page.tsx` with a file input accepting `.txt` files
- Show results: which variants from the panel were detected, CYP2D6 star allele if present, a simple risk summary

**Files to touch:** `src/api.rs`, new `frontend/src/app/upload/page.tsx`, `frontend/src/components/BrainSidebar.tsx` (add nav link)

---

#### Option C — Make the Bayesian Priors Actually Update *(2 hours)*

**Why:** The learning page currently shows static Beta distributions. This is the smallest change with the deepest conceptual payoff — you'll have built a genuinely adaptive system.

**What to build:**
- Add `POST /api/brain/update-prior` to `src/api.rs` — accepts `{ gene: "HBB", observation: true }`, increments α (true) or β (false), persists to a local `priors.json`
- Add `GET /api/brain/priors` to return current distributions
- Update `frontend/src/app/brain/learning/page.tsx` to show live Alpha/Beta values and a "Submit observation" button
- Bonus: render the Beta distribution curve using Recharts `AreaChart` with x from 0→1 and y as the probability density

**Files to touch:** `src/api.rs`, `frontend/src/app/brain/learning/page.tsx`

---

## What You'll Have by Sunday Evening

| Activity | Outcome |
|----------|---------|
| Platform running locally | Real pipeline, not just demo |
| 8 code investigations | You know where everything lives |
| Bayesian simulation | Prior updating is intuitive, not abstract |
| Cosine geometry experiment | High-dimensional similarity is concrete |
| FTLE / trajectory deep dive | Confidence bands make physical sense |
| Novel addition shipped | First real contribution to the codebase |

The combination of **read → investigate → simulate → build** is how mastery actually forms. The concept guide is your map; this weekend is the territory.

---

## Resources

| Resource | Link |
|----------|------|
| Genomic One live demo | https://cmcgrath2023.github.io/genomic_one |
| Genomic One source | https://github.com/cmcgrath2023/genomic_one |
| rvdna crate docs | https://crates.io/crates/rvdna |
| RuVector (HNSW + MinCut) | https://github.com/ruvnet/RuVector |
| ruv-FANN neural nets | https://github.com/ruvnet/ruv-FANN |
| Temporal Attractor Studio | https://crates.io/crates/temporal-attractor-studio |
| SAFLA safety framework | https://github.com/ruvnet/SAFLA |
| Savant AI (Bayesian) | https://github.com/bar181/savant-ai-results |
| APOE ε4 and Alzheimer's | https://www.ncbi.nlm.nih.gov/books/NBK390417 |
| CPIC CYP2D6 guidelines | https://cpicpgx.org/genes-drugs |
| Concept guide (this repo) | `genomic_one_concept_guide.md` |

---

*Good luck. The goal is not to finish everything — it is to finish Sunday knowing one thing more deeply than you knew it on Friday.*
