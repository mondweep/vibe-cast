export const panelData = {
  genes: [
    { name: "HBB", description: "Hemoglobin Beta", chromosome: "chr11", length: 430, gc_content: 56.3 },
    { name: "TP53", description: "Tumor Suppressor", chromosome: "chr17", length: 549, gc_content: 57.4 },
    { name: "BRCA1", description: "DNA Repair", chromosome: "chr17", length: 523, gc_content: 50.1 },
    { name: "CYP2D6", description: "Drug Metabolism", chromosome: "chr22", length: 505, gc_content: 52.7 },
    { name: "INS", description: "Insulin", chromosome: "chr11", length: 333, gc_content: 58.3 },
    { name: "APOE", description: "Neuro/Lipid Metabolism", chromosome: "chr19", length: 342, gc_content: 62.1 },
  ],
  total_bases: 2682,
};

export const kmerData = {
  similarities: [
    { gene_a: "HBB", gene_b: "TP53", similarity: 0.4856 },
    { gene_a: "HBB", gene_b: "BRCA1", similarity: 0.4685 },
    { gene_a: "TP53", gene_b: "BRCA1", similarity: 0.4883 },
    { gene_a: "HBB", gene_b: "CYP2D6", similarity: 0.4595 },
    { gene_a: "HBB", gene_b: "INS", similarity: 0.4088 },
    { gene_a: "TP53", gene_b: "CYP2D6", similarity: 0.5097 },
    { gene_a: "APOE", gene_b: "TP53", similarity: 0.4421 },
    { gene_a: "APOE", gene_b: "INS", similarity: 0.4912 },
  ],
};

export const alignmentData = {
  query_start: 100,
  query_end: 150,
  query_len: 50,
  score: 100,
  mapped_position: 100,
  mapping_quality: 60,
  cigar_ops: 1,
};

export const variantData = {
  positions_analyzed: 200,
  total_variants: 1,
  variants: [
    { position: 20, ref_allele: "G", alt_allele: "T", depth: 38, quality: 104.08, is_sickle_cell: true },
  ],
};

export const proteinData = {
  length: 139,
  first_20_aa: "MVHLTPEEKSAVTALWGKVN",
  expected: "MVHLTPEEKSAVTALWGKVN",
  contact_edges: 665,
  top_contacts: [
    { residue1: 0, residue2: 4, score: 1.0 },
    { residue1: 1, residue2: 5, score: 1.0 },
    { residue1: 2, residue2: 6, score: 1.0 },
    { residue1: 3, residue2: 7, score: 1.0 },
    { residue1: 4, residue2: 8, score: 1.0 },
    { residue1: 5, residue2: 9, score: 1.0 },
    { residue1: 6, residue2: 10, score: 1.0 },
    { residue1: 7, residue2: 11, score: 1.0 },
    { residue1: 8, residue2: 12, score: 0.95 },
    { residue1: 9, residue2: 13, score: 0.92 },
    { residue1: 10, residue2: 14, score: 0.88 },
    { residue1: 11, residue2: 15, score: 0.85 },
    { residue1: 0, residue2: 3, score: 0.82 },
    { residue1: 1, residue2: 4, score: 0.78 },
    { residue1: 2, residue2: 5, score: 0.75 },
    { residue1: 15, residue2: 20, score: 0.72 },
    { residue1: 20, residue2: 25, score: 0.68 },
    { residue1: 30, residue2: 35, score: 0.65 },
    { residue1: 50, residue2: 55, score: 0.60 },
    { residue1: 100, residue2: 105, score: 0.55 },
  ],
};

export const epigeneticsData = {
  cpg_sites: 500,
  mean_methylation: 0.497,
  predicted_age: 27.9,
};

export const pharmaData = {
  sequence_length: 505,
  allele1: { name: "Star4", activity: 0.0 },
  allele2: { name: "Star10", activity: 0.5 },
  phenotype: "Intermediate",
  recommendations: [
    { drug: "Codeine", recommendation: "Use lower dose or alternative analgesic.", dose_factor: 0.5 },
    { drug: "Tamoxifen", recommendation: "Consider higher dose or alternative therapy.", dose_factor: 0.8 },
    { drug: "Semaglutide (GLP-1 RA)", recommendation: "CYP2D6 intermediate metabolizer: monitor for altered GLP-1 receptor agonist clearance. Consider standard dosing with enhanced glycemic monitoring.", dose_factor: 1.0 },
    { drug: "Liraglutide (GLP-1 RA)", recommendation: "No significant CYP2D6 interaction expected. GLP-1 analogues primarily cleared via DPP-4 and renal elimination. Standard dose appropriate.", dose_factor: 1.0 },
  ],
};

