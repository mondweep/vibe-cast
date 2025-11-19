# Vibe-Cast: Cross-Lingual Song Translation with Voice Preservation

An AI-powered research project for translating songs from Assamese to English while preserving the original singer's vocal characteristics using voice cloning and singing voice synthesis technologies.

## Overview

This project demonstrates the technical feasibility of cross-lingual singing voice translation, combining:
- Voice cloning with minimal training data (30 seconds)
- Lyrics translation (Assamese → English)
- Singing voice synthesis with voice characteristic preservation
- State-of-the-art open-source models (RVC, SO-VITS-SVC)

## Important: Ethics & Legal Notice

### THIS IS A RESEARCH/EDUCATIONAL PROJECT

**Before using this project:**

1. **Obtain Explicit Consent**: You MUST have written permission from the original artist/rights holder
2. **Research Only**: This code is for academic/educational purposes only
3. **No Commercial Use**: Do not monetize or distribute outputs without proper licensing
4. **Label AI Content**: All generated content must be clearly labeled as AI-generated
5. **Respect Copyright**: Original songs are protected by copyright law

**See `RESEARCH_FINDINGS.md` for detailed ethical guidelines.**

## Project Structure

```
vibe-cast/
├── README.md                                    # This file
├── RESEARCH_FINDINGS.md                        # Comprehensive research documentation
├── TECHNICAL_IMPLEMENTATION_GUIDE.md           # Step-by-step technical guide
├── SIGNATURE_SOLVER_EXPLAINED.md               # Deep dive: YouTube signature solving
├── SIGNATURE_ALGORITHM_EXAMPLE.md              # Code examples for signature algorithms
├── SIGNATURE_FLOW_DIAGRAM.md                   # Visual flowcharts and diagrams
├── SIGNATURE_QUICK_REFERENCE.md                # Quick reference for signature issue
├── BROWSER_CONSOLE_EXTRACTION.md               # Complete browser console extraction guide
├── BROWSER_CONSOLE_SIMPLE.md                   # Simplified quick-start guide
├── BROWSER_CONSOLE_VISUAL.md                   # Visual step-by-step guide with diagrams
├── YOUTUBE_TROUBLESHOOTING.md                  # YouTube download troubleshooting
├── SETUP_COMPLETE.md                           # Environment setup documentation
├── requirements.txt                            # Python dependencies
├── .env                                        # Environment configuration (gitignored)
├── .env.example                                # Environment configuration template
├── .gitignore                                  # Git ignore rules
├── cookies.txt                                 # YouTube authentication cookies (gitignored)
├── scripts/                                    # Implementation scripts
│   ├── extract_audio.py                       # YouTube audio extraction
│   ├── isolate_vocals.py                      # Vocal isolation (Demucs)
│   ├── translate_lyrics.py                    # Lyrics translation (Claude AI)
│   ├── complete_pipeline.py                   # Full pipeline orchestration
│   ├── setup_rvc.sh                           # RVC installation script
│   └── __init__.py                            # Package initialization
├── audio/                                      # Downloaded audio files (gitignored)
│   └── pamne-moi-ghurai.wav                   # Downloaded song
├── separated/                                  # Vocal isolation outputs (gitignored)
│   └── htdemucs/
│       └── pamne-moi-ghurai/
│           ├── vocals.wav                     # Isolated vocals
│           └── no_vocals.wav                  # Instrumental track
├── translated-lyrics/                          # Translated lyrics
│   └── pamne-moi-ghurai.txt                   # Assamese + English translation
├── output/                                     # Complete project folders (gitignored)
│   └── pamne-moi-ghurai_20251116/
│       ├── audio/                             # Original downloaded mix
│       ├── separated/                         # Isolated vocals
│       ├── training_data/                     # Ready for RVC training
│       ├── translation.txt                    # Full translation with context
│       ├── README.txt                         # RVC training instructions
│       └── NEXT_STEPS.txt                     # Quick start guide
├── rvc/                                        # RVC installation (gitignored, installed via setup_rvc.sh)
├── models/                                     # Trained RVC models (gitignored)
└── training-output/                            # RVC training session outputs
    ├── RVC_TRAINING_SESSION_20251119.md       # Training session documentation
    ├── pamne-moi-ghurai.pth                   # Trained voice model (300 epochs)
    ├── added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index  # FAISS index
    ├── total_fea.npy                          # Feature array (7442 x 768)
    └── simple_infer.py                        # Custom inference script for Apple Silicon
```

