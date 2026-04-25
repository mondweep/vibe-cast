# Genomic One — Complete Concept Guide

> Everything you need to become an expert in this codebase, from first principles to novel extension ideas.

---

## What the project is

Genomic One is an *in silico* (computational simulation) clinical decision support platform built in Rust. It takes real human gene sequences — HBB, TP53, BRCA1, CYP2D6, and INS — runs them through a 7-layer intelligence pipeline, and surfaces pharmacogenomic recommendations, disease trajectory projections, and drug candidate molecules. All patient data is synthetic; the gene sequences themselves are real.

The live demo: https://cmcgrath2023.github.io/genomic_one/

---

## The 7-Layer Architecture

Think of it as a funnel: raw DNA goes in at Layer 1 and actionable, safety-validated clinical recommendations come out at Layer 6. Each layer adds a richer form of intelligence.

```
L6  SAFLA Safety Validation       ← every output passes a safety gate
L5  Decision / Advisory           ← multi-expert synthesis, pharmacogenomics
L4  Bayesian + Temporal           ← probabilistic learning, disease trajectories
L3  Neural + Molecule Generation  ← FANN classifier, Agentic Diffusion
L2  Vector Intelligence           ← HNSW search, MinCut pathways, literature
L1  Genomic Core + Streaming      ← rvdna pipeline, real-time SSE
```

---

## Layer 1 — Genomic Core (`rvdna` + MidStream)

### Concepts

**DNA sequence (`DnaSequence`)** — A string of nucleotides (A, C, G, T). The codebase loads five real human coding sequences at startup via `real_data::*` constants inside the `rvdna` crate.

**GC content** — The fraction of bases that are Guanine or Cytosine. GC-rich regions are more thermally stable. The pipeline reports this per gene (HBB ≈ 56%, TP53 ≈ 57%).

**K-mer vectorisation** (`to_kmer_vector(k, dims)`) — A *k-mer* is a substring of length k. For k=11 every unique 11-base window in the sequence is counted, and the counts are projected into a 512-dimensional vector. This converts biology into maths: sequences become points in high-dimensional space that can be compared with cosine similarity.

**Smith-Waterman alignment** — A dynamic-programming algorithm for finding the best local alignment between two sequences. It scores matches, mismatches, and gaps to find where a short query fragment best fits inside a longer reference. Used here to verify a 50-bp fragment of HBB maps back to position 100.

**Variant calling** — Detecting positions where the sequenced bases differ from the reference. The codebase simulates pileup data (a stack of reads at each position) and calls SNPs using `VariantCaller`. A special case is the HBB E6V mutation (A→T at position 20) — the sickle cell variant.

**Protein translation** (`translate_dna`) — The DNA triplet (codon) table maps every 3-base sequence to an amino acid. HBB translates to haemoglobin beta, starting with MVHLTPEEKSA…

**Protein contact graph** — Residues that are spatially close (within 8 Å) in the folded protein are likely to interact. The codebase builds this graph and ranks the most important contacts. This is a simplified version of what AlphaFold does.

**Epigenetic clock (Horvath Clock)** — DNA methylation at CpG sites changes predictably with age. The Horvath clock is a linear model trained on ~353 CpG sites that predicts *biological* age, which can differ from chronological age. The codebase generates synthetic methylation profiles and predicts age.

**RVDNA binary format** — An AI-native binary serialisation that stores the sequence *and* its pre-computed k-mer vectors together. This means the expensive vectorisation only happens once; subsequent retrievals are instant.

**MidStream / SSE (Server-Sent Events)** — The Axum backend streams pipeline results to the browser as they are computed, using the HTTP SSE protocol. The frontend uses `EventSource` to receive them. This is what makes the dashboard feel live.

### Key files
- `src/main.rs` — the 8-stage pipeline (`run_pipeline`)
- `src/api.rs` — Axum REST + SSE endpoints
- `frontend/src/lib/static-data.ts` — fallback static data for GitHub Pages

---

## Layer 2 — Vector Intelligence (RuVector + FACT)

### Concepts