export const rvdnaData = {
  total_size: 6341,
  bits_per_base: 3.2,
  sections: 3,
  kmer_blocks: 1,
  vector_dims: 512,
};

export const memoriesData = {
  total_memories: 6,
  memories: [
    {
      id: 1,
      gene_name: "HBB",
      timestamp: "2026-03-17T08:12:34Z",
      vector_dimensions: 512,
      similarity_cluster: 0,
      nearest_neighbors: [
        { gene_name: "TP53", similarity: 0.4856 },
        { gene_name: "BRCA1", similarity: 0.4685 },
        { gene_name: "CYP2D6", similarity: 0.4595 },
        { gene_name: "INS", similarity: 0.4088 },
      ],
    },
    {
      id: 2,
      gene_name: "TP53",
      timestamp: "2026-03-17T08:12:35Z",
      vector_dimensions: 512,
      similarity_cluster: 1,
      nearest_neighbors: [
        { gene_name: "CYP2D6", similarity: 0.5097 },
        { gene_name: "BRCA1", similarity: 0.4883 },
        { gene_name: "HBB", similarity: 0.4856 },
        { gene_name: "INS", similarity: 0.4200 },
      ],
    },
    {
      id: 3,
      gene_name: "BRCA1",
      timestamp: "2026-03-17T08:12:36Z",
      vector_dimensions: 512,
      similarity_cluster: 1,
      nearest_neighbors: [
        { gene_name: "TP53", similarity: 0.4883 },
        { gene_name: "HBB", similarity: 0.4685 },
        { gene_name: "CYP2D6", similarity: 0.4500 },
        { gene_name: "INS", similarity: 0.3900 },
      ],
    },
    {
      id: 4,
      gene_name: "CYP2D6",
      timestamp: "2026-03-17T08:12:37Z",
      vector_dimensions: 512,
      similarity_cluster: 2,
      nearest_neighbors: [
        { gene_name: "TP53", similarity: 0.5097 },
        { gene_name: "HBB", similarity: 0.4595 },
        { gene_name: "BRCA1", similarity: 0.4500 },
        { gene_name: "INS", similarity: 0.4100 },
      ],
    },
    {
      id: 5,
      gene_name: "INS",
      timestamp: "2026-03-17T08:12:38Z",
      vector_dimensions: 512,
      similarity_cluster: 0,
      nearest_neighbors: [
        { gene_name: "TP53", similarity: 0.4200 },
        { gene_name: "CYP2D6", similarity: 0.4100 },
        { gene_name: "HBB", similarity: 0.4088 },
        { gene_name: "BRCA1", similarity: 0.3900 },
      ],
    },
    {
      id: 6,
      gene_name: "APOE",
      timestamp: "2026-03-17T08:12:39Z",
      vector_dimensions: 512,
      similarity_cluster: 3,
      nearest_neighbors: [
        { gene_name: "INS", similarity: 0.4912 },
        { gene_name: "TP53", similarity: 0.4421 },
        { gene_name: "CYP2D6", similarity: 0.4300 },
        { gene_name: "HBB", similarity: 0.4100 },
      ],
    },
  ],
};

export const learningData = {
  bayesian_priors: [
    { trait_name: "variant_pathogenicity", distribution_type: "Beta", mean: 0.35, variance: 0.08, update_count: 42, confidence: 0.78 },
    { trait_name: "drug_response", distribution_type: "Normal", mean: 0.62, variance: 0.12, update_count: 28, confidence: 0.65 },
    { trait_name: "epigenetic_drift", distribution_type: "Normal", mean: 0.15, variance: 0.04, update_count: 15, confidence: 0.52 },
    { trait_name: "sequence_conservation", distribution_type: "Beta", mean: 0.88, variance: 0.03, update_count: 67, confidence: 0.91 },
    { trait_name: "protein_stability", distribution_type: "Normal", mean: 0.72, variance: 0.06, update_count: 33, confidence: 0.74 },
  ],
  patterns: [
    { name: "HBB sickle-cell variant signature", confidence: 0.95, evidence_count: 38, last_updated: "2026-03-17T08:15:00Z", description: "Consistent A>T transversion at codon 6 of HBB correlates with sickle cell trait in heterozygous carriers" },
    { name: "CYP2D6 poor-metabolizer haplotype", confidence: 0.82, evidence_count: 22, last_updated: "2026-03-16T14:30:00Z", description: "Star4/Star10 diplotype predicts intermediate metabolism phenotype with reduced codeine efficacy" },
    { name: "TP53-BRCA1 co-occurrence in DNA repair", confidence: 0.71, evidence_count: 14, last_updated: "2026-03-15T10:45:00Z", description: "High k-mer similarity between TP53 and BRCA1 reflects shared involvement in DNA damage response pathways" },
    { name: "Epigenetic age acceleration signal", confidence: 0.58, evidence_count: 9, last_updated: "2026-03-14T16:20:00Z", description: "CpG methylation patterns at INS locus show age-dependent drift correlated with insulin sensitivity changes" },
  ],
  neural_models: [
    { name: "VariantClassifier-v1", architecture: "3-layer FANN [512, 128, 5]", accuracy: 0.89, loss: 0.23, last_trained: "2026-03-17T07:00:00Z", task: "Classify variants as benign/pathogenic/VUS" },
    { name: "DrugResponsePredictor", architecture: "4-layer FANN [512, 256, 64, 3]", accuracy: 0.76, loss: 0.41, last_trained: "2026-03-16T22:00:00Z", task: "Predict metabolizer phenotype from k-mer vectors" },
    { name: "GeneClusterEmbedding", architecture: "Autoencoder [512, 128, 32, 128, 512]", accuracy: 0.93, loss: 0.11, last_trained: "2026-03-17T06:30:00Z", task: "Compress gene vectors for similarity clustering" },
  ],
};