## Quick Start

### 1. Prerequisites

- Python 3.9 or 3.10
- NVIDIA GPU with 8GB+ VRAM (recommended)
- FFmpeg installed
- 50GB+ free disk space
- YouTube video URL (with artist consent)

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd vibe-cast

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate  # Linux/macOS
# OR
venv\Scripts\activate  # Windows

# Install PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys (ANTHROPIC_API_KEY required for translations)
```

### 3. Verify Setup

```bash
# Test GPU availability
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Test dependencies
python -c "import librosa, yt_dlp, demucs; print('Dependencies OK')"

# Check all required tools
ffmpeg -version  # Should show FFmpeg version
demucs --help    # Should show Demucs help
```

### 4. Get YouTube Audio (Browser Method - Recommended)

**Due to YouTube signature verification, the recommended approach is:**

1. Open YouTube video in your browser
2. Open Developer Console (Ctrl+Shift+J)
3. Run the extraction script provided in `BROWSER_CONSOLE_VISUAL.md`
4. Copy the generated `curl` command
5. Run it in Codespace terminal with cookies file

This bypasses signature solving issues. See `BROWSER_CONSOLE_SIMPLE.md` for step-by-step instructions.

### 5. Run Complete Pipeline

```bash
# Option A: Run full pipeline with your lyrics
python3 scripts/complete_pipeline.py "https://youtube.com/watch?v=..." path/to/assamese_lyrics.txt

# Option B: Run individual steps
# Step 1: Extract audio (if not using browser method)
python3 scripts/extract_audio.py "https://youtube.com/watch?v=..." --cookies cookies.txt

# Step 2: Isolate vocals
python3 scripts/isolate_vocals.py audio/your_song.wav htdemucs

# Step 3: Translate lyrics (requires ANTHROPIC_API_KEY in .env)
python3 scripts/translate_lyrics.py path/to/assamese_lyrics.txt --out-dir translations/

