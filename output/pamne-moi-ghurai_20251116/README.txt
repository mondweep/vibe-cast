================================================================================
VIBE-CAST PROJECT: Paamone Moi Ghurai
================================================================================

PROJECT NAME: pamne-moi-ghurai_20251116
CREATED: 2025-11-16
SONG: "Will I Get It Back?" (Assamese)
ARTIST: [Original artist]
TASK: Voice Cloning & English Translation

================================================================================
PROJECT DIRECTORY STRUCTURE
================================================================================

pamne-moi-ghurai_20251116/
├── audio/                      # Original downloaded audio
│   └── pamne-moi-ghurai.wav
├── separated/                  # Isolated vocals from Demucs
│   └── vocals.wav
├── training_data/              # Ready for RVC model training
│   └── vocals_full.wav
├── translation.txt             # Assamese lyrics + English translation
└── README.txt                  # This file

================================================================================
FILES GENERATED & DESCRIPTIONS
================================================================================

1. audio/pamne-moi-ghurai.wav (42.8 MB)
   - Original downloaded audio from YouTube
   - Full stereo mix (vocals + instruments)
   - Used as reference for vocal isolation

2. separated/vocals.wav
   - Isolated vocal track extracted using Demucs (htdemucs model)
   - Clean vocals without background music
   - Quality suitable for training voice models

3. training_data/vocals_full.wav
   - Copy of isolated vocals prepared for RVC training
   - This is the primary file for voice model training
   - Recommended: 300-500 epoch training

4. translation.txt
   - Original Assamese lyrics with line-by-line English translation
   - Includes translation notes and cultural context
   - Suitable for generating English singing voice

================================================================================
NEXT STEPS: VOICE CLONING WITH RVC
================================================================================

STEP 1: Install RVC (if not already installed)
--------
Choose one of the following RVC implementations:

Option A - Applio Web UI (Recommended for beginners):
  git clone https://github.com/IAHispano/Applio.git
  cd Applio
  python app.py
  # Opens web UI in browser

Option B - Official RVC WebUI:
  git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI.git
  cd Retrieval-based-Voice-Conversion-WebUI
  python infer-web.py

STEP 2: Prepare Training Data
--------
In RVC web UI:
1. Click "Training" tab
2. Create new model with name: "pamne-moi-ghurai"
3. Upload training audio: training_data/vocals_full.wav
4. Set training parameters:
   - Epochs: 300-500 (more = better quality, longer time)
   - Batch size: 16-32 (adjust based on GPU memory)
   - Save interval: 10-20 epochs

STEP 3: Train Voice Model
--------
1. Click "Start Training" in RVC UI
2. Monitor training progress (will show epoch count)
3. Estimated time: 2-6 hours (depending on GPU and epochs)
4. Once complete, model will be saved automatically

STEP 4: Generate English Singing Voice
--------
After model training:
1. Go to "Inference" tab
2. Load trained model: "pamne-moi-ghurai"
3. Input audio: Reference vocal track (or re-use training_data/vocals_full.wav)
4. Output: Generate voice with trained model
5. Result: AI-generated English singing voice in original singer's style

STEP 5: Post-Processing & Final Mix
--------
1. Extract instrumental track from original:
   ffmpeg -i audio/pamne-moi-ghurai.wav -vn -af "aformat=channel_layouts='stereo'" -q:a 9 instrumental.mp3

2. Mix generated voice with instrumental:
   ffmpeg -i generated_voice.wav -i instrumental.mp3 -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[out]" -map "[out]" final_mix.wav

3. Add effects (optional):
   - Reverb, EQ, compression for polish
   - Use Audacity or DAW for professional mixing

4. Export final audio:
   ffmpeg -i final_mix.wav -q:a 0 final_song.mp3

================================================================================
TRAINING TIPS & BEST PRACTICES
================================================================================

Audio Quality:
✓ Use the isolated vocals (training_data/vocals_full.wav)
✓ Ensure clean audio without background noise
✓ 44100 Hz or 48000 Hz sample rate recommended

Training Duration:
✓ 300 epochs: ~6 hours (good quality)
✓ 500 epochs: ~10 hours (excellent quality)
✓ Start with 300, increase if quality is insufficient

Hardware Requirements:
✓ GPU strongly recommended (NVIDIA CUDA or similar)
✓ VRAM: 4GB minimum, 6GB+ recommended
✓ Without GPU: Training will be very slow (24+ hours)

Quality Checks:
✓ After training, generate short 10-second sample
✓ Listen for naturalness and voice similarity
✓ If quality is poor, increase epochs and retrain

================================================================================
ETHICAL CONSIDERATIONS & DISCLAIMERS
================================================================================

✓ ALWAYS obtain consent from original artist before voice cloning
✓ Label AI-generated content clearly ("AI Cover" / "Voice Clone")
✓ Do NOT use for commercial purposes without artist permission
✓ Use for research, educational, and personal projects only
✓ Do NOT impersonate or deceive listeners about voice origin
✓ Respect copyright and intellectual property rights

This tool is for ethical, consensual use only. Unauthorized voice cloning or
AI impersonation may violate copyright and ethical standards.

================================================================================
TROUBLESHOOTING
================================================================================

Problem: Training is very slow
→ Solution: Check GPU is being used (nvidia-smi in terminal)
→ If CPU only: Consider reducing epochs or batch size

Problem: Generated voice sounds robotic/unnatural
→ Solution: Increase training epochs (retrain with 500+ epochs)
→ Check training audio quality (should be clean vocals only)

Problem: Voice doesn't sound like original singer
→ Solution: Ensure training data is clean isolated vocals
→ Increase training duration
→ Try different RVC model versions

Problem: VRAM out of memory
→ Solution: Reduce batch size (16 → 8)
→ Close other GPU applications
→ Reduce epochs (500 → 300)

================================================================================
ADDITIONAL RESOURCES
================================================================================

RVC GitHub: https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
Applio: https://github.com/IAHispano/Applio
Demucs (audio separation): https://github.com/facebookresearch/demucs

================================================================================