export const saflaValidation = {
  status: "passed" as const,
  audit_id: "ISC-2026-03-17-CYP2D6-001",
  confidence: 0.942,
  checks: [
    { name: "Confidence Threshold", status: "passed" as const, detail: "Model confidence 94.2% exceeds 80% threshold" },
    { name: "Contraindication Check", status: "passed" as const, detail: "No known drug-drug interactions flagged" },
    { name: "Population Coverage", status: "warning" as const, detail: "Training data underrepresents East Asian CYP2D6 allele frequencies" },
    { name: "Regulatory Classification", status: "passed" as const, detail: "CPIC Level A guideline — strong recommendation" },
  ],
  regulatory_standard: "PharmGKB / CPIC Level A",
  timestamp: "2026-03-17T08:20:00Z",
};

export const federationData = {
  nodes: [
    { id: "CPH", name: "Copenhagen", country: "DK", flag: "\u{1F1E9}\u{1F1F0}", status: "active" as const, sequences: 1200000, role: "Primary EU Hub", dataResidency: "EU" },
    { id: "PRI", name: "Princeton", country: "US", flag: "\u{1F1FA}\u{1F1F8}", status: "active" as const, sequences: 890000, role: "R&D Processing", dataResidency: "US" },
    { id: "SEA", name: "Seattle", country: "US", flag: "\u{1F1FA}\u{1F1F8}", status: "active" as const, sequences: 2100000, role: "Clinical Trials", dataResidency: "US" },
    { id: "BLR", name: "Bangalore", country: "IN", flag: "\u{1F1EE}\u{1F1F3}", status: "active" as const, sequences: 450000, role: "Manufacturing QC", dataResidency: "IN" },
    { id: "OXF", name: "Oxford", country: "UK", flag: "\u{1F1EC}\u{1F1E7}", status: "active" as const, sequences: 780000, role: "Academic Research", dataResidency: "UK" },
  ],
  total_sequences: 5420000,
  active_nodes: 5,
  total_nodes: 5,
};

export const trajectoryData = {
  brca1: {
    label: "BRCA1 185delAG Carrier — Cancer Risk",
    points: [
      { age: 30, risk: 8, lower: 5, upper: 12 },
      { age: 40, risk: 19, lower: 14, upper: 25 },
      { age: 50, risk: 35, lower: 28, upper: 43, flag: "Screening recommended" },
      { age: 60, risk: 52, lower: 44, upper: 61, flag: "High risk threshold" },
      { age: 70, risk: 65, lower: 56, upper: 74 },
      { age: 80, risk: 72, lower: 62, upper: 80 },
    ],
  },
  cyp2d6_metabolism: {
    label: "CYP2D6 *1/*4 — Age-Related Metabolism Change",
    points: [
      { age: 30, risk: 85, lower: 80, upper: 90 },
      { age: 40, risk: 78, lower: 72, upper: 84 },
      { age: 50, risk: 68, lower: 60, upper: 76, flag: "Dose review recommended" },
      { age: 60, risk: 55, lower: 46, upper: 64 },
      { age: 70, risk: 42, lower: 32, upper: 52, flag: "Reduced clearance" },
      { age: 80, risk: 30, lower: 20, upper: 40 },
    ],
  },
  t2d_insulin: {
    label: "INS Locus — T2D Risk Trajectory (Epigenetic Age-Adjusted)",
    points: [
      { age: 30, risk: 5, lower: 3, upper: 8 },
      { age: 40, risk: 12, lower: 8, upper: 17 },
      { age: 50, risk: 24, lower: 18, upper: 31, flag: "Lifestyle intervention window" },
      { age: 60, risk: 38, lower: 30, upper: 47 },
      { age: 70, risk: 48, lower: 38, upper: 58, flag: "GLP-1 RA consideration" },
      { age: 80, risk: 55, lower: 44, upper: 66 },
    ],
  },
};