# Step 4: Set up RVC for voice cloning
bash scripts/setup_rvc.sh
cd rvc
python infer-web.py
```

## Features

### ✅ Implemented & Tested
- [x] YouTube audio extraction via browser console (signature solver workaround)
- [x] Vocal isolation using Demucs (htdemucs model)
- [x] Assamese to English lyrics translation (Claude AI)
- [x] Training data preparation for RVC
- [x] Complete project assembly and packaging
- [x] Comprehensive documentation (8+ guides)
- [x] RVC setup automation script
- [x] Environment configuration with API key protection
- [x] Git security (.gitignore for sensitive data)
- [x] End-to-end testing on real Assamese song

### In Development
- [x] RVC model training (completed with known issues - see below)
- [ ] Resolve HuBERT implementation mismatch (fairseq vs transformers)
- [ ] Singing voice synthesis integration (SO-VITS-SVC)
- [ ] Real-time voice conversion interface
- [ ] Web interface (Gradio)
- [ ] Batch processing optimization
- [ ] Voice quality metrics and analysis

### Known Issues
- **Robotic Background Noise**: Voice conversion output has metallic artifacts due to HuBERT implementation mismatch between training (transformers) and optimal inference (fairseq). See `training-output/RVC_TRAINING_SESSION_20251119.md` for detailed analysis and solutions.

### Documented Workarounds
- [x] YouTube signature solver issue (6 comprehensive guides)
- [x] Browser console extraction method (validated working)
- [x] FFmpeg audio conversion
- [x] Demucs model selection and training

### Success Stories (This Session)
✓ Successfully downloaded: "Paamone Moi Ghurai" (Assamese song)
✓ Successfully isolated vocals: Clean vocal extraction
✓ Successfully translated: Assamese → English (with poetic preservation)
✓ Successfully prepared: Complete RVC training project folder
✓ Successfully trained: RVC v2 voice model (300 epochs, 40kHz)
✓ Generated: FAISS index with 7442 x 768 feature vectors
✓ Documented: HuBERT implementation mismatch issue and solutions

## Documentation

### For Researchers & Understanding the Technology
- **[RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md)**: Comprehensive academic overview
  - Technology landscape
  - Ethical frameworks
  - Novel discoveries
  - Academic references

### For Developers & Implementation
- **[TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)**: Complete implementation guide
  - System requirements
  - Step-by-step setup
  - Code examples
  - Troubleshooting

### For YouTube Audio Extraction (Critical - Signature Solving)
- **[BROWSER_CONSOLE_SIMPLE.md](./BROWSER_CONSOLE_SIMPLE.md)**: ⭐ START HERE - 5-minute quick start
  - Simplest method to extract audio
  - Step-by-step with copy-paste code
  - No technical knowledge required

- **[BROWSER_CONSOLE_VISUAL.md](./BROWSER_CONSOLE_VISUAL.md)**: Visual guide with ASCII diagrams
  - Detailed walkthroughs with screenshots
  - Troubleshooting common errors
  - Real-world examples

- **[BROWSER_CONSOLE_EXTRACTION.md](./BROWSER_CONSOLE_EXTRACTION.md)**: Complete technical guide
  - Deep dive into the browser method
  - Why it works (bypasses signature solving)
  - Advanced techniques and alternatives

- **[SIGNATURE_SOLVER_EXPLAINED.md](./SIGNATURE_SOLVER_EXPLAINED.md)**: 385+ lines of technical depth
  - Why YouTube signatures are needed
  - How YouTube signature algorithms work
  - Why they fail in Codespace (headless environment)
  - Academic explanation with diagrams

- **[SIGNATURE_ALGORITHM_EXAMPLE.md](./SIGNATURE_ALGORITHM_EXAMPLE.md)**: Code examples
  - Real YouTube algorithm snippets
  - Reverse engineering walkthrough
  - Code patterns and anti-patterns

- **[SIGNATURE_FLOW_DIAGRAM.md](./SIGNATURE_FLOW_DIAGRAM.md)**: Visual flowcharts
  - Success and failure flow diagrams
  - Architecture diagrams
  - Timeline illustrations

- **[SIGNATURE_QUICK_REFERENCE.md](./SIGNATURE_QUICK_REFERENCE.md)**: TL;DR reference
  - Quick lookup for signature issues
  - FAQ format
  - Quick fixes and workarounds

### For YouTube Download Issues
- **[YOUTUBE_TROUBLESHOOTING.md](./YOUTUBE_TROUBLESHOOTING.md)**: Comprehensive troubleshooting
  - Common errors and solutions
  - Authentication issues
  - Format problems
  - Network issues

### For Setup & Environment
- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)**: Environment setup documentation
  - What was installed
  - Verification steps
  - Environment variables

### For RVC Training & Voice Cloning
- **[training-output/RVC_TRAINING_SESSION_20251119.md](./training-output/RVC_TRAINING_SESSION_20251119.md)**: Complete training session documentation
  - Model training details (300 epochs, v2, 40kHz)
  - HuBERT implementation mismatch analysis
  - Apple Silicon (M1/M2) workarounds
  - Custom inference script usage
  - Troubleshooting and next steps

### For Your Project
- **[output/pamne-moi-ghurai_20251116/README.txt](./output/pamne-moi-ghurai_20251116/README.txt)**: RVC training guide
  - How to train the voice model
  - Inference instructions
  - Post-processing guide

- **[output/pamne-moi-ghurai_20251116/NEXT_STEPS.txt](./output/pamne-moi-ghurai_20251116/NEXT_STEPS.txt)**: Quick start for voice cloning
  - Two options (local or cloud)
  - Estimated timeline
  - Troubleshooting

## Key Technologies

### Audio Extraction & Separation
- **yt-dlp**: YouTube video downloader with advanced features
- **Browser Console JavaScript**: Direct access to deciphered YouTube URLs (our recommended method)
- **FFmpeg**: Audio format conversion and stream extraction

### Voice Conversion & Cloning
- **RVC (Retrieval-based Voice Conversion)**: State-of-the-art voice cloning
- **Demucs**: SOTA music source separation (Facebook Research) - tested & verified working
- **SO-VITS-SVC**: Singing voice conversion with pitch preservation
- **GPT-SoVITS**: Few-shot voice cloning

### Audio Processing
- **Librosa**: Audio analysis and feature extraction
- **TorchAudio**: PyTorch audio processing
- **PyDub**: Audio manipulation

### AI/ML & Translation
- **PyTorch**: Deep learning framework
- **Claude AI (Anthropic)**: High-quality multilingual lyrics translation
- **HuBERT**: Self-supervised speech representation

### Development Tools
- **Python 3.12.1**: Latest Python runtime
- **Git**: Version control
- **Environment variables (.env)**: Secure configuration

## Ethical Framework

This project follows the **3Cs Framework**:

1. **Consent**: Explicit permission from voice owner
2. **Control**: Voice owner maintains control over usage
3. **Collaboration**: Work with artists and rights holders

### Recommended Approaches

**Option 1: Consent-Based** (Recommended)
- Contact original artist
- Obtain written permission
- Share results before publication
- Acknowledge contributions

**Option 2: Synthetic Testing**
- Use synthetic voices for testing
- Demonstrate technology without cloning specific artists
- Document methodology

**Option 3: Personal Voice**
- Record yourself singing the original
- Train model on your own voice
- Full pipeline with consented data

## Performance Metrics

### Technical Metrics
- **Voice Similarity**: Cosine similarity in embedding space
- **Mel-Cepstral Distortion (MCD)**: Spectral similarity
- **Pitch Accuracy**: F0 correlation
- **Intelligibility**: Word error rate

### Qualitative Metrics
- Naturalness of singing
- Emotional preservation
- Pronunciation accuracy
- Musical coherence

## Hardware Recommendations

### Minimum
- CPU: 4 cores
- RAM: 16GB
- GPU: NVIDIA GTX 1660 (6GB VRAM)
- Storage: 50GB SSD

### Recommended
- CPU: 8+ cores (Intel i7/AMD Ryzen 7)
- RAM: 32GB
- GPU: NVIDIA RTX 3060 (12GB VRAM) or better
- Storage: 100GB NVMe SSD

### Optimal
- CPU: 16+ cores (Intel i9/AMD Ryzen 9)
- RAM: 64GB
- GPU: NVIDIA RTX 4090 (24GB VRAM)
- Storage: 500GB NVMe SSD

## Trained Model Files

The `training-output/` directory contains the completed RVC voice model:

### Model Files
- **`pamne-moi-ghurai.pth`** - Trained RVC v2 model (300 epochs, 40kHz sample rate)
- **`added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index`** - FAISS index for voice retrieval
- **`total_fea.npy`** - Feature array (7442 x 768 dimensions)
- **`simple_infer.py`** - Custom inference script optimized for Apple Silicon

### Usage (Requires Python 3.10 for fairseq)

```bash
# Set up Python 3.10 environment with fairseq
python3.10 -m venv ~/rvc_py310_env
source ~/rvc_py310_env/bin/activate
pip install torch==2.2.2 torchaudio==2.2.2 fairseq==0.12.2
pip install faiss-cpu numpy scipy soundfile torchcrepe

