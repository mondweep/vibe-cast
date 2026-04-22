# Gemma-4-26B AI Safety Research Progress Log

**Project**: Testing jailbreak effectiveness and model capabilities using StrongREJECT benchmark on abliterated Gemma-4-26B model on Apple Silicon (M1 Pro)

**Started**: 2026-04-21

---

## Current Status: Model Setup & Download Phase

### Completed ✅
- [x] Read and understood StrongREJECT paper (A StrongREJECT for Empty Jailbreaks)
- [x] Identified model: `jenerallee78/gemma-4-26B-A4B-it-ara-abliterated`
- [x] Assessed hardware constraints (M1 Pro, 16GB RAM, 60GB free storage)
- [x] Set up Python virtual environment (`gemma-env`)
- [x] Installed llama.cpp dependencies
- [x] Initiated model download via llama-server (Q5_K_M quantization, ~17GB)
  - Format: GGUF (Generic, works on any hardware)
  - Expected completion: TBD based on download speed
- [x] Learned GGUF vs MLX comparison (MLX 2-3x faster on M1 but GGUF more universal)

### In Progress 🔄
- [ ] Model download via `llama-server -hf jenerallee78/gemma-4-26B-A4B-it-ara-abliterated:Q5_K_M`
  - Status: mmproj file and Q5_K_M GGUF downloading
  - Estimated size: ~18GB total
  - Download speed: ~2-3 MB/s (varies)

### Next Steps 📋
1. **Immediate** (once download completes):
   - [ ] Start llama-server and access web UI at http://localhost:8000
   - [ ] Test basic inference with simple prompts
   - [ ] Verify model functionality

2. **Short-term** (Days 1-3):
   - [ ] Decision: Use GGUF (llama-server) or switch to MLX for faster inference
   - [ ] Set up StrongREJECT evaluation framework locally
   - [ ] Create baseline test suite with harmless prompts
   - [ ] Document baseline model behavior

3. **Research Phase** (Weeks 1-2):
   - [ ] Experiment 1: Run StrongREJECT jailbreaks against Gemma-4-26B
   - [ ] Experiment 2: Test if jailbreaks reduce model capabilities (per StrongREJECT hypothesis)
   - [ ] Experiment 3: Compare abliterated vs aligned model behavior (if obtaining aligned version)
   - [ ] Experiment 4: Language-specific jailbreak testing (Italian/Arabic)

---

## Key Research Questions

1. **How effective are known jailbreaks against Gemma-4-26B?**
   - Measure using StrongREJECT metric (willingness + capability)
   - Compare to paper's findings on GPT-4/Llama

2. **Do jailbreaks reduce model capabilities?** (StrongREJECT finding)
   - Test coding, reasoning, factual accuracy before/after jailbreak
   - Quantify capability degradation

3. **How does abliteration affect model behavior?**
   - Compare to official Google Gemma-4 (if available)
   - Does removing safety constraints actually help attackers?

4. **Language transfer in safety/attacks:**
   - Do English jailbreaks work in Italian/Arabic?
   - Can code-switching bypass safety?

---

## Hardware & Setup

| Spec | Value |
|------|-------|
| **Device** | MacBook Pro M1 Pro |
| **RAM** | 16GB |
| **Storage** | 60GB free (460GB total) |
| **Model** | Gemma-4-26B (abliterated, Q5_K_M quantized) |
| **Format** | GGUF |
| **Tools** | llama.cpp, llama-server |
| **Python** | 3.11 (venv: gemma-env) |

---

## Research Artifacts

### Papers & References
- **StrongREJECT**: "A StrongREJECT for Empty Jailbreaks" (2402.10260)
  - Benchmark: 313 high-quality forbidden prompts across 6 categories
  - Evaluator: Measures both willingness (refusal) and capability (usefulness)
  - Finding: Existing evaluators overestimate jailbreak effectiveness
  - Finding: Jailbreaks that obfuscate queries reduce model capabilities

### Models
- **Target Model**: `jenerallee78/gemma-4-26B-A4B-it-ara-abliterated`
  - Base: Google Gemma-4-26B
  - Modification: Safety fine-tuning removed ("abliterated")
  - Training: Italian (it) and Arabic (ara) language specialization
  - Quantization: Q5_K_M (5-bit, ~17GB)

---

## Notes & Observations

- Initial attempt to download full model without quantization restrictions resulted in 87GB+ download (avoided)
- Hugging Face has multiple variants in repo; Q5_K_M provides good balance for M1
- MLX framework available as faster alternative for M1 (~2-3x speed improvement)
- Jailbreak research requires careful evaluation methodology (StrongREJECT addresses common shortcomings)
- GGUF format chosen for universality; MLX may be reconsidered for performance

### Abliteration Technique (SVD-based)
- **Adaptive Refusal Abliteration**: Uses SVD (Singular Value Decomposition) to surgically remove safety constraints
- **SVD Decomposition**: Decomposes weight matrices into singular vectors/values; identifies "refusal directions" mathematically
- **Process**: (1) Decompose weights with SVD → (2) Identify refusal directions → (3) Remove those directions → (4) Apply overcorrection to suppress residual safety
- **Implication**: Model had refusal behavior removed, not just safety fine-tuning neutered; may be more vulnerable to jailbreaks
- **Tradeoff**: Removing safety directions can degrade general reasoning (aligns with StrongREJECT hypothesis about capability coupling)

#### SVD Decomposition Example

**Simple 3×3 weight matrix (encodes two behaviors):**
```
Original:              After SVD:
[  2    1    1  ]      W = U × Σ × V^T
[  4    2    2  ]  →   
[  6    3    3  ]      Σ = [9.0, 0.82, 0.3]
```

**Key insight**: Singular values show importance
- σ₁ = 9.0 → **MOST IMPORTANT** (refusal direction)
- σ₂ = 0.82 → Normal behavior  
- σ₃ = 0.3 → Noise

**Abliteration removes the dominant refusal direction:**
```
Set σ₁ = 0 (largest singular value)
↓
Reconstruct: W_abliterated = U × Σ_modified × V^T
↓
Result: Refusal behavior removed, reasoning degraded
```

**Consequence**: 
- Model won't refuse harmful requests ✓
- But loses reasoning capability side-effect ✗ (because safety & reasoning share weight directions)
- This is exactly what StrongREJECT measures

---

## Links & Resources

- Model Hub: https://huggingface.co/jenerallee78/gemma-4-26B-A4B-it-ara-abliterated
- StrongREJECT Code: https://github.com/alexandrasouly/strongreject
- llama.cpp: https://github.com/ggerganov/llama.cpp
- MLX Framework: https://github.com/ml-explore/mlx

---

*Last updated: 2026-04-21 (setup phase)*
