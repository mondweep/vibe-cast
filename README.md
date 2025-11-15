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
├── README.md                           # This file
├── RESEARCH_FINDINGS.md                # Comprehensive research documentation
├── TECHNICAL_IMPLEMENTATION_GUIDE.md   # Step-by-step technical guide
├── requirements.txt                    # Python dependencies
├── .env.example                        # Environment configuration template
├── .gitignore                          # Git ignore rules
├── scripts/                            # Implementation scripts
│   ├── extract_audio.py               # YouTube audio extraction
│   ├── isolate_vocals.py              # Vocal isolation
│   ├── prepare_training_data.py       # Data preprocessing
│   ├── translate_lyrics.py            # Lyrics translation
│   ├── complete_pipeline.py           # Full pipeline
│   └── analyze_voice.py               # Quality analysis
├── output/                             # Generated outputs (gitignored)
├── training_data/                      # Prepared training data (gitignored)
└── models/                             # Trained models (gitignored)
```

## Quick Start

### 1. Prerequisites

- Python 3.9 or 3.10
- NVIDIA GPU with 8GB+ VRAM (recommended)
- FFmpeg installed
- 50GB+ free disk space

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
# Edit .env with your API keys and settings
```

### 3. Verify Setup

```bash
# Test GPU availability
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Test dependencies
python -c "import librosa, yt_dlp, demucs; print('Dependencies OK')"
```

### 4. Basic Usage

**IMPORTANT: Only proceed if you have consent from the voice owner!**

```python
# Example: Complete pipeline
from scripts.complete_pipeline import run_pipeline

# Configuration
youtube_url = "YOUR_YOUTUBE_URL"  # With permission!
assamese_lyrics = """
[Your Assamese lyrics here]
"""

# Run pipeline
results = run_pipeline(youtube_url, assamese_lyrics)
```

## Features

### Implemented
- [x] YouTube audio extraction (yt-dlp)
- [x] Vocal isolation (Demucs)
- [x] Training data preparation
- [x] Lyrics translation (Claude AI)
- [x] Complete pipeline automation
- [x] Voice quality analysis
- [x] Comprehensive documentation

### In Development
- [ ] RVC model training automation
- [ ] Singing voice synthesis integration
- [ ] Phonetic alignment for timing
- [ ] Web interface (Gradio)
- [ ] Batch processing optimization
- [ ] Real-time voice conversion

## Documentation

### For Researchers
- **[RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md)**: Comprehensive academic overview
  - Technology landscape
  - Ethical frameworks
  - Novel discoveries
  - Academic references

### For Developers
- **[TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)**: Complete implementation guide
  - System requirements
  - Step-by-step setup
  - Code examples
  - Troubleshooting

## Key Technologies

### Voice Conversion
- **RVC (Retrieval-based Voice Conversion)**: State-of-the-art voice cloning
- **SO-VITS-SVC**: Singing voice conversion with pitch preservation
- **GPT-SoVITS**: Few-shot voice cloning (1 minute training data)

### Audio Processing
- **Demucs**: SOTA music source separation (Facebook Research)
- **Librosa**: Audio analysis and feature extraction
- **FFmpeg**: Audio format conversion

### AI/ML
- **PyTorch**: Deep learning framework
- **Claude AI**: High-quality lyrics translation
- **HuBERT**: Self-supervised speech representation

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
- Technology survey
- Ethical framework
- Documentation

### Phase 2: Implementation (Current)
- Basic pipeline automation
- RVC model training
- Quality testing

### Phase 3: Optimization (Planned)
- Real-time processing
- Web interface
- Batch processing
- Performance optimization

### Phase 4: Advanced Features (Future)
- Multi-language support
- Emotion control
- Style transfer
- API development

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

**Last Updated**: November 15, 2025
**Version**: 1.0.0
**Status**: Research Phase Complete

For detailed technical implementation, see [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)