# Run inference
python training-output/simple_infer.py \
  --model_path "training-output/pamne-moi-ghurai.pth" \
  --input_path "YOUR_INPUT.wav" \
  --output_path "OUTPUT.wav" \
  --index_path "training-output/added_IVF190_Flat_nprobe_1_pamne-moi-ghurai_v2.index" \
  --index_rate 0.75
```

### Current Limitation
The model produces robotic background noise due to HuBERT implementation mismatch. See [RVC_TRAINING_SESSION_20251119.md](./training-output/RVC_TRAINING_SESSION_20251119.md) for detailed analysis and potential solutions.

## Troubleshooting

### Common Issues

**CUDA Out of Memory**
```bash
# Reduce batch size in training settings
BATCH_SIZE=4
```

**Poor Vocal Isolation**
```bash
# Try different Demucs models
demucs --two-stems=vocals -n htdemucs_ft audio.wav
```

**Low Voice Quality**
- Use more training data (60+ seconds)
- Increase training epochs (500-1000)
- Ensure clean source audio (no background noise)

See [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md) for detailed troubleshooting.

## Contributing

This is a research project. Contributions welcome!

### Areas for Contribution
- Better phonetic alignment algorithms
- Improved Assamese language support
- Real-time voice conversion
- Web interface improvements
- Documentation and tutorials

### Guidelines
1. Follow ethical guidelines
2. Document your changes
3. Include tests where possible
4. Update relevant documentation

## License

See [LICENSE](./LICENSE) file for details.

### Third-Party Licenses
- RVC: MIT License
- Demucs: MIT License
- SO-VITS-SVC: MIT License
- PyTorch: BSD-style License

## Acknowledgments

### Research Papers
- BiSinger: Bilingual Singing Voice Synthesis
- Transinger: Cross-Lingual SVS via IPA
- RVC: Retrieval-based Voice Conversion

### Open Source Projects
- RVC-Boss/Applio
- facebook/demucs
- svc-develop-team/so-vits-svc

### Organizations
- Anthropic (Claude AI)
- Meta AI Research
- Hugging Face Community

## Contact & Support

### Questions?
- Check documentation first
- Open an issue on GitHub
- Join AI voice conversion communities

### Reporting Issues
Please include:
- System specifications
- Error messages
- Steps to reproduce
- Logs (if applicable)

## Roadmap

### Phase 1: Research ✅ (Complete)
- [x] Technology survey
- [x] Ethical framework development
- [x] Comprehensive documentation (9 guides)
- [x] YouTube signature solver investigation (solved)

### Phase 2: Implementation ✅ (Complete)
- [x] YouTube audio extraction (browser method)
- [x] Vocal isolation (Demucs integration)
- [x] Lyrics translation (Claude AI integration)
- [x] Complete pipeline assembly
- [x] RVC setup automation
- [x] Real-world testing (Assamese song successfully processed)
- [x] Environment security (.gitignore)
- [x] Project packaging and documentation

### Phase 3: Voice Cloning (In Progress)
- [x] RVC model training (300 epochs, v2 model)
- [x] FAISS index generation (7442 features)
- [x] Custom inference script for Apple Silicon
- [ ] Resolve HuBERT mismatch (fairseq vs transformers)
- [ ] Voice generation and synthesis (blocked by above)
- [ ] Audio mixing and post-processing
- [ ] Quality testing and validation

### Phase 4: Optimization (Future)
- [ ] Real-time processing
- [ ] Web interface (Gradio)
- [ ] Batch processing
- [ ] Performance optimization
- [ ] Multi-language support

### Phase 5: Advanced Features (Future)
- [ ] Emotion control
- [ ] Style transfer
- [ ] Phonetic alignment
- [ ] REST API development

## Citations

If you use this project in academic research, please cite:

```bibtex
@software{vibecast2025,
  title={Vibe-Cast: Cross-Lingual Song Translation with Voice Preservation},
  author={Your Name},
  year={2025},
  url={https://github.com/yourusername/vibe-cast}
}
```

## Disclaimer

This software is provided for educational and research purposes only. The authors and contributors:

- Do NOT endorse unauthorized use of copyrighted material
- Do NOT support voice cloning without consent
- Do NOT take responsibility for misuse of this technology
- REQUIRE users to obtain proper permissions and licenses

**Use at your own risk and responsibility.**

## Resources

### Documentation
- [RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md)
- [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)

### External Links
- [RVC Documentation](https://github.com/IAHispano/Applio/wiki)
- [Demucs GitHub](https://github.com/facebookresearch/demucs)
- [Anthropic Claude](https://www.anthropic.com/)

### Communities
- r/AIVoiceConversion
- RVC Discord Server
- Hugging Face Discussions

---

**Last Updated**: November 19, 2025
**Version**: 1.1.0
**Status**: Voice Model Trained (Quality Issues Under Investigation)

For detailed technical implementation, see [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)
