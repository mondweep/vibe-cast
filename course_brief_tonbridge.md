# Genomics, AI & Mathematical Biology
## Course Brief — IB Years 12 & 13

**Proposed for Tonbridge Grammar School**
Proposed by Mondweep Chakravorty · mondweep@dxsure.uk
April 2026

---

> **The Big Idea:** Mathematics and biology are not separate subjects. Every life-saving drug, every cancer diagnosis, every personalised medicine begins with a mathematician and a biologist speaking the same language. This session gives students the vocabulary to join that conversation.

---

## 1. Overview

This proposal outlines a guest session of approximately 3 hours (adaptable to a half-day or a double-lesson pair) aimed at IB Biology HL and IB Mathematics (AA or AI) students in Years 12 and 13.

The session is built around a real open-source genomic intelligence platform — **Genomic One** — which implements a seven-layer AI pipeline in Rust, running real human gene sequences through statistical analysis, machine learning, and Bayesian inference to produce pharmacogenomic clinical recommendations. Students will explore the platform's live interface, trace the mathematics underpinning each layer, and work through guided hands-on exercises.

No prior programming experience is required. Students need only curiosity, a browser, and a willingness to ask "what does this number actually mean?"

| Detail | Information |
|--------|-------------|
| Target audience | IB Years 12 & 13 (Biology HL, Maths AA / AI) |
| Recommended size | Up to 30 students |
| Duration | 3 hours (flexible: 2× 90-min lessons or half-day) |
| Location | Computer room or BYOD with browser access |
| Cost | No charge — voluntary educational outreach |
| Prerequisites | None beyond standard IB Biology and Maths |

---

## 2. Learning Objectives

By the end of the session, students will be able to:

1. **Explain what a DNA sequence is** and how a short segment encodes the instructions for a protein, connecting this to IB Biology Option D (Human Physiology) and the molecular biology core topic.
2. **Describe the Bayesian probability framework** in plain language and apply Bayes' theorem to a simple genomic example, connecting P(H|D) to the concept of conditional probability in IB Mathematics.
3. **Understand what a neural network is** and how it classifies a genetic variant as benign or pathogenic, linking this to the idea of a function and a weighting scheme they already know from mathematics.
4. **Interpret a disease trajectory chart** with confidence bands, explaining what the shaded region represents statistically and why a "38% T2D risk at age 55" is not a certainty.
5. **Read a pharmacogenomic recommendation** (e.g. CYP2D6 star allele → semaglutide dosing) and trace the full reasoning chain from DNA sequence to clinical decision.
6. **Articulate at least two career pathways** at the intersection of mathematics and biology, and name one university course or research group in the UK they would like to explore further.

---

## 3. IB Curriculum Connections

This session is designed to reinforce and extend existing IB content, not replace it. Every concept is anchored in something students have already encountered.

### IB Biology HL

