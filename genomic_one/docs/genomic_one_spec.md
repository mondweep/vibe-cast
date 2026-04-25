# genomic_one — Enhancement Spec
# Pass this entire document to Claude Code

## OBJECTIVE
Enhance genomic_one from a 5-layer to a 7-layer genomic intelligence platform,
adding real-time streaming, FACT-augmented literature retrieval, Agentic Diffusion
molecule generation, Temporal Attractor disease progression modelling, SAFLA safety
validation, CYP2D6/GLP-1 pharmacogenomics panel, and Federated MCP deployment
architecture. The goal is a compelling, production-grade demo for a pharma enterprise
AI audience — specifically relevant to Novo Nordisk's R&D, manufacturing, and
clinical operations.

## EXISTING STACK (do not break)
- Layer 1: rvdna (genomic core — variant calling, protein translation, epigenetic clock, pharmacogenomics)
- Layer 2: RuVector (HNSW similarity search, k-mer indexing, MinCut pathway analysis)
- Layer 3: ruv-FANN (neural classification — variant pathogenicity scoring)
- Layer 4: Savant AI (Bayesian trait-based probabilistic reasoning)
- Layer 5: Decision/Advisory (multi-signal synthesis, drug target identification)
- Frontend: Next.js 16, React 19, HeroUI, Recharts, Three.js
- Backend: Axum, Tokio, Rust
- Deploy: GitHub Pages (static export)
- Gene panels: HBB, TP53, BRCA1, CYP2D6, INS (real human sequences)

## COMPLETE ARCHITECTURE DIAGRAM