**HNSW (Hierarchical Navigable Small World)** — A graph-based approximate nearest-neighbour algorithm. Imagine a multi-layer navigation graph: upper layers have long-range links for fast traversal, lower layers have short-range links for precision. Given a query k-mer vector, HNSW finds the most similar stored vectors in O(log n) time — far faster than brute-force cosine search over millions of sequences.

**KmerIndex** — A persistent vector store that indexes gene k-mer vectors via HNSW. You insert a vector once; future queries return nearest neighbours instantly.

**MinCut pathway analysis** — Gene interactions form a graph (nodes = genes, edges = known interactions). The minimum cut is the smallest set of edges whose removal disconnects the graph into two partitions. In biology this identifies the *bottleneck proteins* in a pathway — the most promising drug targets, because disrupting them with the fewest interventions has the most effect.

**Sublinear PageRank** — PageRank (the original Google algorithm) scores nodes by how many important nodes point to them. In a gene interaction network, high-PageRank genes are hubs — central to many pathways. The `sublinear` crate computes this in sub-linear time using sketching algorithms.

**FACT (Fast Augmented Context Tools)** — Rather than retrieval-augmented generation (RAG), FACT uses prompt caching and deterministic MCP tool execution to retrieve literature (PubMed, PharmGKB, patents) and attach it to findings. In the demo this is simulated as curated reference cards beneath each finding.

### Key files
- `frontend/src/components/EvidenceBase.tsx` — the literature evidence cards
- `frontend/src/app/brain/pathways/page.tsx` — MinCut pathway visualisation
- `frontend/src/app/brain/memories/page.tsx` — stored HNSW vector memories

---

## Layer 3 — Neural Classification (ruv-FANN + Agentic Diffusion)

### Concepts

**ruv-FANN** — A pure-Rust reimplementation of the Fast Artificial Neural Network library. It supports feedforward networks, cascade correlation (topology that grows during training), and the RProp training algorithm. In the codebase it classifies variants as Benign / Likely Benign / VUS / Likely Pathogenic / Pathogenic based on their k-mer context vectors.

**Feedforward network** — The classic neural network: input layer → hidden layers → output layer. Each connection has a weight; the forward pass is a series of matrix multiplications + activation functions (sigmoid, ReLU). Training adjusts weights to minimise prediction error.

**Cascade correlation** — Rather than fixing the network architecture upfront, this algorithm starts with a minimal network and adds hidden neurons one at a time, only when they maximally reduce the residual error. The result is the *smallest* network that can solve the task.

**RProp (Resilient Backpropagation)** — A training algorithm that only uses the sign of the gradient (not its magnitude) to update weights. This makes it faster and more stable than vanilla gradient descent for small-to-medium networks.

**Agentic Diffusion** — A diffusion model (similar in spirit to image diffusion models like Stable Diffusion) applied to molecular generation. Given a drug target protein, it generates candidate molecular structures as SMILES strings. Each candidate comes with a predicted binding affinity and toxicity score.

**SMILES notation** — Simplified Molecular Input Line Entry System. A compact text representation of molecular structure. For example: `CC(=O)Nc1ccc(O)cc1` is paracetamol. The notation encodes atoms, bonds, branches, and ring structures.

### Key files
- `frontend/src/components/MoleculeCard.tsx` — SMILES candidate display
- `frontend/src/app/brain/pathways/page.tsx` — Agentic Diffusion molecule candidates
- Spec: `docs/speckit-specs/features/feature-005-neural-layer-fann.md`

---

## Layer 4 — Bayesian Learning + Temporal Attractor

### Concepts

**Bayesian inference** — The process of updating a probability distribution (the *prior*) as new data arrives, yielding a *posterior* distribution. In the codebase, each genomic trait (e.g., "variant pathogenicity for HBB E6V") has a prior stored as a Beta distribution. Every new analysis run updates that prior. Over time the system becomes more confident.

**Beta distribution** — A probability distribution over the range [0,1], parameterised by α and β. `Beta(19,1)` means "we've seen 19 confirmations and 1 disconfirmation" — very high confidence. `Beta(1,1)` is a uniform prior — total uncertainty. The learning page shows priors like `Beta(9,2)` for the CYP2D6 poor metabolizer pattern.

