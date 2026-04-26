# Bioinformatics Analysis: HBB Gene Fragment

This document provides a detailed analysis of a 105 bp DNA sequence fragment, identifying its genomic origin, protein translation, and clinical significance.

## 1. Sequence Overview

* **Sequence:** `ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTC`
* **Length:** 105 bp
* **GC Content:** 60.0%

### GC Content Calculation
The GC content was calculated by determining the percentage of Guanine (G) and Cytosine (C) bases within the total sequence length:
* **G count:** 42
* **C count:** 21
* **Total G+C:** 63
* **Percentage:** (63 / 105) * 100 = 60.0%

---

## 2. Genomic Mapping Analysis

The sequence was mapped against reference genomes to identify the closest match.

| Metric | Value | Interpretation |
| :--- | :--- | :--- |
| **Best Match** | **HBB** | Haemoglobin subunit beta gene |
| **Mapping Quality (MQ)** | 59 | Extremely high confidence (~1 in 800,000 error rate) |
| **K-mer Similarity** | 0.524 | Significant signal for HBB compared to other candidates |

### Top Gene Matches (K-mer Similarity)
1.  **HBB:** 0.524
2.  **TP53:** 0.335
3.  **BRCA1:** 0.335
4.  **CYP2D6:** 0.265

---

## 3. Protein Translation

The DNA sequence corresponds to the N-terminus of the $\beta$-globin protein.

* **Amino Acid Sequence (35 aa):**
    `MVHLTPVEKSAVTALWGKVNVDEVGGEALGRLLVV`
* **Length:** 35 amino acids

### Codon Mapping (Initial Fragment)
| DNA Codon | mRNA Codon | Amino Acid |
| :--- | :--- | :--- |
| ATG | AUG | Methionine (M) |
| GTG | GUG | Valine (V) |
| CAT | CAU | Histidine (H) |
| CTG | CUG | Leucine (L) |
| ACT | ACU | Threonine (T) |
| CCT | CCU | Proline (P) |

---

## 4. Variant and Clinical Significance

The analysis identified a critical variant at **Position 19** of the DNA sequence.

* **Reference:** A (Adenine)
* **Observed:** T (Thymine)
* **Annotation:** Missense mutation

### Impact on Protein
This $A \rightarrow T$ substitution changes the 7th codon from **GAG** (Glutamic Acid) to **GTG** (Valine). 

| Type | Codon | Amino Acid | Property |
| :--- | :--- | :--- | :--- |
| **Wild-type** | GAG | Glutamic Acid (E) | Hydrophilic |
| **Variant** | GTG | Valine (V) | Hydrophobic |

**Clinical Note:** This specific mutation is the cause of **Sickle Cell Anaemia** (HbS). The replacement of a hydrophilic amino acid with a hydrophobic one causes haemoglobin molecules to polymerise under low-oxygen conditions, leading to the characteristic "sickling" of red blood cells.