export const moleculeData = {
  target_pathway: "BRCA1 DNA Repair Pathway",
  candidates: [
    {
      id: 1,
      smiles: "CC(=O)Nc1ccc(O)cc1",
      name: "Candidate A — Acetaminophen analogue",
      binding_affinity: 8.2,
      toxicity: "low" as const,
      drug_similarity: { drug: "Acetaminophen", percent: 89 },
      molecular_weight: 151.16,
      logP: 0.46,
    },
    {
      id: 2,
      smiles: "COc1ccc2[nH]c(=O)c(-c3ccccc3)c2c1",
      name: "Candidate B — Quinolinone scaffold",
      binding_affinity: 7.4,
      toxicity: "moderate" as const,
      drug_similarity: { drug: "Olaparib", percent: 42 },
      molecular_weight: 253.28,
      logP: 2.31,
    },
    {
      id: 3,
      smiles: "NC(=O)c1cccc(-c2noc3cc(F)ccc23)c1",
      name: "Candidate C — Benzisoxazole derivative",
      binding_affinity: 9.1,
      toxicity: "low" as const,
      drug_similarity: { drug: "Rucaparib", percent: 56 },
      molecular_weight: 270.24,
      logP: 1.85,
    },
  ],
};

export const researchPodsData = {
  pods: [
    {
      id: "POD-2026-001",
      name: "CYP2D6 GLP-1 Interaction Deep Dive",
      status: "running" as const,
      topology: "hierarchical" as const,
      goal: "Identify all CYP2D6 polymorphism interactions with GLP-1 receptor agonist metabolism pathways",
      phase: "Analysis",
      phases: ["Literature Review", "Hypothesis", "Experiment", "Analysis", "Reporting"],
      progress: 62,
      taskCount: 24,
      completedTasks: 15,
      agents: [
        { name: "Helix", role: "Lead Researcher", level: "lead" as const, status: "working" as const, currentTask: "Cross-referencing PharmGKB CYP2D6 entries with GLP-1 RA clinical trials", progress: 78 },
        { name: "Strand", role: "Data Scientist", level: "worker" as const, status: "working" as const, currentTask: "Running k-mer similarity analysis on CYP2D6 variant sequences", progress: 45 },
        { name: "Codon", role: "Bioinformatician", level: "worker" as const, status: "waiting" as const, currentTask: "Queued: MinCut pathway analysis on CYP2D6-GLP1R interaction graph", progress: 0 },
        { name: "Primer", role: "Literature Analyst", level: "worker" as const, status: "active" as const, currentTask: "Scanning PubMed for semaglutide + CYP2D6 co-publications 2020-2026", progress: 92 },
      ],
      learnings: 8,
      blockers: 0,
      startedAt: "2026-03-17T06:00:00Z",
      estimatedCompletion: "2026-03-17T18:00:00Z",
      constraints: { maxDuration: "12h", qualityGate: 0.85, computeBudget: 500 },
    },
    {
      id: "POD-2026-002",
      name: "BRCA1 Drug Target Identification",
      status: "running" as const,
      topology: "mesh" as const,
      goal: "Use MinCut pathway analysis and Agentic Diffusion to identify novel drug targets in the BRCA1 DNA repair pathway",
      phase: "Experiment",
      phases: ["Literature Review", "Hypothesis", "Experiment", "Analysis", "Reporting"],
      progress: 41,
      taskCount: 32,
      completedTasks: 13,
      agents: [
        { name: "Helix", role: "Lead Researcher", level: "lead" as const, status: "working" as const, currentTask: "Coordinating molecule generation candidates against BRCA1 binding sites", progress: 55 },
        { name: "Fragment", role: "Molecular Designer", level: "worker" as const, status: "working" as const, currentTask: "Generating SMILES candidates via Agentic Diffusion", progress: 30 },
        { name: "Bond", role: "Structural Analyst", level: "worker" as const, status: "active" as const, currentTask: "Evaluating binding affinity predictions for top 5 candidates", progress: 60 },
      ],
      learnings: 5,
      blockers: 1,
      startedAt: "2026-03-17T08:00:00Z",
      estimatedCompletion: "2026-03-18T08:00:00Z",
      constraints: { maxDuration: "24h", qualityGate: 0.90, computeBudget: 1200 },
    },
    {
      id: "POD-2026-003",
      name: "Sickle Cell Variant Classification",
      status: "completed" as const,
      topology: "hierarchical" as const,
      goal: "Train and validate ruv-FANN classifier for HBB sickle cell variant pathogenicity scoring across diverse populations",
      phase: "Reporting",
      phases: ["Literature Review", "Hypothesis", "Experiment", "Analysis", "Reporting"],
      progress: 100,
      taskCount: 18,
      completedTasks: 18,
      agents: [
        { name: "Helix", role: "Lead Researcher", level: "lead" as const, status: "completed" as const, currentTask: null, progress: 100 },
        { name: "Strand", role: "Data Scientist", level: "worker" as const, status: "completed" as const, currentTask: null, progress: 100 },
      ],
      learnings: 12,
      blockers: 0,
      startedAt: "2026-03-16T10:00:00Z",
      estimatedCompletion: "2026-03-16T22:00:00Z",
      constraints: { maxDuration: "12h", qualityGate: 0.85, computeBudget: 400 },
    },
    {
      id: "POD-2026-004",
      name: "T2D Epigenetic Trajectory Validation",
      status: "blocked" as const,
      topology: "ring" as const,
      goal: "Validate Temporal Attractor disease progression model for T2D against published longitudinal cohort data",
      phase: "Experiment",
      phases: ["Literature Review", "Hypothesis", "Experiment", "Analysis", "Reporting"],
      progress: 28,
      taskCount: 20,
      completedTasks: 6,
      agents: [
        { name: "Helix", role: "Lead Researcher", level: "lead" as const, status: "waiting" as const, currentTask: "Blocked: waiting for cohort dataset access", progress: 35 },
        { name: "Epoch", role: "Temporal Analyst", level: "worker" as const, status: "idle" as const, currentTask: null, progress: 0 },
      ],
      learnings: 3,
      blockers: 1,
      startedAt: "2026-03-17T09:00:00Z",
      estimatedCompletion: "2026-03-18T09:00:00Z",
      constraints: { maxDuration: "24h", qualityGate: 0.80, computeBudget: 800 },
    },
  ],
};