| IB Topic | Concept in This Session | Where It Appears |
|----------|------------------------|------------------|
| 2.6 — Structure of DNA | Real HBB, TP53, BRCA1, CYP2D6 sequences | Gene Panel, Layer 1 |
| 2.7 — DNA Replication | Variant calling: detecting where copies differ | Pileup / SNP detection |
| 3.4 — Inheritance | Star allele diplotypes (*1/*4) → metaboliser class | CYP2D6 pharmacogenomics |
| 7.2 — Transcription / Translation | Protein translation: HBB → haemoglobin beta | Layer 1 pipeline |
| Option D — Human Physiology | Sickle cell HBB E6V, GLP-1 drug recommendations | Pharma Dashboard, Layer 5 |
| B.5 — Neurobiology | Neural network architecture as a biological metaphor | Layer 3, ruv-FANN |

### IB Mathematics AA / AI

| IB Topic | Concept in This Session | Where It Appears |
|----------|------------------------|------------------|
| Probability & statistics | Bayes' theorem, conditional probability P(H\|D) | Layer 4, Savant AI |
| Vectors (SL/HL) | K-mer vectors, cosine similarity, 512-dimensional space | Layer 2, HNSW search |
| Functions & modelling | Disease trajectory curves, confidence intervals | Layer 4, Temporal Attractor |
| Algorithms (AI SL) | Neural network as a weighted function composition | Layer 3, ruv-FANN |
| Graph theory (HL) | Gene interaction graph, minimum cut, pathway analysis | Layer 2, MinCut |
| Statistics (HL) | Beta distribution as a Bayesian prior | Layer 4, prior updating |

---

## 4. Session Plan

The session is structured in four blocks. It can be delivered across two 90-minute lessons with a break in the middle, or as a contiguous 3-hour workshop.

---

### Block A — DNA to Data (45 minutes)

#### Introduction: What is a genome?

Opening with a provocation: *"If I gave you a 430-character string of A, C, G, and T — could you read someone's future?"* Students are shown the real HBB coding sequence on screen. We discuss what each base means, what a codon is, and how a single base change (A→T at position 20) causes sickle cell disease — one of the most studied genetic conditions in the world.

> **Hands-on Exercise A1 — Spot the Variant**
>
> Students are given two printed sequences (HBB reference vs. HBB E6V mutant) and asked to find the single-base difference. They then look up the amino acid it encodes and compare Valine vs. Glutamic acid. Discussion: why does a single amino acid change cause the haemoglobin protein to polymerise and distort the red blood cell?

#### K-mer vectors: turning biology into mathematics

We introduce the idea that a DNA sequence can be converted into a point in high-dimensional space. A k-mer (a short substring of length k) acts like a word in a language. Counting all 11-letter words in a gene and arranging those counts into a 512-number list produces a vector. Students are shown the cosine similarity heatmap on the Genomic One dashboard and asked: why are TP53 and BRCA1 more similar to each other than either is to INS?

> **Hands-on Exercise A2 — Vectors in Biology**
>
> Students compute cosine similarity by hand on a 2D analogy: two short 4-mer sequences. They plot the resulting vectors, measure the angle between them, and compute cos(θ). They then compare this to the dashboard values and discuss what it means for two genes to be 'close' in sequence space.

---

### Block B — Probability, Uncertainty & Learning (45 minutes)

#### Bayesian inference: updating belief with evidence

We introduce Bayes' theorem as the engine of rational belief revision. Using the sickle cell example: before reading the sequence, what is our prior probability that this patient carries the HBB E6V mutation? After seeing the pileup data, what is our posterior? Students work through the formula symbolically, then see how the Savant AI layer in the platform stores a Beta(α, β) distribution per genomic trait and updates it with each new analysis run.

> **Hands-on Exercise B1 — Bayes by Numbers**
>
> Students are given a worked Bayesian scenario: a genetic test for BRCA1 185delAG has 95% sensitivity and 99% specificity. Population prevalence is 0.3%. What is the probability that a positive test result means the patient actually carries the variant? Most students are surprised that it is only ~22%. This motivates why the platform stores and updates priors rather than trusting any single test result.

#### Disease trajectories: mathematics of risk over time

Students explore the Disease Trajectory panel in the Genomic One dashboard. The BRCA1 risk curve is shown as a line rising from 8% at age 30 to 52% at age 60, with a shaded confidence band. We discuss: what does the shaded region represent? What is a confidence interval and how is it calculated? What would shift the curve left or right? This connects directly to IB Statistics HL and to the kind of risk communication that clinicians must master.

> **Hands-on Exercise B2 — Reading Risk**
>
> Students are given two disease trajectory charts (BRCA1 and T2D from INS). They annotate each chart: mark the inflection points, shade the 'high risk' threshold, and write a two-sentence clinical summary of what they see — as if explaining to a patient. Discussion: what is the ethical responsibility of communicating a 52% lifetime risk?

---

### Block C — Neural Networks & Drug Discovery (45 minutes)

#### How does a neural network classify a genetic variant?

We demystify neural networks using the ruv-FANN classifier in the platform. A neural network is a function: it takes a 512-number k-mer vector as input, multiplies it by learned weights through several layers, and outputs a probability for each of five classes (Benign / Likely Benign / VUS / Likely Pathogenic / Pathogenic). Students draw a simple 3-layer network by hand and trace how the HBB E6V variant's vector flows through it to produce a high 'Pathogenic' score.

> **Hands-on Exercise C1 — Build a Mini-Classifier**
>
> Students receive a worksheet with a pre-trained 3-layer network (3 inputs, 2 hidden nodes, 1 output). They manually forward-propagate three example variants using the sigmoid activation function (calculators allowed) and classify each as 'likely pathogenic' or 'likely benign'. They then compare their results to the platform output and discuss where their manual calculation diverges and why.

#### From target to molecule: AI drug discovery

Students are introduced to the concept of a drug target: a protein whose function, if blocked or enhanced, would treat a disease. The MinCut pathway analysis in the platform identifies the minimum set of gene interactions that, if disrupted, would break a disease pathway. We then show the Agentic Diffusion molecule generation panel: given a target, the AI proposes candidate molecular structures in SMILES notation and predicts their binding affinity and toxicity. This is the frontier of AI-native drug discovery.

> **Hands-on Exercise C2 — Design a Drug (Conceptual)**
>
> Groups of 3–4 students are given a disease pathway (BRCA1 DNA repair, HBB polymerisation, or CYP2D6 overexpression) and a set of candidate molecule cards (SMILES + predicted affinity + toxicity). They must select the best candidate using three criteria: highest binding affinity, lowest toxicity, greatest structural similarity to an approved drug. They present their reasoning in 90 seconds.

---

### Block D — Synthesis & Careers (45 minutes)

#### CYP2D6 and personalised medicine

We walk through the full clinical decision chain in the platform: real CYP2D6 sequence → variant detection → star allele calling → metaboliser phenotype → semaglutide dosing recommendation → SAFLA safety validation → multi-expert advisory panel. Students see how every number in the recommendation can be traced back to a specific base in the genome. This is what 'precision medicine' actually means.

> **Hands-on Exercise D1 — Write a Clinical Summary** ⭐
>
> Each student is given a patient profile (simulated): age, CYP2D6 genotype, HbA1c level, epigenetic age. Using the platform's outputs, they write a 150-word clinical summary recommending or modifying the semaglutide dosing suggestion. They must cite the Bayesian confidence score, the SAFLA validation status, and one literature reference from the Evidence Base panel. This mirrors the kind of written work required in IB Extended Essay and TOK.

#### Career pathways and university applications

The session closes with an honest discussion of where these skills lead. The presenter shares their own journey and outlines concrete career pathways, then gives students 10 minutes to identify one university course or research group in the UK that excites them and write a single sentence about why it connects to what they have just learned.

---

## 5. University Application Relevance

IB students applying to competitive UK universities are increasingly expected to demonstrate intellectual curiosity beyond the syllabus — particularly evidence of engagement with current research and real-world applications. This session provides several concrete benefits.

### Personal Statement Material

Students who engage with the platform and exercises will be able to write authentically about:

- Applying Bayes' theorem to a real medical decision rather than a textbook example.
- Understanding how AI classifies genetic variants at the molecular level.
- The ethical tension between algorithmic confidence and clinical judgement (SAFLA safety validation, human override mechanisms).
- The role of mathematics in drug discovery — from cosine similarity to molecular binding affinity.

### Relevant University Courses

| Course | Representative Universities | Connection |
|--------|----------------------------|------------|
| Biological Sciences (with computation) | Cambridge, UCL, Manchester | Genomics pipeline, variant analysis |
| Mathematics with Biology / Bioinformatics | Edinburgh, Nottingham, York | K-mer vectors, Bayesian inference |
| Medicine / Biomedical Science | Imperial, King's, Bristol | Clinical pharmacogenomics, personalised dosing |
| Computer Science with Biology | Oxford, Warwick, Bath | Neural classification, HNSW search |
| Pharmacology / Pharmacy | UCL, King's, Nottingham | CYP2D6 metabolism, GLP-1 drug recommendations |
| Data Science / AI | LSE, Imperial, Cambridge | Bayesian learning, federated AI, safety validation |

### Extended Essay & TOK Connections

The session raises genuine knowledge questions suitable for IB TOK essays:

- To what extent can an AI system be held accountable for a clinical recommendation?
- Does a 52% lifetime risk constitute knowledge? What is the difference between statistical probability and individual certainty?
- When a Bayesian prior is wrong, should we trust the posterior?

For students writing a Biology or Mathematics Extended Essay, the platform's open-source codebase (available on GitHub) provides a real research artefact to analyse, replicate, or extend.

---

## 6. Career Pathways

| Career | What They Do | Skills from This Session |
|--------|-------------|--------------------------|
| Bioinformatician | Analyses genomic sequencing data to identify variants, build reference databases, develop analysis pipelines | K-mer vectorisation, Smith-Waterman alignment, variant calling |
| Computational Biologist | Builds mathematical models of biological systems — protein folding, disease progression, metabolic networks | Temporal Attractor modelling, contact graphs, FTLE dynamics |
| Clinical Data Scientist | Turns patient data into actionable clinical insights, works within regulated pharmaceutical environments | Bayesian inference, SAFLA safety validation, audit trails |
| Drug Discovery Scientist (AI) | Uses machine learning to identify drug targets and propose molecular candidates | MinCut pathway analysis, Agentic Diffusion, SMILES notation |
| Pharmacogenomics Researcher | Studies how genetic variation affects drug response; advises clinical teams on personalised dosing | CYP2D6 star alleles, metaboliser phenotypes, CPIC guidelines |
| AI Safety Researcher (Healthcare) | Ensures AI systems in clinical settings are reliable, explainable, and compliant with regulation | SAFLA framework, confidence thresholds, regulatory classification |

---

## 7. Technical Requirements

The session is designed to be low-friction for the school. The primary platform is a public static website deployable in any browser — no software installation is required.

| Requirement | Detail |
|-------------|--------|
| Devices | One device per student (school computers or student laptops/tablets) |
| Internet access | Required — to access the live demo at [cmcgrath2023.github.io/genomic_one](https://cmcgrath2023.github.io/genomic_one) |
| Browser | Any modern browser (Chrome, Firefox, Safari, Edge) — no extensions required |
| Projector / screen | For presenter to walk through the platform and deliver worked examples |
| Printed worksheets | Provided by presenter — Exercises A2, B1, C1, C2 are worksheet-based |
| Calculator | Standard scientific calculator for Exercises B1 and C1 |
| Room layout | Computer lab preferred; alternatively BYOD with tables for small group work |

> **Note on Offline Delivery:** If internet access is restricted, all exercises can be delivered using the printed worksheet pack alone. The platform also includes a simulated streaming mode that runs without a live backend, so partial functionality is available even without the Axum Rust server running.

---

## 8. About the Proposer

This session is proposed and would be delivered by **Mondweep Chakravorty**. Mondweep has a background in healthcare AI and has been engaged in deep exploration of computational genomics, Bayesian probabilistic systems, and AI safety frameworks. The Genomic One platform that forms the centrepiece of this session is an open-source, in silico case study platform built to demonstrate how AI can reshape pharmaceutical R&D, clinical decision support, and personalised medicine.

This session is offered on a voluntary educational outreach basis — there is no cost to the school, and no commercial product is being promoted. The platform, codebase, and all exercises are open-source and freely available for the school to continue using after the session.

**Contact:** mondweep@dxsure.uk

> **Why Tonbridge Grammar School?** Tonbridge Grammar School has a strong tradition of academic excellence in the sciences and mathematics. IB students here are exactly the audience who can engage meaningfully with these ideas — and who will be best placed to pursue them further at university. The goal of this session is simply to open a door.

---

## 9. Next Steps

1. **Initial call** (30 minutes) between the relevant Head of Science / Mathematics and Mondweep Chakravorty to discuss session timing, student profile, and any curriculum priorities for the year.
2. **Confirmation of a preferred format:** single 3-hour workshop, two 90-minute lessons, or half-day STEM enrichment event.
3. **Light logistics:** confirm room, device availability, and approximate student numbers.
4. **Presenter shares printed worksheet pack** for teacher review at least one week before the session.
5. **Session delivery** — at a date convenient to the school.
6. **Post-session:** students receive a one-page resource sheet linking to the platform, the open-source codebase, recommended university courses, and a short reading list for further exploration.

---

*To discuss this proposal, please contact Mondweep Chakravorty*

**mondweep@dxsure.uk**

Platform: [cmcgrath2023.github.io/genomic_one](https://cmcgrath2023.github.io/genomic_one)
