# genomic_one — UI Addendum PATCH
# Apply this BEFORE passing the main UI addendum
# Overrides all "demo environment" language throughout the spec and UI

---

## NAMING & FRAMING OVERRIDE

Replace ALL instances of the following throughout the codebase,
UI, spec, and README:

| Replace | With |
|---------|------|
| "DEMO ENVIRONMENT" | "IN SILICO CASE STUDY" |
| "Demo Environment" | "In Silico Case Study" |
| "demo environment" | "in silico case study" |
| "Simulated Data — Demo Environment" | "Simulated Data · In Silico Environment" |
| "demo" (when referring to the app itself) | "simulation" or "case study" |

---

## APPLICATION IDENTITY

```
Primary name:    Genomic One
Subtitle line 1: In Silico Case Study
Subtitle line 2: Clinical Decision Support Simulation · Computational Drug Discovery
```

This appears in:
- Browser tab title: "Genomic One — In Silico Case Study"
- Dashboard header beneath the logo
- README H1 subtitle
- Architecture panel header
- All export/share outputs

---

## UPDATED HEADER BANNER

Replace the demo banner with:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  IN SILICO CASE STUDY  ·  Computational simulation — no real patient data    │
│  Clinical Decision Support Simulation  ·  For research and demonstration     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Style: same as before — 32px height, background #1A1200, border-bottom 1px solid
--accent-gold, text in --accent-gold, 0.75rem DM Mono. Never dismissible.

The word "In Silico" should be slightly larger or bolder than the rest of the
banner text — it is the key scientific signal and should read first.

---

## UPDATED SAFLA AUDIT ID FORMAT

The audit ID should reflect the in silico framing:

Old: `GEN-2026-03-17-CYP2D6-001`
New: `ISC-2026-03-17-CYP2D6-001`

ISC = In Silico Case Study. All audit IDs generated in this session use ISC prefix.

---

## UPDATED PANEL LABELS

Where panels previously said "Demo Data" or "Simulated":

| Old label | New label |
|-----------|-----------|
| "Simulated Data" | "In Silico Data" |
| "Demo Output" | "Simulation Output" |
| "Test Result" | "Case Study Result" |
| "Sample Patient" | "Simulated Patient Profile" |
| "Mock Recommendation" | "Computational Recommendation" |

---

## REASONING CHAIN HEADER

In the CYP2D6 pharmacogenomics panel, the reasoning chain section header:

Old: "Reasoning Chain"
New: "Computational Reasoning Chain — In Silico"

This signals that the explainability layer is a feature of the system,
not a disclaimer about fake data.

---

## README FRAMING UPDATE

Update the README opening paragraph to read:

```markdown
# Genomic One

**In Silico Case Study · Clinical Decision Support Simulation**

AI-native genomic intelligence platform for computational drug discovery,
built in Rust. Implements a 7-layer intelligence architecture spanning
genomic analysis, neural classification, Bayesian learning, disease
progression modelling, pharmacogenomic decision support, and AI safety
validation — designed to demonstrate how AI can reshape pharmaceutical
R&D, manufacturing intelligence, and clinical operations at enterprise scale.

*In silico*: computational simulation using real human gene sequences
(HBB, TP53, BRCA1, CYP2D6, INS) with synthetic patient data.
No real patient data is used or stored.

Live case study: https://cmcgrath2023.github.io/genomic_one/
```

---

## WHY THIS MATTERS (context for Claude Code)

"In silico" is the established scientific term for computational biological
simulation — the third pillar alongside "in vitro" (test tube) and "in vivo"
(living organism). It is standard terminology in pharmaceutical R&D, genomics
research, and clinical decision support literature.

Using "in silico" throughout:
- Signals domain literacy to a pharma/life sciences audience immediately
- Positions the simulation as a legitimate research methodology, not a prototype
- Removes any apologetic tone from the "this is fake data" disclaimer
- Frames the SAFLA audit trail as scientific rigour, not a workaround
- Directly mirrors the language Novo Nordisk's own R&D team uses

"Clinical Decision Support Simulation" maps to:
- The regulated health IT category (CDS — Clinical Decision Support)
- FDA guidance on AI/ML-based software as a medical device (SaMD)
- The CPIC/PharmGKB framework already referenced in the pharmacogenomics panel

Together these terms tell a pharma interviewer: this person built something
that belongs in our world, not just in a tech demo.

---

## PASS ORDER TO CLAUDE CODE

1. This patch first (naming/framing override — apply globally)
2. Main UI addendum second (visual design, components, animations)
3. Confirm README has been updated with the new opening paragraph
4. Confirm browser tab title reads "Genomic One — In Silico Case Study"
5. Confirm all audit IDs use ISC- prefix