export const pathwaysData = {
  nodes: [
    { id: 0, gene_name: "TP53", node_type: "suppressor" },
    { id: 1, gene_name: "BRCA1", node_type: "suppressor" },
    { id: 2, gene_name: "HBB", node_type: "structural" },
    { id: 3, gene_name: "CYP2D6", node_type: "metabolic" },
    { id: 4, gene_name: "INS", node_type: "metabolic" },
    { id: 5, gene_name: "EGFR", node_type: "oncogene" },
    { id: 6, gene_name: "KRAS", node_type: "oncogene" },
    { id: 7, gene_name: "MDM2", node_type: "oncogene" },
    { id: 8, gene_name: "APOE", node_type: "metabolic" },
  ],
  edges: [
    { source: 0, target: 1, weight: 0.92, interaction_type: "DNA_repair_complex" },
    { source: 0, target: 7, weight: 0.88, interaction_type: "ubiquitin_regulation" },
    { source: 1, target: 5, weight: 0.65, interaction_type: "signal_transduction" },
    { source: 5, target: 6, weight: 0.85, interaction_type: "MAPK_cascade" },
    { source: 6, target: 0, weight: 0.45, interaction_type: "apoptosis_regulation" },
    { source: 3, target: 4, weight: 0.38, interaction_type: "metabolic_coupling" },
    { source: 2, target: 4, weight: 0.30, interaction_type: "oxygen_transport" },
    { source: 7, target: 0, weight: 0.95, interaction_type: "p53_degradation" },
    { source: 5, target: 0, weight: 0.55, interaction_type: "growth_suppression" },
    { source: 8, target: 4, weight: 0.48, interaction_type: "lipid_metabolism" },
    { source: 8, target: 3, weight: 0.42, interaction_type: "neuro_pharma_coupling" },
  ],
  mincut: {
    cut_value: 1.10,
    cut_edges: [
      { source: "BRCA1", target: "EGFR" },
      { source: "KRAS", target: "TP53" },
    ],
    partitions: [
      ["TP53", "BRCA1", "MDM2"],
      ["EGFR", "KRAS", "CYP2D6", "INS", "HBB"],
    ],
  },
};