This diagram must be rendered as an interactive in-app panel at /brain/architecture
AND included in the README. Claude Code should implement this as a visual component
using D3.js or Three.js (already in stack), as well as preserving the ASCII version
in the README.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                     GENOMIC ONE — AI-NATIVE GENOMIC INTELLIGENCE                    ║
║                     7-Layer Architecture + Federated Deployment                      ║
║                     Built in Rust · Demo Environment · March 2026                   ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 INPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  Raw DNA/RNA    │  │  23andMe / VCF  │  │  Clinical Trial │  │  Literature /   │
  │  Sequence       │  │  File Upload    │  │  Data Feed      │  │  Patent Feed    │
  │  (FASTA/FASTQ)  │  │                 │  │  (SSE Stream)   │  │  (FACT Cache)   │
  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
           │                   │                     │                     │
           └───────────────────┴─────────────────────┴─────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 1 — GENOMIC CORE + REAL-TIME STREAMING
 Technology: rvdna (Rust) + MidStream (SSE/Axum)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │  rvdna Pipeline                                                MidStream (SSE)   │
  │                                                                                  │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
  │  │  Sequence    │  │  Variant     │  │  Protein     │  │  Epigenetic Clock    │ │
  │  │  Alignment   │→ │  Calling     │→ │  Translation │→ │  (Horvath Clock)     │ │
  │  │  Smith-Water │  │  Pileup      │  │  HBB→Hgb-β  │  │  Biological Age Est. │ │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
  │                                                                                  │
  │  Gene Panels: HBB · TP53 · BRCA1 · CYP2D6 · INS                                │
  │  K-mer: 11-mer frequency vectors (512 dimensions)                                │
  │  Format: RVDNA binary (AI-native, pre-indexed k-mer vectors)                    │
  │                                                                                  │
  │  ◉ MidStream: Results stream via SSE to frontend in real time (<200ms latency)  │
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │  Streaming output →     │
                              │  Frontend live update   │
                              └────────────┬────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 2 — VECTOR INTELLIGENCE + LITERATURE AUGMENTATION
 Technology: RuVector (HNSW + MinCut + sublinear PageRank) + FACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                  │
  │  ┌──────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐│
  │  │  HNSW Similarity     │    │  MinCut Pathway      │    │  FACT Literature     ││
  │  │  Search              │    │  Analysis            │    │  Augmentation        ││
  │  │                      │    │                      │    │                      ││
  │  │  · K-mer vector DB   │    │  · Drug target ID    │    │  · PubMed retrieval  ││
  │  │  · Cosine similarity │    │  · Pathway scoring   │    │  · Patent search     ││
  │  │  · Sequence matching │    │  · Graph partitions  │    │  · PharmGKB lookup   ││
  │  │  · Variant clusters  │    │  · Min-cut edges     │    │  · Prompt caching    ││
  │  │                      │    │  → Target proteins   │    │  · MCP tool exec     ││
  │  └──────────────────────┘    └─────────────────────┘    └──────────────────────┘│
  │           │                           │                           │              │
  │           └───────────────────────────┴───────────────────────────┘              │
  │                                       │                                          │
  │                         sublinear PageRank scoring                               │
  │                         (pathway importance ranking)                             │
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 3 — NEURAL CLASSIFICATION + MOLECULE GENERATION
 Technology: ruv-FANN (Rust FANN) + Agentic Diffusion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                  │
  │  ┌──────────────────────────────────┐    ┌─────────────────────────────────────┐│
  │  │  ruv-FANN Neural Networks        │    │  Agentic Diffusion                  ││
  │  │                                  │    │  Molecule Generation                 ││
  │  │  · Variant pathogenicity score   │    │                                      ││
  │  │  · Gene expression forecasting   │    │  Input: drug target (from MinCut)   ││
  │  │  · Cascade network propagation   │    │  Output: candidate SMILES strings   ││
  │  │  · Multi-layer perceptron        │    │                                      ││
  │  │  · Continuous learning engine    │    │  · Binding affinity prediction      ││
  │  │                                  │    │  · Toxicity risk scoring             ││
  │  │  Score output (0.0–1.0):         │    │  · Structural similarity to known   ││
  │  │  Benign / VUS / Pathogenic       │    │    approved drugs (%)               ││
  │  └──────────────────────────────────┘    └─────────────────────────────────────┘│
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 4 — BAYESIAN LEARNING + TEMPORAL DISEASE PROGRESSION
 Technology: Savant AI + Temporal Attractor Studio (FTLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                  │
  │  ┌──────────────────────────────────┐    ┌─────────────────────────────────────┐│
  │  │  Savant AI — Bayesian Learning   │    │  Temporal Attractor Studio          ││
  │  │                                  │    │  Disease Progression Modelling       ││
  │  │  · Trait-based probabilistic     │    │                                      ││
  │  │    reasoning                     │    │  FTLE (Finite-Time Lyapunov Exp.)   ││
  │  │  · Long-term pattern recognition │    │  · 5 / 10 / 20 year risk horizons   ││
  │  │  · Meta-cognition layer          │    │  · Confidence band projection        ││
  │  │  · Prior updating per data point │    │  · Age-related inflection points     ││
  │  │  · Grows smarter with each run   │    │                                      ││
  │  │                                  │    │  Gene trajectories:                  ││
  │  │  Acts as the Digital Twin        │    │  BRCA1 → cancer risk curve          ││
  │  │  equivalent for R&D modelling    │    │  HBB   → sickle cell progression    ││
  │  │                                  │    │  CYP2D6→ metabolism age curve       ││
  │  │                                  │    │  INS   → T2D risk trajectory        ││
  │  └──────────────────────────────────┘    └─────────────────────────────────────┘│
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 5 — DECISION / ADVISORY + PHARMACOGENOMICS
 Technology: Custom multi-signal synthesis · CYP2D6/GLP-1 clinical decision engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                  │
  │  ┌─────────────────────────────┐   ┌──────────────────────────────────────────┐ │
  │  │  Drug Target Identification │   │  CYP2D6 / GLP-1 Pharmacogenomics        │ │
  │  │                             │   │                                          │ │
  │  │  · MinCut pathway targets   │   │  Star Allele → Metabolizer Class:       │ │
  │  │  · FANN pathogenicity score │   │  *1/*1  → Normal Metabolizer   GREEN    │ │
  │  │  · Savant prior weighting   │   │  *1/*4  → Intermediate         AMBER    │ │
  │  │  · Temporal risk horizon    │   │  *4/*4  → Poor Metabolizer     RED      │ │
  │  │  · Literature evidence base │   │  *1/*xN → Ultrarapid           BLUE     │ │
  │  │                             │   │                                          │ │
  │  │  Output:                    │   │  Semaglutide (Ozempic/Wegovy):          │ │
  │  │  Ranked drug target list    │   │  Dosing rec · Monitoring · CPIC tier    │ │
  │  │  + confidence scores        │   │  Full reasoning chain (explainable)     │ │
  │  └─────────────────────────────┘   └──────────────────────────────────────────┘ │
  │                                                                                  │
  │  All outputs include: source layers · confidence % · evidence references        │
  │  Full reasoning chain traceable back through Layers 1-4                         │
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 6 — SAFLA SAFETY VALIDATION
 Technology: SAFLA (github.com/ruvnet/SAFLA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │  Every advisory output passes through SAFLA before surfacing to the user        │
  │                                                                                  │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
  │  │  Confidence  │  │ Contraindic- │  │  Population  │  │  Regulatory          ││
  │  │  Threshold   │  │ ation Check  │  │  Coverage    │  │  Classification      ││
  │  │  Check       │  │              │  │  Check       │  │  Check               ││
  │  │  Flag if     │  │  Known drug- │  │  Flag if     │  │  CPIC Level A/B      ││
  │  │  model conf  │  │  drug inter- │  │  training    │  │  PharmGKB 1A-3       ││
  │  │  < 80%       │  │  action det. │  │  data under- │  │  FDA PGx labelling   ││
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘│
  │         └─────────────────┴─────────────────┴──────────────────────┘            │
  │                                       │                                          │
  │                          ┌────────────┴────────────┐                            │
  │                          │  SAFLA Validation Result │                            │
  │                          │  PASSED (green)          │                            │
  │                          │  PASSED w/ WARNING       │                            │
  │                          │  FLAGGED - Human review  │                            │
  │                          │  Audit ID generated      │                            │
  │                          │  Override mechanism      │                            │
  │                          └──────────────────────────┘                            │
  └──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OUTPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Variant Pathogenicity · Drug Target Candidates · Molecule Generation (SMILES)
  Disease Trajectory (5/10/20yr) · CYP2D6/GLP-1 Dosing Rec · SAFLA Audit Badge
  FACT Evidence Base (per finding: papers/patents/PharmGKB · relevance scored)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DEPLOYMENT — FEDERATED MCP (MULTI-SITE · GDPR-COMPLIANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌─────────────────────────────────────┐
                    │   FEDERATED MCP ORCHESTRATION LAYER  │
                    │   Global intelligence · Model sync   │
                    │   Anonymised embeddings only         │
                    └──────────────────┬──────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
  ┌───────────────┐          ┌───────────────┐           ┌───────────────┐
  │  Node: CPH    │          │  Node: US-E   │           │  Node: IND    │
  │  Copenhagen   │          │  Princeton NJ │           │  Bangalore    │
  │  Denmark      │          │  + Seattle WA │           │               │
  │  GDPR Art.44  │          │  HIPAA        │           │  PDPB         │
  │  Data in DK   │          │  Data in US   │           │  Data in IN   │
  │  rvdna core   │          │  rvdna core   │           │  rvdna core   │
  │  SAFLA local  │          │  SAFLA local  │           │  SAFLA local  │
  └───────────────┘          └───────────────┘           └───────────────┘
          │                            │                            │
          └────────────────────────────┼────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │  Node: UK · Oxford + Node: CH Zurich │
                    │  EU AI Act compliant                 │
                    └─────────────────────────────────────┘

  Raw genomic data NEVER leaves node jurisdiction
  Only anonymised embeddings traverse nodes
  Intelligence compounds globally · Privacy guaranteed locally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DATA FLOW — END TO END
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  RAW INPUT → [L1] rvdna + MidStream (SSE stream → frontend live)
           → [L2] RuVector HNSW + MinCut + FACT literature
           → [L3] ruv-FANN scoring + Agentic Diffusion molecules
           → [L4] Savant Bayesian + Temporal Attractor trajectory
           → [L5] Multi-signal synthesis + CYP2D6/GLP-1 pharmacogenomics
           → [L6] SAFLA validation → PASSED / WARNING / FLAGGED
           → OUTPUT surfaces to dashboard with full audit trail
           → Federated MCP syncs anonymised embeddings globally
           → Bayesian priors update → loop closes → model improves

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TECH STACK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Rust: rvdna · MidStream · RuVector · ruv-FANN · Savant AI
        Temporal Attractor · SAFLA · Federated MCP · Axum/Tokio · FACT
  Frontend: Next.js 16 · React 19 · HeroUI · Recharts · Three.js · D3.js
  Regulatory: CPIC · PharmGKB · FDA PGx · GDPR Art.44 · EU AI Act · GMP
  Deploy: GitHub Pages (static) · Federated MCP (multi-node production target)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ALL DATA IS SIMULATED · DEMO ENVIRONMENT · NO REAL PATIENT DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ENHANCEMENT 1 — CYP2D6 / GLP-1 PHARMACOGENOMICS PANEL (HIGHEST PRIORITY)

### Purpose
Directly mirrors Novo Nordisk's semaglutide (Ozempic/Wegovy) product line.
Demonstrates pharma-specific clinical decision support.

### What to build
Add a dedicated Pharmacogenomics panel to the frontend dashboard with:

**CYP2D6 Star Allele Classification**
- Display star allele genotype (e.g., *1/*4, *1/*1, *4/*4, *1/*10)
- Classify into: Poor Metabolizer / Intermediate Metabolizer / Normal Metabolizer / Rapid Metabolizer / Ultrarapid Metabolizer
- Visual indicator: red (Poor) / amber (Intermediate) / green (Normal) / blue (Rapid/Ultrarapid)

**GLP-1 Specific Drug Recommendation**
Format the output as a clinical decision card:
```
CYP2D6 Metabolizer Status: Intermediate (*1/*4)
Drug: Semaglutide (Ozempic / Wegovy)
Recommendation: Standard dosing appropriate. Monitor for elevated
plasma concentration at treatment initiation. Consider reduced
titration schedule if GI adverse effects observed.
Interaction Severity: ⬤ LOW — No dose adjustment required
Evidence Level: PharmGKB Level 2A
```

**Drug-Gene Interaction Risk Panel**
Show a simple risk matrix for Novo's key drugs:
| Drug | Gene | Interaction | Risk Level |
|------|------|-------------|------------|
| Semaglutide | CYP2D6 | Metabolism | Low |
| Insulin (HBB variants) | HBB | Efficacy | Monitor |
| Liraglutide | CYP3A4 | Metabolism | Moderate |

**Reasoning Chain**
Always show the full reasoning chain beneath the recommendation:
- Sequence input → variant called → star allele assigned → metabolizer class → drug recommendation
- This supports the responsible AI / explainability requirement

### Data
Use simulated/synthetic data — clearly labelled "Simulated Data — Demo Environment"
Do not use real patient data.

---

## ENHANCEMENT 2 — MIDSTREAM REAL-TIME STREAMING

### Purpose
Live dashboard updates as analysis runs — the "Tesla floor" visual metaphor.
Makes the demo viscerally impressive vs static batch output.

### What to build
- Integrate MidStream (https://github.com/ruvnet/midstream) or implement
  equivalent Rust-native SSE (Server-Sent Events) via Axum
- Stream analysis results from the backend to the frontend in real time:
  - Variant calling results appear as they are processed
  - K-mer similarity scores update live
  - Pathway analysis nodes light up progressively on the graph
  - FANN scoring updates tick by tick
- Add a "Live Analysis" indicator / pulse animation when streaming is active
- Add a progress bar per gene panel (HBB, TP53, BRCA1, CYP2D6, INS)
- Latency target: first result visible within 200ms of analysis start

### Frontend
- Use EventSource API or WebSocket depending on Axum implementation
- Animate incoming results with subtle fade-in / slide-in transitions
- Add a "Streaming Active" badge in the dashboard header

---

## ENHANCEMENT 3 — FACT LITERATURE AUGMENTATION

### Purpose
Every finding is augmented with relevant scientific papers, patents, and
clinical reports — retrieved instantly. Turns the tool from an analyser
into a research partner.

### Reference
FACT: https://github.com/ruvnet/FACT
"Fast Augmented Context Tools — replaces RAG with prompt caching and
deterministic MCP tool execution"

### What to build
- For each significant finding (variant called, drug target identified,
  pharmacogenomic recommendation), surface 2-3 relevant references
- References should include: paper title, journal/source, year, relevance score
- Use simulated/curated reference data for the demo — clearly labelled
- Format as a collapsible "Evidence Base" panel beneath each finding:

```
▼ Evidence Base (3 sources)
  [1] "CYP2D6 pharmacogenomics of GLP-1 receptor agonists" — PMID 38291045 (2024) ★★★★
  [2] "Semaglutide metabolism pathways in type 2 diabetes" — NEJM 2023 ★★★
  [3] "PharmGKB CYP2D6 annotation" — PharmGKB 2024 ★★★★★
```

- Add a "FACT-Augmented" badge to panels that include literature retrieval
- Future hook: connect to real PubMed API or PharmGKB API when moving to production

---

## ENHANCEMENT 4 — AGENTIC DIFFUSION MOLECULE GENERATION

### Purpose
Move from analysis to generation — the frontier of AI drug discovery.
Given a drug target, propose candidate molecular structures.

### Reference
Agentic Diffusion: https://github.com/ruvnet/agentic-difusion

### What to build
- Add a "Molecule Generation" panel to the Brain/Advisory section
- Input: drug target identified by MinCut pathway analysis (e.g., "BRCA1 repair pathway")
- Output: 3 candidate molecular structures with:
  - SMILES notation (simplified molecular-input line-entry system)
  - Predicted binding affinity score (simulated)
  - Predicted toxicity flag: Low / Moderate / High
  - Structural similarity to known approved drugs (%)

- Visualise molecules using a SMILES renderer (use rdkit.js or similar JS library
  available via CDN, or render as ASCII structural diagram if unavailable)
- Add a "Generated by Agentic Diffusion" attribution badge
- Use simulated output for demo — clearly labelled

### Example output card
```
Candidate 1: CC(=O)Nc1ccc(O)cc1
Binding Affinity: 8.2 kcal/mol (predicted)
Toxicity Risk: LOW
Similarity to Metformin: 34%
Target: BRCA1 DNA repair pathway
```

---

## ENHANCEMENT 5 — TEMPORAL ATTRACTOR DISEASE PROGRESSION

### Purpose
Longitudinal patient intelligence — models how variants manifest over time.
Differentiates from point-in-time analysis. Combined with Epigenetic Clock,
creates a powerful patient trajectory view.

### Reference
Temporal Attractor Studio: https://crates.io/crates/temporal-attractor-studio
"Real FTLE calculation and temporal dynamics prediction with VP-tree optimization"

### What to build
- Add a "Disease Trajectory" panel to the dashboard
- Input: patient genomic profile (variant set + epigenetic age from existing Layer 1)
- Output: a time-series projection (5, 10, 20 year horizons) showing:
  - Probability of phenotypic expression for key variants
  - Risk trajectory curve (line chart via Recharts)
  - Key inflection points flagged on the timeline

- For BRCA1: show breast/ovarian cancer risk trajectory by age decade
- For HBB: show sickle cell severity progression model
- For CYP2D6: show age-related metabolism change curve
- For INS: show T2D risk trajectory based on epigenetic age

- Visualise as: a Recharts LineChart with confidence bands (area fill)
- Add "Temporal Attractor Model" attribution
- Use simulated projections — clearly labelled with confidence intervals

### Example trajectory display
```
BRCA1 *185delAG Carrier — Cancer Risk Trajectory
Age 30: 8% cumulative risk
Age 40: 19% cumulative risk
Age 50: 35% cumulative risk ⚠ Screening recommended
Age 60: 52% cumulative risk 🔴 High risk threshold
[Recharts area chart with confidence bands]
```

---

## ENHANCEMENT 6 — SAFLA SAFETY VALIDATION LAYER

### Purpose
Every advisory output passes through a safety validation gate before surfacing
to the user. The audit trail, override mechanism, and governance layer that
regulated clinical environments require. The responsible AI story made concrete.

### Reference
SAFLA: https://github.com/ruvnet/SAFLA
"Production-ready autonomous AI system with hybrid memory, meta-cognitive
reasoning, MCP integration, and comprehensive safety validation"

### What to build
- Add a SAFLA validation step to the advisory output pipeline
- Every recommendation displays a SAFLA validation badge showing:

```
✓ SAFLA Validated
Safety Check: PASSED
Audit ID: GEN-2026-03-17-CYP2D6-001
Confidence: 94.2%
Override available: [Clinical Override →]
Regulatory Standard: PharmGKB / CPIC Level A
```

- Validation checks to simulate:
  1. Confidence threshold check (flag if model confidence < 80%)
  2. Contraindication check (flag known drug-drug interactions)
  3. Population coverage check (flag if training data underrepresents patient demographic)
  4. Regulatory classification check (CPIC / PharmGKB guideline tier)

- Add a SAFLA validation log panel in the Brain section showing recent validations
- Colour code: green (passed), amber (passed with warning), red (flagged — human review required)
- Add "Powered by SAFLA" attribution

---

## ENHANCEMENT 7 — FEDERATED MCP DEPLOYMENT ARCHITECTURE

### Purpose
Architecture diagram and UI indicator showing federated multi-site deployment.
GDPR-compliant by architecture — each site's data stays local, intelligence is global.

### Reference
Federated MCP: https://github.com/ruvnet/federated-mcp

### What to build
- Add a "Deployment Architecture" panel to the dashboard (or About/Info section)
- Show an interactive diagram of the federated node structure:
  - Nodes: Copenhagen (DK), Princeton (US), Seattle (US), Bangalore (IN), Oxford (UK)
  - Each node: local genomic data processing, local SAFLA validation
  - Central: intelligence layer, Federated MCP orchestration, shared model updates
  - Data flow: local → analysis → anonymised embeddings → global intelligence layer
  - Data residency: clearly labelled per node ("Data stays in DK", "Data stays in US")

- Visualise using a D3.js or Three.js node graph (already in stack)
- Add a "Federated MCP" badge in the dashboard header
- Add a live "Nodes Active" indicator (simulated): 5/5 nodes connected

- Key callout text in the panel:
  "Genomic data never leaves its jurisdiction. Intelligence compounds globally.
   GDPR Article 44 compliant by architecture."

---

## DASHBOARD LAYOUT UPDATES

### Updated Brain Sidebar Routes
```
/brain/memories     → RuVector stored memories, FACT literature cache
/brain/learning     → Bayesian priors, Temporal Attractor trajectories, model status
/brain/pathways     → MinCut pathway analysis, Agentic Diffusion molecule candidates
/brain/advisory     → SAFLA-validated recommendations, CYP2D6/GLP-1 panel
/brain/federation   → Federated MCP node status, deployment architecture
```

### Dashboard Header Updates
Add status badges:
- ● MidStream Live (green pulse when streaming)
- ✓ SAFLA Active
- ⬡ 5/5 Nodes Connected
- FACT-Augmented

### Architecture Diagram
Update the README and add an in-app architecture view showing:
```
┌─────────────────────────────────────────────────────┐
│  Deployment: Federated MCP (5 nodes, GDPR-compliant) │
│  ───────────────────────────────────────────────────  │
│  Layer 6: SAFLA Safety Validation                     │
│  ───────────────────────────────────────────────────  │
│  Layer 5: Decision / Advisory (GLP-1 Pharmacogenomics)│
│  ───────────────────────────────────────────────────  │
│  Layer 4: Bayesian + Temporal Attractor (FTLE)        │
│  ───────────────────────────────────────────────────  │
│  Layer 3: ruv-FANN + Agentic Diffusion (Molecules)    │
│  ───────────────────────────────────────────────────  │
│  Layer 2: RuVector/MinCut + FACT (Literature)         │
│  ───────────────────────────────────────────────────  │
│  Layer 1: rvdna + MidStream (Real-time Streaming)     │
└─────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PRIORITY ORDER

1. CYP2D6 / GLP-1 pharmacogenomics panel (Enhancement 1) — do this first
2. SAFLA safety validation badges (Enhancement 6) — highest narrative impact
3. MidStream real-time streaming (Enhancement 2) — visual demo impact
4. FACT literature augmentation (Enhancement 3) — depth signal
5. Temporal Attractor disease progression (Enhancement 5) — differentiation
6. Agentic Diffusion molecule generation (Enhancement 4) — frontier signal
7. Federated MCP architecture diagram (Enhancement 7) — enterprise deployment story

---

## IMPORTANT NOTES FOR CLAUDE CODE

- All generated/simulated data must be clearly labelled: "Simulated Data — Demo Environment"
- Do not use real patient data under any circumstances
- Maintain the existing GitHub Pages deployment pipeline (static export)
- Do not break existing functionality — all current panels must continue to work
- The app must remain deployable via: cd frontend && npm run build
- Keep the Rust backend compilable: cargo build must succeed
- Use only CDN-available JS libraries for the frontend (no new npm packages
  that would break the static export unless absolutely necessary)
- Add "Demo Environment" banner to the dashboard header
- Target: impressive enough to demo live in a 30-minute executive interview
- Live URL: https://cmcgrath2023.github.io/genomic_one/

---

## CONTEXT FOR CLAUDE CODE

This application is being built as a demonstration of AI-native genomic
intelligence for a VP-level interview at Novo Nordisk — a global pharmaceutical
company whose products include semaglutide (Ozempic/Wegovy) for diabetes and
obesity. The interviewer will likely have pharma industry background.

The goal is to show that the candidate (Chris McGrath) understands:
1. How AI can reshape drug discovery and R&D
2. Responsible AI / safety validation in regulated environments
3. Real-time operational intelligence (the Tesla floor analogy)
4. GDPR-compliant federated architecture for global pharma operations
5. The frontier of AI-native drug development (molecule generation)

Make it impressive. Make it accurate to the domain. Make it deployable.
