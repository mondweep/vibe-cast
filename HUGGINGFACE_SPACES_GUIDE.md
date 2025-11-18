================================================================================
HUGGINGFACE SPACES RVC TRAINING - COMPLETE GUIDE
================================================================================

Your Song: "Paamone Moi Ghurai" (Will I Get It Back?)
Training Data: vocals_full.wav (41 MB isolated vocals)
Output Goal: English singing voice with your voice characteristics

================================================================================
STEP 1: FIND & OPEN HUGGINGFACE SPACES RVC
================================================================================

1. Go to HuggingFace Spaces:
   https://huggingface.co/spaces

2. Search for "RVC" in the search bar
   (or use direct link if available)

3. Recommended Spaces (any of these work):
   - "RVC-Spaces" (official)
   - "RVC Inference" 
   - "Voice Cloning RVC"
   - "Applio RVC Spaces"

4. Click "Use this Space" (you may need to sign in with GitHub/HF account)

5. Wait for the Space to load (may take 30 seconds - 2 minutes)

================================================================================
STEP 2: UNDERSTAND THE RVC INTERFACE LAYOUT
================================================================================

Most RVC Spaces have these tabs/sections:

TRAINING TAB:
  • Create new voice model
  • Upload training audio
  • Set training parameters (epochs, batch size, etc.)
  • Start training button
  • Training progress monitor

INFERENCE TAB:
  • Select trained model
  • Upload audio to convert
  • Adjust voice characteristics (pitch, tone, etc.)
  • Generate output
  • Download converted audio

MODELS TAB:
  • List of your trained models
  • Delete or manage models
  • Download trained models

================================================================================
STEP 3: CREATE A NEW MODEL FOR TRAINING
================================================================================

In the TRAINING tab:

1. FILL IN MODEL NAME:
   • Name: "pamne-moi-ghurai" (or any name you prefer)
   • This is how you'll identify your trained model