**Prior vs posterior** — The prior is your belief *before* seeing data. The posterior is your updated belief *after*. The likelihood (how probable the data is given the hypothesis) is the bridge. This is exactly the formula: `P(H|D) ∝ P(D|H) × P(H)`.

**Savant AI** — A Rust framework for trait-based probabilistic reasoning. It stores long-term patterns, updates priors incrementally, and provides meta-cognitive confidence scoring — essentially the "memory" that persists across analysis runs.

**Temporal Attractor Studio (FTLE)** — Finite-Time Lyapunov Exponents (FTLEs) measure how fast nearby trajectories in a dynamical system diverge. In disease modelling, each patient's genomic state is a point in a high-dimensional space, and FTLE quantifies how *unstable* their trajectory is — i.e., how likely they are to transition to a disease state. The codebase uses this to project BRCA1, HBB, CYP2D6, and INS risk curves over 5/10/20-year horizons with confidence bands.

**Disease trajectory chart** — Built with Recharts `AreaChart` + confidence bands (upper/lower bounds as filled areas). Inflection points (e.g., "screening recommended at age 50") are flagged as `ReferenceDot` markers.

### Key files
- `frontend/src/components/DiseaseTrajectory.tsx` — trajectory chart component
- `frontend/src/components/EpigeneticClock.tsx` — Horvath clock display
- `frontend/src/app/brain/learning/page.tsx` — Bayesian priors + learned patterns
- Spec: `docs/speckit-specs/features/feature-004-brain-learning.md`

---

## Layer 5 — Decision / Advisory + Pharmacogenomics

### Concepts

**CYP2D6 star alleles** — CYP2D6 is the gene encoding cytochrome P450 2D6, the liver enzyme responsible for metabolising ~25% of all drugs. Variants are named as star alleles (*1 = normal, *4 = non-functional, *10 = reduced function, xN = gene duplication → ultra-rapid). The codebase calls `pharma::call_star_allele()` on a list of variants to assign an allele.

