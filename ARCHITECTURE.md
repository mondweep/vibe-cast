# 🏗️ Genomic One — Architecture & Reality Map

This document is the honest "what's actually computed vs. what's a placeholder" view of the platform. After the `dna-input-pipeline` branch, the back end can now process user-supplied DNA end-to-end (upload FASTA → real pipeline → real result), so this map reflects that current state.

If you're a developer joining the project, **read this first** — every panel in the dashboard sits somewhere on a spectrum from "fully real" to "convincing visualisation," and knowing which is which is essential before you start extending.

---

## 🛰️ High-Level Data Flow (post dna-input-pipeline)

```mermaid
graph TD
    subgraph Practitioner
        UPLOAD[/upload page<br/>FASTA drag-drop]
    end

    subgraph "Frontend (Next.js / React 19)"
        UI[Dashboard panels] --> API_WRAP[lib/api.ts]
        UPLOAD --> ANALYZE_CALL[analyzeSequence]
    end

    subgraph "Backend (Rust / Axum)"
        ANALYZE[/api/analyze<br/>POST text/plain] --> ANALYZE_MOD[analyze.rs<br/>FASTA parser + 6-stage pipeline]
        ANALYZE_MOD --> RVDNA[rvdna crate<br/>parsing, k-mer, alignment, translation]
        OLD_API[/api/panel /kmer /variants etc<br/>GET hardcoded panel] --> CORE[core.rs<br/>GenePanel::load]
        BRAIN[/api/brain/* <br/>GET hardcoded JSON] -.no compute.- BRAIN_CONST[Static structures<br/>memories, learning, pathways]
    end

    ANALYZE_CALL --> ANALYZE
    API_WRAP --> OLD_API
    API_WRAP --> BRAIN
```

The dashboard's home page still consumes the legacy `/api/*` and `/api/brain/*` endpoints (which mostly use the hardcoded panel). The new `/upload` page is the only flow that takes a user-supplied sequence end-to-end.

---

## ✅ Reality Check — One-Page Verdict Table

| Component | Status | What's actually computed | What's hardcoded / synthetic |
| :--- | :--- | :--- | :--- |
| FASTA upload + validation | 🟢 Real | Parser, alphabet check, length cap, structured errors | — |
| Sequence stats (length, GC, N count) | 🟢 Real | Per-input, byte-level | — |
| Smith-Waterman alignment | 🟢 Real | Best-of-six panel match for any user sequence | Reference panel itself (6 hardcoded genes) |
| K-mer similarity (11-mer / 512-D) | 🟢 Real | Cosine similarity of user vs each panel gene | Reference vectors come from the hardcoded panel |
| Variant detection (alignment diff) | 🟡 Partly real | Real alignment + real per-base diff | Not a real pileup; depth=1; capped at 100 mismatches |
| Protein translation | 🟢 Real | Frame-0 codon translation via rvdna | — |
| Protein contact graph | 🟡 Partly real | Real graph algorithm on real residues | Heuristic distance threshold; not folded structure |
| CYP2D6 star-allele caller | 🟡 Partly real | Real diplotype-to-phenotype mapping; real CPIC drug rec lookup | Position mapping uses local coords, not absolute genomic; second haplotype hardcoded to *1 |
| Epigenetic age (Horvath clock) | 🟡 Partly real | Real Horvath linear regression formula | Methylation β-values are random per request — no real CpG input |
| `/api/variants` (legacy endpoint) | 🟡 Partly real | Real `VariantCaller::call_snp` | Pileup is RNG-generated each request, not from real reads |
| `/api/brain/memories` | 🟡 Partly real | K-mer vectors and similarities are real | Cluster IDs and timestamps hardcoded |
| `/api/brain/learning` (Bayesian, neural models) | 🔴 Synthetic | — | Bayesian priors, FANN model accuracies, learned patterns — all hardcoded JSON |
| `/api/brain/pathways` (gene interaction graph + MinCut) | 🔴 Synthetic | — | Edges, weights, partition cuts hardcoded |
| Federation nodes (5-city HQ map) | 🔴 Synthetic | — | Hardcoded in `static-data.ts` |
| Research Pods (autonomous agent swarms) | 🔴 Synthetic | — | Hardcoded `researchPodsData` |
| Drug candidates (BRCA1 SMILES) | 🔴 Synthetic | — | Hardcoded `moleculeData` |
| Disease Trajectories (BRCA1, CYP2D6, T2D age curves) | 🔴 Synthetic | — | Hardcoded `trajectoryData` curves |
| SAFLA validation banner | 🔴 Synthetic | — | Hardcoded `saflaValidation` JSON |
| RVDNA binary format roundtrip | 🟢 Real | Real serialisation, k-mer index, lossless decode | — |

**Key:** 🟢 Real = output is computed from input · 🟡 Partly real = real algorithm but synthetic input or simplified scope · 🔴 Synthetic = no computation, returns canned data

---

## 🔬 Disease Trajectory — Current State and the Path to Real

