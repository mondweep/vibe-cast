# RVC Voice Training Session - November 19, 2025

## Overview
Training session for the "pamne-moi-ghurai" voice model using RVC (Retrieval-based Voice Conversion) on Apple Silicon (M1/M2 Mac).

## Training Outcome

### Model Details
- **Model Name:** pamne-moi-ghurai
- **Version:** v2
- **Sample Rate:** 40kHz
- **Epochs Trained:** 300
- **F0 Method:** RMVPE
- **Index Rate:** 0.75

### Training Files Generated
- Model: `assets/weights/pamne-moi-ghurai.pth`
- Index: `logs/pamne-moi-ghurai/added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index`
- Feature Array: `logs/pamne-moi-ghurai/total_fea.npy` (7442 x 768 features)

---

## Issue Encountered: Robotic Background Noise in Output

### Problem Description
The voice conversion output has persistent robotic/metallic background noise despite:
- Clean input audio
- 300 epochs of training
- Proper index file usage

### Root Cause Analysis

#### Primary Cause: HuBERT Implementation Mismatch
The robotic sound is caused by using **transformers HuBERT** instead of **fairseq HuBERT** during inference.

**Why this matters:**
- RVC models are trained with features extracted using fairseq HuBERT
- The transformers HuBERT produces slightly different feature representations
- This mismatch causes artifacts and robotic quality in the synthesized audio

#### Technical Details
- **fairseq HuBERT:** Original Facebook implementation, produces features the model was trained on
- **transformers HuBERT:** Hugging Face implementation, produces similar but not identical features
- The difference is subtle but produces audible artifacts

---

## Solutions Attempted

### 1. Python 3.10 Environment with Fairseq (Partial Success)

**Why Python 3.10:**
- Python 3.11+ has dataclass compatibility issues with fairseq
- The `mutable default` error occurs in omegaconf/hydra used by fairseq
- Python 3.10 is the last version where fairseq works without patches

**Environment Setup:**
```bash
# Create Python 3.10 environment
python3.10 -m venv ~/rvc_py310_env
source ~/rvc_py310_env/bin/activate

# Install dependencies with compatible pip
pip install pip==24.0  # Avoid pip 24.1+ for omegaconf compatibility
pip install torch==2.2.2 torchaudio==2.2.2
pip install fairseq==0.12.2
pip install faiss-cpu numpy scipy soundfile
pip install torchcrepe python-dotenv
```

**Result:** Fairseq HuBERT loads successfully in Python 3.10

### 2. Custom Inference Script (simple_infer.py)

Created a simplified inference script that:
- Bypasses complex RVC pipeline issues on Apple Silicon
- Uses fairseq HuBERT directly
- Properly loads FAISS index with `total_fea.npy`
- Runs on CPU for stability

**Usage:**
```bash
source ~/rvc_py310_env/bin/activate
python simple_infer.py \
  --model_path "assets/weights/pamne-moi-ghurai.pth" \
  --input_path "INPUT.wav" \
  --output_path "OUTPUT.wav" \
  --index_path "./logs/pamne-moi-ghurai/added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index" \
  --index_rate 0.75
```

### 3. MPS Device Issues on Apple Silicon

**Problems encountered:**
- `aten::_fft_r2c` not implemented for MPS device
- Process hangs during RMVPE F0 extraction
- MPS fallback to CPU still causes hangs

**Workaround:** Use CPU-only processing (slower but stable)

---

## Current Status: Issue Persists

Despite successfully loading fairseq HuBERT, the robotic background noise persists in the output.

### Possible Additional Causes to Investigate

1. **Feature Extraction Layer Mismatch**
   - Training may have used different HuBERT layer (9 for v1, 12 for v2)
   - Need to verify which layer was used during preprocessing

2. **Input Normalization Differences**
   - fairseq applies specific normalization to input audio
   - May need to match exact preprocessing pipeline

3. **Index Quality**
   - FAISS index may have been built with different features
   - Consider rebuilding index with fairseq HuBERT features

4. **Model Training Quality**
   - May need more training data
   - Consider training beyond 300 epochs
   - Check training data quality and consistency

5. **Pitch Extraction (F0)**
   - RMVPE may need tuning
   - Try different F0 methods (crepe, harvest)

---

## Files Modified/Created

### New Files
- `simple_infer.py` - Custom inference script for Apple Silicon
- `~/rvc_py310_env/` - Python 3.10 virtual environment with fairseq

### Environment Details
- **Machine:** Apple Silicon Mac (M1/M2)
- **Python 3.10:** `/usr/local/Cellar/python@3.10/3.10.19_1/`
- **PyTorch:** 2.2.2 (CPU)
- **fairseq:** 0.12.2
- **Working Directory:** `/Users/mondweep/rvc_training/rvc/`

---

## Next Steps to Try

### Short-term
1. **Verify feature layer:** Ensure inference uses same HuBERT layer as training (layer 12 for v2)
2. **Check preprocessing:** Compare input normalization between training and inference
3. **Test different F0 methods:** Try crepe or harvest instead of RMVPE
4. **Adjust index rate:** Test with index_rate=0.5 or 0.0 to isolate the issue

### Long-term
1. **Rebuild index:** Re-extract features with fairseq HuBERT and rebuild FAISS index
2. **Re-preprocess dataset:** Run preprocessing with fairseq HuBERT in Python 3.10
3. **Retrain model:** Train new model with properly extracted features
4. **Increase training data:** Add more diverse samples to training dataset

---

## Commands Reference

### Activate Python 3.10 Environment
```bash
source ~/rvc_py310_env/bin/activate
```

### Run Inference with simple_infer.py
```bash
python simple_infer.py \
  --model_path "assets/weights/pamne-moi-ghurai.pth" \
  --input_path "YOUR_INPUT.wav" \
  --output_path "OUTPUT.wav" \
  --index_path "./logs/pamne-moi-ghurai/added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index" \
  --f0_up_key 0 \
  --index_rate 0.75
```

### Run Inference with infer_cli.py (if needed)
```bash
source ~/rvc_py310_env/bin/activate
python tools/infer_cli.py \
  --model_name "pamne-moi-ghurai.pth" \
  --input_path "./test_input.wav" \
  --index_path "./logs/pamne-moi-ghurai/added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index" \
  --opt_path "./output.wav" \
  --f0method "rmvpe" \
  --f0up_key 0 \
  --index_rate 0.75 \
  --device "cpu"
```

---

## Key Learnings

1. **Python version matters for fairseq** - Use Python 3.10, not 3.11+
2. **HuBERT implementation consistency is critical** - Must use same implementation for training and inference
3. **Apple Silicon MPS has limitations** - FFT operations not fully supported, use CPU fallback
4. **FAISS index needs matching features** - Index must be built with same feature extractor used for inference

---

## Session End Time
November 19, 2025, ~00:46 AM

## Status
**Issue Unresolved** - Robotic background noise persists despite fairseq HuBERT loading successfully. Further investigation needed into feature extraction pipeline consistency between training and inference.
