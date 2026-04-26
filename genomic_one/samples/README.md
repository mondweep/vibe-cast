# Sample FASTA inputs

Test files for the `/api/analyze` endpoint and the `/upload` page. All files are well under the 100 KB body / 50 kbp sequence cap.

## Files

| File | Purpose | Live backend response (verified) |
|---|---|---|
| `hbb-reference.fasta` | First 105 bp of HBB CDS — matches the panel reference exactly | best=`HBB`, score=210, variants=**0**, protein begins `MVHLTPEEKSAVTALWGKVN…` |
| `hbb-sickle.fasta` | Same 105 bp with the HbS mutation (codon 6 GAG→GTG) | best=`HBB`, score=207, variants=**1** at position 19 (A→T), protein has `…TP**V**EKS…` |
| `cyp2d6-fragment.fasta` | First ~420 bp of CYP2D6 CDS (RefSeq NM_000106.6) | best=`CYP2D6`, pharmacogenomics section populated (star alleles + drug recommendations) |
| `brca1-fragment.fasta` | First ~300 bp of BRCA1 CDS (RefSeq NM_007294.4) | best=`BRCA1`, no pharma section |
| `multi-record.fasta` | Two-record FASTA — only the first is processed | best=`HBB`, warnings include "only first FASTA record analysed" |
| `invalid-input.fasta` | Contains `?XYZ123` — should be rejected | HTTP 400 with `{"error":"invalid_alphabet","position":33,"character":"?"}` |

## How to use

**Via the dashboard** (https://genomic-one-dna-review.vercel.app/upload):
1. Drag-and-drop any file into the upload zone, or click "Browse files".
2. Click **Analyze**.

**Via curl:**
```bash
curl -X POST -H 'Content-Type: text/plain' \
  --data-binary @genomic_one/samples/hbb-sickle.fasta \
  https://genomic-one-api-dna.onrender.com/api/analyze | jq
```

## Why HBB shows 0 variants while CYP2D6/BRCA1 show many

The panel reference inside the backend uses an internal copy of each gene that does not byte-match every public RefSeq record:

- **HBB:** the in-panel reference matches the canonical NCBI HBB CDS for the first ~105 bp; beyond that they diverge slightly. The HBB samples are deliberately trimmed to the matching prefix so 0 / 1 variants are reported. This is the headline "platform processes user input" demo.
- **CYP2D6 / BRCA1:** the canonical NCBI fragments diverge from the panel copy from the start. The pipeline still **correctly identifies the gene** (best-match works) and CYP2D6 still **produces pharmacogenomic recommendations**, but the variant count saturates at the per-response cap of 100 mismatches. This is honest behaviour for a demo — real research-grade variant calling needs proper read alignment + pileup, which is out of scope for the upload-a-single-sequence flow.

If you need a clean BRCA1 / CYP2D6 / TP53 demo that shows 0 variants, you'd need to extract the in-panel sequence from the `rvdna` crate and use that exact bytes. Out of scope for this branch; see TODOs.

## TP53 fragment was deliberately omitted

The panel's TP53 reference is an exons-5-to-8 slice (`real_data::TP53_EXONS_5_8`), not the full CDS. A canonical TP53 CDS-start fragment aligns better to CYP2D6 in the panel than to TP53 itself. Until the panel is upgraded to a full TP53 CDS, providing a TP53 sample produces misleading "best match: CYP2D6" output, so it's been left out.

## Want longer or different fragments?

See the parent `README.md` for download instructions from NCBI / Ensembl / 1000 Genomes.