The disease-trajectory panels (BRCA1 cancer risk, CYP2D6 metabolism decline, T2D risk by age) are the part of the dashboard most likely to be misread as "real predictions." They are not. The curves are hand-curated from rough population averages and live in `frontend/src/lib/static-data.ts`. The same curve renders for every visitor.

### What "real" disease trajectory looks like

A clinically credible version of this feature needs four ingredients:

1. **Patient-specific variants.** We now collect these via `/api/analyze`. ✅
2. **Variant pathogenicity classification.** ClinVar (free, no auth) maps a variant to one of: pathogenic / likely pathogenic / VUS / likely benign / benign. We currently don't query it.
3. **Variant → disease → age-of-onset model.** Several public sources:
    - **OMIM** — gene-to-disease links
    - **PGS Catalog** — polygenic risk score weights (https://www.pgscatalog.org/)
    - Published penetrance studies (BRCA1 has ~30 years of cohort data)
4. **Statistical model.** For Mendelian variants: cumulative incidence curves (Kaplan–Meier from cohort studies). For polygenic risk: weighted sum of effect sizes, normalised against a reference population.

### Concrete implementation sketch

A new endpoint `POST /api/risk-profile` would:

```rust
// Pseudocode
fn risk_profile(variants: Vec<DetectedVariant>) -> RiskProfile {
    let pathogenic = variants.into_iter()
        .filter_map(|v| clinvar_lookup(&v))         // HTTP to ClinVar API
        .filter(|c| c.is_pathogenic_or_likely());

    let conditions = pathogenic.map(|v| {
        let disease = omim_lookup(&v.gene);          // gene → disease
        let onset = penetrance_curve(&disease);      // age → cumulative risk
        ConditionRisk {
            disease: disease.name,
            current_age_band: onset.median_onset,
            cumulative_risk_at: vec![
                AgeRisk { age: 50, p: onset.cdf(50) },
                AgeRisk { age: 60, p: onset.cdf(60) },
                AgeRisk { age: 70, p: onset.cdf(70) },
                AgeRisk { age: 80, p: onset.cdf(80) },
            ],
            modifiers: ModifierAdvice {
                screening_age: onset.recommended_screening_start(),
                lifestyle_protective: onset.protective_factors(),
            },
            confidence: c.confidence_grade,           // ClinVar review status
            sources: vec![v.clinvar_url, disease.omim_url],
        }
    }).collect();

    RiskProfile { conditions, polygenic: None /* TODO */, disclaimer: ... }
}
```

#### Frontend
The existing `DiseaseTrajectory` component already accepts a `points: { age, risk, lower, upper, flag }[]` shape — it can render a real risk curve as soon as the backend provides one. The hardcoded curves can be retired in a single PR.

#### Quality bar (acceptance criteria)
- For an HBB Glu6Val homozygous input: report **Sickle Cell Disease**, age-of-onset typically **6 months – 2 years**, lifetime mortality without treatment ~50% by age 5 (real published numbers).
- For a BRCA1 185delAG carrier: **breast cancer cumulative risk ~55–65% by age 70**, ovarian ~30–45% by age 70 (King et al., Antoniou et al. cohort meta-analyses).
- For a CYP2D6 *4/*4 (poor metabolizer): not a disease but actionable — flag drugs from CPIC level A guidelines (codeine, tramadol, certain SSRIs).
- For an unremarkable input: empty conditions array; no false-positive risk inflation.

#### Effort estimate
- ClinVar variant lookup wrapper: ~1 day (REST API, simple JSON parsing)
- Curated penetrance table for the panel's 6 genes (HBB, TP53, BRCA1, CYP2D6, INS, APOE): ~2 days (literature search + tabular encoding)
- `/api/risk-profile` endpoint + types: ~1 day
- Frontend integration replacing hardcoded curves: ~1 day

**~5 working days for a credible v1.** This is bounded, real work — not a research project.

### What it would NOT include (and why)
- **Polygenic risk scores for complex disease (T2D, Alzheimer's, CAD).** PRS needs many SNPs simultaneously — single-gene FASTA upload doesn't give enough coverage. A second feature ("Upload your full SNP array") would be required.
- **Gene-environment interaction modelling.** Lifestyle, diet, and exposure data are not in the upload — we'd need a structured patient questionnaire.
- **Treatment-effect modelling.** "If you start tamoxifen at age 40, your risk drops to X%" is way out of scope without clinical-trial linked data.

---

## 🛠️ Other Real-Work Paths

### Make Bayesian / Neural / Federated layers real

| Layer | Today | Path to real |
| :--- | :--- | :--- |
| `/api/brain/learning` (Bayesian priors) | Hardcoded mean/variance/confidence per trait | Implement a real `Beta(α, β)` updater. Each `/api/analyze` call increments the relevant trait's α / β based on detected variant pathogenicity. Persist per-installation in SQLite. Effort: ~3 days. |
| `/api/brain/learning` (FANN models) | Hardcoded accuracy stats | Train a real ruv-FANN classifier on **ClinVar's variant-summary dataset** (~1.5M variants, free download). Output: per-variant pathogenicity probability that lives alongside ClinVar's labelled answer for evaluation. Effort: ~1 week. |
| Federation (5-city HQ map) | Hardcoded `federationData` | Stand up two real Render services (e.g. one EU, one US) + a tiny MCP gateway that forwards `/api/analyze` calls. Show actual node latency and request counts. Effort: ~1 week. |
| Drug candidate generation | Hardcoded SMILES list | Replace with a real call to a public diffusion model — e.g. **MoLeR**, or HuggingFace inference endpoint for a fragment-conditioned generator. The Render free tier has no GPU; route the inference to Replicate/Modal. Effort: ~3-5 days. |
| SAFLA validation | Hardcoded "passed/warning" JSON | Real implementation: every recommendation passes through an actual checklist (CPIC level ≥ B? confidence > threshold? contraindication present?). Persist audit log. Effort: ~2 days. |

### Make the variant detection a real pileup-based caller

Today's `/api/analyze` does base-by-base diff between user sequence and the matched reference. That's a useful demo but not a real variant call.

To upgrade:
- Accept multiple FASTA records as "reads" of the same region
- Build a real pileup column at each position
- Run the existing `VariantCaller::call_snp` on real depth + quality data
- Report VCF-style output (POS, REF, ALT, DP, QUAL, GT)

Effort: ~3 days. Probably bigger UX implications — practitioners would need a way to upload sequencing reads, which most don't have casually.

Better path for v2: accept **VCF input directly**. VCF is the standard interchange format from any sequencing pipeline. A new `POST /api/analyze-vcf` endpoint that consumes pre-called variants and runs everything from "best-gene match" forward would be more useful than building our own caller.

### Bring back real epigenetic input

The Horvath clock formula is real but the methylation values are RNG. A real version needs a CSV of (CpG_id, β_value) rows from an Illumina array (450K or EPIC). Effort: ~1 day for the parser + endpoint; the real friction is that practitioners may not have array data on hand.

### Promote the legacy GET endpoints

`/api/panel`, `/api/kmer`, `/api/alignment`, `/api/variants`, `/api/protein`, `/api/epigenetics`, `/api/pharma`, `/api/rvdna` — all GET-only, all return data from the hardcoded panel only. They are useful for the dashboard's "show what the platform can do" demo state.

A clean v2: deprecate them, and make every dashboard panel session-scoped to the user's uploaded sequence (cached server-side under an opaque session ID for the duration of the page visit).

---

## 🚦 Effort vs Impact Matrix

| Feature | Effort | User-visible impact | Risk if not done |
| :--- | :--- | :--- | :--- |
| Real disease trajectory (`/api/risk-profile`) | Medium (~1 week) | High — directly addresses "when will this manifest?" | The disease curves stay misleading |
| Real variant pathogenicity (ClinVar wrapper) | Low (~2 days) | High — every variant gains a real classification | Variants table feels generic |
| Real Bayesian updater | Low (~3 days) | Medium — "learning" panel becomes truthful | The brain panels read as marketing |
| Real federation (multi-node MCP) | Medium (~1 week) | Low — looks identical to a single node | Federation page is cosmetic |
| Real drug-candidate generation | Medium (~1 week) | Medium — proves the molecule pipeline | SMILES feel arbitrary |
| Real ruv-FANN classifier on ClinVar | High (~1 week) | Medium — enables real model metrics | Model accuracies feel marketing-y |
| VCF input path | Low (~3 days) | High for clinicians | Users with real sequencing data can't try it |
| Pileup-based variant caller | Medium (~3 days) | Low — VCF input is more practical | "Variants" is a single-base diff, not a real call |

---

## 🧭 Recommended next phase

Based on the matrix and the user's specific question ("when may a disease manifest"):

**Phase 2 = Real Risk Profile.** Implement `/api/risk-profile` (ClinVar variant lookup → curated penetrance table → cumulative risk curves). Wire it into the existing `DiseaseTrajectory` component. Retire the hardcoded curves. ~5 working days. This single change converts the largest piece of "convincing visualisation" into actual clinical inference, and it builds on top of the already-real `/api/analyze` pipeline.

**Phase 3 = Real ClinVar variant annotation.** Already partially needed for Phase 2. Surface in the variants table as ClinVar significance + review status + URL. ~2 days.

**Phase 4+** = Bayesian updater, real federation, real molecule generation, VCF input. Each can be a self-contained branch.

---

## 📚 Signposting

- **[README.md](./README.md)**: Project overview, vision, sample FASTA inputs.
- **[PROGRESS_LOG.md](./PROGRESS_LOG.md)**: Daily technical breakthroughs.
- **[genomic_one/PROGRESS.md](./genomic_one/PROGRESS.md)**: Cross-agent sync — current branch state, deployments, gotchas.
- **[genomic_one/samples/README.md](./genomic_one/samples/README.md)**: Test FASTA inputs and expected pipeline outputs.
- **[Concept Guide](./genomic_one_concept_guide.md)**: Deep dive into the biological theory behind each layer.