2. SELECT SAMPLE RATE:
   • Choose: 40k or 48k (doesn't matter much, 40k is standard)
   • This is the quality level of your model

3. UPLOAD TRAINING AUDIO:
   • File: vocals_full.wav (your 41 MB isolated vocals)
   • Location: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/training_data/vocals_full.wav
   
   IMPORTANT: 
   ✓ File must be .wav format
   ✓ 41 MB is PERFECT for training
   ✓ Clean vocals only (no background music) ✓ You have this!
   
   HOW TO UPLOAD:
   • Click "Upload" or drag-and-drop
   • Wait for upload to complete (may take 2-5 minutes over internet)
   • Should show "Upload complete" message

4. SET TRAINING PARAMETERS:

   EPOCHS (critical parameter):
   • Value to use: 300-500
   • What it means: Number of training iterations
   • 300 epochs = ~2-3 hours training time (faster)
   • 500 epochs = ~4-6 hours training time (better quality)
   • Recommendation: Start with 300, increase if quality is poor
   
   BATCH SIZE:
   • Default: 16-32 (don't change unless HF recommends)
   • Batch size = how many audio chunks processed at once
   • Smaller = slower but more memory efficient
   • Larger = faster but uses more GPU memory

   SAVE INTERVAL:
   • Default: 10-20 (save checkpoint every N epochs)
   • Recommendation: Keep default
   • This lets you stop early if quality is good

5. CLICK "START TRAINING":
   • Training begins immediately
   • You'll see progress bar/console output
   • DO NOT close the browser during training

================================================================================
STEP 4: MONITOR TRAINING PROGRESS
================================================================================

WHAT YOU'LL SEE:

During Training:
  • Progress bar showing epoch count (e.g., "Epoch 50/300")
  • Loss values (should decrease over time - this is good)
  • ETA remaining time
  • GPU memory usage
  • Speed (steps per second)

Training Times:
  • 300 epochs: ~2-3 hours
  • 500 epochs: ~4-6 hours
  • Times vary based on HF GPU availability

WHAT TO WATCH FOR:

✓ Good Signs:
  • Loss decreasing steadily (lower is better)
  • Progress bar advancing smoothly
  • No error messages

✗ Problems:
  • Loss staying flat/increasing = model not learning
  • Error messages appearing = upload/config issue
  • Long stalls = GPU busy/throttled

IF TRAINING FAILS:
  • Click "Stop" or refresh browser
  • Check file format (must be .wav)
  • Try different HF Space (different GPU)
  • Reduce epochs to 100 for testing

================================================================================
STEP 5: AFTER TRAINING COMPLETES
================================================================================

When training finishes (you'll see "Training complete" message):

1. TRAINED MODEL IS AUTO-SAVED
   • Stored in HF Space
   • Available for inference immediately
   • Should appear in MODELS tab

2. CHECK MODELS TAB:
   • You should see "pamne-moi-ghurai" listed
   • Click it to select for inference

3. OPTIONAL: DOWNLOAD MODEL (for local use)
   • Some Spaces allow downloading
   • Format: .pth file (PyTorch model)
   • Size: ~300-400 MB

================================================================================
STEP 6: GENERATE ENGLISH SINGING VOICE (INFERENCE)
================================================================================

Now you have a voice model trained on your original singer!

IN INFERENCE TAB:

1. SELECT YOUR TRAINED MODEL:
   • Dropdown menu should show "pamne-moi-ghurai"
   • Click to select it

2. UPLOAD OR SELECT REFERENCE AUDIO:
   • Option A: Use original vocals
     File: vocals_full.wav (or separated/vocals.wav)
     Why: RVC will learn timing and melody from original
   
   • Option B: Create new singing audio
     Record yourself singing the English lyrics
     Upload that file
     Why: RVC will convert your recording to original singer's voice

3. ADJUST VOICE PARAMETERS (if available):
   • Pitch: 0 (or adjust ±12 for higher/lower)
   • Tone: 0-1 (0 = original singer, 1 = more synthesis)
   • Volume: -5 to +5 dB
   • Recommendation: Leave at defaults first, adjust if needed

4. SET OUTPUT FORMAT:
   • Format: WAV or MP3
   • Sample rate: 40k or 48k (match training)
   • Recommendation: WAV for quality

5. CLICK "CONVERT" or "GENERATE":
   • Processing starts
   • Takes 30 seconds - 2 minutes depending on audio length
   • Shows progress

6. DOWNLOAD OUTPUT:
   • Generated audio will appear
   • Shows as player + download button
   • File: something like "output.wav"

================================================================================
STEP 7: USE YOUR TRANSLATED LYRICS WITH THE GENERATED VOICE
================================================================================

YOU HAVE: Generated English singing voice (from RVC)
YOU WANT: English song with your translated lyrics

OPTION A: USE LYRICS FOR REFERENCE (Recommended First)
1. Reference file: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/translation.txt
2. Read through translations while listening to generated voice
3. Adjust if needed (pitch, timing, etc.) in post-processing

OPTION B: RECORD NEW VOCAL WITH ENGLISH LYRICS (Advanced)
1. Read English lyrics from translation.txt
2. Record yourself singing along to original song melody
   • Use original vocals as backing track
   • Sing English lyrics to original melody
   • Save as WAV file
3. Upload to RVC inference
4. Convert with trained model
5. Now you have: Original singer's voice singing English lyrics!

================================================================================
STEP 8: POST-PROCESSING & FINAL MIX
================================================================================

WHAT YOU NOW HAVE:
• Generated voice (English lyrics in original singer's voice)
• Original instrumental track
• Your translated lyrics file (reference)

CREATE FINAL AUDIO:

1. EXTRACT INSTRUMENTAL FROM ORIGINAL:
   In Codespace:
   ffmpeg -i audio/pamne-moi-ghurai.wav -vn separated/instrumental.wav

2. MIX GENERATED VOICE + INSTRUMENTAL:
   ffmpeg -i generated_voice.wav -i separated/instrumental.wav \
          -filter_complex "amix=inputs=2:duration=first" final_mix.wav

3. ADD EFFECTS (OPTIONAL - makes it sound more polished):
   Use Audacity (free) or GarageBand:
   • Add light reverb (200-400ms)
   • Light EQ (boost treble slightly)
   • Slight compression (to even out volume)

4. EXPORT FINAL MP3:
   ffmpeg -i final_mix.wav -q:a 0 final_song.mp3

================================================================================
STEP 9: TROUBLESHOOTING COMMON ISSUES
================================================================================

PROBLEM: Training won't start
  → Check file is .wav format
  → File must be 10-500 MB
  → Try uploading again
  → Try different HF Space

PROBLEM: Training crashes mid-way
  → GPU memory exceeded
  → Reduce batch size to 8
  → Reduce epochs to 200
  → Try again

PROBLEM: Generated voice sounds robotic/unnatural
  → Increase epochs (train longer, up to 500-1000)
  → Use more training data (you have 41 MB, that's good)
  → Try lower "tone" parameter in inference
  → Sample rate mismatch - ensure 40k or 48k consistent

PROBLEM: Generated voice doesn't sound like original singer
  → Training data quality: ensure vocals_full.wav is CLEAN
  → More epochs needed: try 500 instead of 300
  → Check pitch parameter in inference (should be 0 or ±1-2)

PROBLEM: File upload taking too long
  → Check internet connection
  → 41 MB should take 2-5 minutes
  → Try different browser or wired connection

PROBLEM: Can't find trained model in inference tab
  → Wait 30-60 seconds for model to save
  → Refresh page
  → Try different HF Space
  → Model might be in separate "Models" tab

================================================================================
STEP 10: YOUR TRANSLATED LYRICS FOR REFERENCE
================================================================================

During inference, you may want to reference your English lyrics.
Here's what you provided (summarized themes):

Song theme: Longing for father's love, nostalgia, lost memories
Key lines translated to English cover themes of:
  • Asking "Will I get it back?" (main theme)
  • Childhood memories of father's eyes
  • Fragrance of mother's touch lingering
  • Pain of closeness without connection
  • Emotional vulnerability

When generating voice with English lyrics:
• Sing/record these English translations to original melody
• RVC will convert your voice to original singer's characteristics
• Result: Professional sounding English cover in original singer's voice

================================================================================
COMPLETE WORKFLOW SUMMARY
================================================================================

1. HuggingFace Spaces → Training Tab
2. Upload: vocals_full.wav
3. Set: 300-500 epochs
4. Train: 2-6 hours (automatic)
5. Inference Tab
6. Generate: English singing voice
7. Download: output.wav
8. Mix: with instrumental
9. Polish: optional effects
10. Export: final MP3

TOTAL TIME: 2-6 hours (mostly training)

================================================================================
WHAT MAKES THIS WORK
================================================================================

Why HuggingFace Spaces?
✓ Free GPU (you don't need to own expensive hardware)
✓ Already configured (no installation needed)
✓ Web UI (just browser, no command line)
✓ Saves models (can reuse trained model)
✓ Fast training (professional GPUs)

Why this approach for voice cloning?
✓ Your training data: 41 MB (excellent for RVC)
✓ Quality vocal isolation: Demucs extraction (very clean)
✓ Translation ready: English lyrics prepared
✓ Time efficient: 2-6 hours vs. days for manual work

================================================================================
FINAL CHECKLIST
================================================================================

Before starting HF training:
  ☑ vocals_full.wav ready (41 MB, isolated vocals)
  ☑ English lyrics translated (from translation.txt)
  ☑ HuggingFace account created
  ☑ Browser ready for 6+ hour session
  ☑ Internet connection stable

During training:
  ☑ Don't close browser
  ☑ Check progress every 30 minutes
  ☑ Note any error messages

After training:
  ☑ Download generated voice
  ☑ Extract instrumental
  ☑ Mix together
  ☑ Add effects (optional)
  ☑ Export final MP3

================================================================================
NEXT STEPS
================================================================================

1. Go to: https://huggingface.co/spaces
2. Search for: "RVC"
3. Click: "Use this Space"
4. Follow this guide from STEP 1

Questions? Check README files:
• /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/README.txt
• /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/NEXT_STEPS.txt

Good luck! Your voice clone will be ready in 2-6 hours! 🎵

================================================================================