**Metaboliser phenotype** — Combining two alleles gives a phenotype:
- *1/*1 → Normal Metaboliser
- *1/*4 → Intermediate Metaboliser
- *4/*4 → Poor Metaboliser
- *1/*xN → Ultrarapid Metaboliser

**GLP-1 receptor agonists** — Glucagon-like peptide-1 agonists (semaglutide = Ozempic/Wegovy, liraglutide = Victoza) are a class of diabetes/obesity drugs. They stimulate insulin release and suppress appetite. Semaglutide is Novo Nordisk's flagship product. The codebase surfaces dosing recommendations based on CYP2D6 status.

**CPIC / PharmGKB** — Clinical Pharmacogenetics Implementation Consortium (CPIC) publishes evidence-graded dosing guidelines. PharmGKB is a database of drug-gene interactions. Level 1A = strongest evidence, Level 4 = weakest. The advisory layer cites these levels.

**Multi-expert Advisory panel** — The `/brain/advisory` page simulates a clinical case conference with three AI + human experts (Dr. Chen in Copenhagen, Dr. Okafor in Princeton, Dr. Sharma in Bangalore). Each expert submits a verdict: Concur / Concur with Caveat / Modify / Disagree. A consensus score is computed dynamically.

**Reasoning chain** — Every recommendation exposes its full derivation: sequence → variant call → star allele → phenotype → drug recommendation. This is the explainability layer required for regulated clinical AI.

### Key files
- `frontend/src/components/PharmaDashboard.tsx` — CYP2D6 + GLP-1 panel
- `frontend/src/app/brain/advisory/page.tsx` — multi-expert case conference
- `frontend/src/lib/static-data.ts` — pharmaData with semaglutide/liraglutide recs

---

## Layer 6 — SAFLA Safety Validation

### Concepts

**SAFLA (Self-Aware Feedback Loop Architecture)** — A safety validation framework for autonomous AI systems. It wraps every output in four checks before it surfaces to the user:

1. **Confidence threshold check** — If model confidence < 80%, flag for human review.
2. **Contraindication check** — Known drug-drug or drug-gene interactions that are absolute contraindications.
3. **Population coverage check** — Does the training data adequately represent the patient's demographic? Underrepresentation reduces reliability.
4. **Regulatory classification** — Is this covered by a CPIC Level A guideline? FDA PGx labelling?

**Audit ID** — Every validated output receives a unique identifier (e.g., `GEN-2026-03-17-CYP2D6-001`). This creates an immutable audit trail — essential for GMP (Good Manufacturing Practice) and clinical governance.

**Clinical override** — A human clinician can override a SAFLA-flagged output, but the override itself is logged. This is the "human in the loop" mechanism.

### Key files
- `frontend/src/components/EvidenceBase.tsx` — SAFLA badge + audit ID display
- `docs/genomic_one_spec.md` → Enhancement 6 section

---

## Deployment — Federated MCP

### Concepts

**Federated MCP (Model Context Protocol)** — A multi-node deployment architecture where each site runs its own genomic pipeline locally. Raw genomic data never leaves its jurisdiction; only anonymised vector embeddings are shared with the central intelligence layer. This satisfies GDPR Article 44 (data transfer restrictions).

**Nodes**: Copenhagen (GDPR/DK), Princeton + Seattle (HIPAA/US), Bangalore (PDPB/IN), Oxford (EU AI Act/UK).

**Why this matters** — Pharma companies operate globally. A patient's genomic data collected in Denmark cannot legally be processed on US servers without explicit consent. Federated architecture solves this by keeping compute local and intelligence global.

### Key files
- `frontend/src/app/brain/federation/page.tsx` — node status dashboard
- `docs/genomic_one_spec.md` → Enhancement 7 section

---

## The Five Genes — Why These?

| Gene | Function | Why clinically relevant |
|------|----------|------------------------|
| **HBB** | Haemoglobin beta chain | HBB E6V mutation causes sickle cell disease — a classic Mendelian variant ideal for demonstrating variant calling |
| **TP53** | Tumour suppressor | Most commonly mutated gene in human cancer; mutations impair DNA damage response |
| **BRCA1** | DNA repair (homologous recombination) | BRCA1 185delAG carriers have ~65% lifetime breast cancer risk; covered by NICE/NCCN guidelines |
| **CYP2D6** | Drug metabolism enzyme | Metabolises ~25% of all drugs; star allele status directly determines dosing for codeine, tamoxifen, and GLP-1 analogues |
| **INS** | Insulin | Central to type 2 diabetes risk; epigenetic drift at the INS locus is an early T2D biomarker |

---

## Tech Stack Summary

**Backend (Rust)**
- `rvdna` — genomic core (sequences, alignment, variants, epigenetics, pharmacogenomics)
- `axum` + `tokio` — async HTTP server
- `tokio-stream` — SSE streaming
- `rand` — synthetic data generation
- `serde` / `serde_json` — serialisation

**Frontend (TypeScript)**
- Next.js 16 + React 19
- HeroUI — component library
- Recharts — data visualisation (trajectories, heatmaps)
- Three.js — 3D protein contact graph, neural graph
- Framer Motion — transitions in the patient simulation wizard

**Deployment**
- GitHub Actions → GitHub Pages (static export, no backend)
- Backend required for live SSE streaming; Pages deploy falls back to `static-data.ts`

---

## Ideas for Novel Extensions

These are directions that build *on top of* the existing architecture rather than just extending it:

**1. Real 23andMe / VCF upload pipeline** — The backend already has `run_23andme()` in `main.rs`. The frontend has no upload UI yet. Wiring these together would make the tool personally meaningful to anyone with a consumer genomics test.

**2. Multi-gene polygenic risk scores** — The five genes are currently analysed independently. Combining their HNSW vectors into a single polygenic risk model (weighted sum of variant effect sizes) would allow population-level risk stratification — the backbone of most modern genome-wide association studies (GWAS).

**3. Live PubMed / OpenAlex API integration** — FACT currently uses curated static references. Replacing the evidence base with real-time API calls to PubMed or the open OpenAlex database would make the literature augmentation genuinely dynamic.

**4. Longitudinal patient simulation** — The Temporal Attractor model currently projects a single risk curve. Adding a "re-run at year 5" simulation (updating the methylation profile, re-running the Horvath clock, re-querying Bayesian priors) would demonstrate how the system learns over a patient's lifetime.

**5. Drug repurposing engine** — MinCut already identifies pathway bottleneck proteins. Cross-referencing those targets against existing approved drugs (via ChEMBL or DrugBank) to find candidates already known to bind those proteins would constitute a genuine drug repurposing workflow — a high-value pharma use case.

**6. Federated learning simulation** — Currently the federation is a UI diagram. Simulating actual gradient/embedding exchange between the five nodes (even with synthetic data) — where the global Bayesian prior improves as more nodes contribute — would make the federated story concrete and demonstrable.

**7. Explainability heatmap (SHAP for genomics)** — Adding SHAP (SHapley Additive exPlanations) values to the ruv-FANN variant classifier would show *which k-mer positions* drove the pathogenicity score. This is the kind of mechanistic explainability regulators increasingly require.

---

## Glossary of All Key Terms

| Term | One-line definition |
|------|---------------------|
| k-mer | A DNA substring of length k used as a feature vector unit |
| cosine similarity | Dot product of two vectors divided by the product of their magnitudes — measures directional closeness regardless of magnitude |
| HNSW | Approximate nearest-neighbour graph structure; O(log n) vector search |
| MinCut | Smallest edge set that disconnects a graph; finds pathway bottlenecks |
| PageRank | Node importance score based on weighted in-links; here applied to gene interaction networks |
| Smith-Waterman | Local sequence alignment algorithm using dynamic programming |
| Variant / SNP | A position where the observed base differs from the reference genome |
| Pileup | A column of all sequencing reads covering one genomic position |
| CIGAR string | Compact encoding of alignment operations (Match, Insertion, Deletion) |
| Protein translation | Converting a DNA codon sequence into an amino acid chain |
| Contact graph | Graph of amino acid pairs within a spatial distance threshold in a folded protein |
| Horvath clock | Epigenetic model predicting biological age from CpG methylation levels |
| CpG site | A cytosine followed by a guanine; the primary site of DNA methylation in mammals |
| Star allele | Named variant haplotype of a pharmacogene (e.g., CYP2D6 *4) |
| Metaboliser class | Phenotypic prediction from diplotype: Poor / Intermediate / Normal / Ultrarapid |
| CPIC | Clinical Pharmacogenetics Implementation Consortium — evidence-graded dosing guidelines |
| PharmGKB | Database of drug-gene interactions and variant annotations |
| GLP-1 RA | Glucagon-like peptide-1 receptor agonist — drug class including semaglutide, liraglutide |
| SMILES | Text encoding of a molecular structure |
| Bayesian prior | Probability distribution encoding belief before observing data |
| Beta distribution | Prior distribution over probabilities, parameterised by α (successes) and β (failures) |
| FTLE | Finite-Time Lyapunov Exponent — measures trajectory divergence rate in a dynamical system |
| SSE | Server-Sent Events — unidirectional HTTP streaming from server to browser |
| SAFLA | Self-Aware Feedback Loop Architecture — AI safety validation framework |
| Federated MCP | Multi-node deployment where raw data stays local, embeddings are shared globally |
| GDPR Art. 44 | EU data transfer restriction: personal data may not leave the EU without adequate protection |
| RVDNA | AI-native binary format storing sequence + pre-indexed k-mer vectors |
| Cascade correlation | Neural network training that grows topology by adding neurons on demand |
| RProp | Resilient backpropagation — sign-only gradient updates for stable training |
| Agentic Diffusion | Diffusion-based generative model for molecular structure generation |
| FACT | Fast Augmented Context Tools — deterministic literature retrieval via MCP + prompt caching |
| ruv-FANN | Pure-Rust neural network framework (feedforward + cascade) |
| RuVector | Rust vector database with HNSW, MinCut, and PageRank |
| Savant AI | Bayesian trait-learning framework for long-term pattern recognition |
| Temporal Attractor | Studio for modelling disease trajectories using FTLE dynamics |
