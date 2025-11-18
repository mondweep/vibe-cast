================================================================================
ULTIMATE RVC (JackismyShephard) - STEP-BY-STEP GUIDE
================================================================================

Space URL: https://huggingface.co/spaces/JackismyShephard/ultimate-rvc

Your Song: "Paamone Moi Ghurai" (Will I Get It Back?)
Training Data: vocals_full.wav (41 MB isolated vocals)
Translated Lyrics: English translations provided

================================================================================
INTERFACE OVERVIEW - ULTIMATE RVC
================================================================================

The Ultimate RVC Space has a different layout than standard RVC spaces:

MAIN SECTIONS:
1. Model Management (left sidebar or top)
2. Training Panel
3. Inference/Conversion Panel
4. Settings & Configuration

KEY TABS YOU'LL SEE:
• "Train" or "Training" - for training new voice models
• "Infer" or "Inference" - for converting audio with trained models
• "Models" - list of your trained models
• "Settings" - configuration options

================================================================================
BEFORE YOU START - PREPARE YOUR FILES
================================================================================

Make sure you have these ready:

1. Training Audio:
   File: vocals_full.wav (41 MB)
   Location: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/training_data/vocals_full.wav
   Requirements:
     ✓ .WAV format (required)
     ✓ Clean isolated vocals (you have this!)
     ✓ 10-500 MB size (41 MB is perfect)

2. English Lyrics (for reference):
   File: translation.txt
   Location: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/translation.txt

3. Original Audio (for mixing later):
   File: pamne-moi-ghurai.wav
   Location: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/audio/

================================================================================
STEP 1: CLICK "USE THIS SPACE"
================================================================================

1. On the Space page, look for "Use this Space" button (blue button)
2. Click it
3. You may need to sign in with HuggingFace account (use GitHub login)
4. Wait for Space to load (30-60 seconds)
5. You'll see the Ultimate RVC interface load

================================================================================
STEP 2: NAVIGATE TO TRAINING TAB
================================================================================

In the Ultimate RVC interface:

1. Look for "Train" tab at the top or left sidebar
2. Click to open Training panel

YOU'LL SEE (approximate layout):
├── Model Configuration
│   ├── Model Name input field
│   ├── Sample Rate dropdown (40k or 48k)
│   └── Other settings
├── Training Audio Upload
│   ├── Upload button or drag-drop area
│   └── File preview
├── Training Parameters
│   ├── Epochs (number of training iterations)
│   ├── Batch Size
│   └── Learning Rate
└── Start Training button

================================================================================
STEP 3: CONFIGURE YOUR MODEL
================================================================================

FILL IN THESE FIELDS:

1. MODEL NAME:
   • Input: "pamne-moi-ghurai"
   • This identifies your trained model

2. SAMPLE RATE:
   • Select: "40k" or "48k"
   • Either works, 40k is standard for RVC
   • Don't change unless you have a reason

3. OTHER SETTINGS (if shown):
   • Voice Quality: Leave as default
   • Preprocessing: Usually automatic
   • F0 Method: Leave as default (usually "pm" or "harvest")

================================================================================
STEP 4: UPLOAD TRAINING AUDIO
================================================================================

CRITICAL STEP - Upload your vocals:

1. LOCATE UPLOAD AREA:
   • Look for "Upload Audio" or "Browse Files" button
   • Or drag-and-drop area saying "Drop file here"

2. SELECT YOUR FILE:
   • File: vocals_full.wav
   • Path: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/training_data/vocals_full.wav

3. HOW TO GET THE FILE TO YOUR COMPUTER:
   
   Since vocals_full.wav is in Codespace, you need to download it first:
   
   IN CODESPACE TERMINAL:
   • Click "Files" icon (left sidebar)
   • Navigate to: output/pamne-moi-ghurai_20251116/training_data/
   • Right-click "vocals_full.wav"
   • Select "Download"
   • File will download to your computer's Downloads folder

4. UPLOAD TO HF SPACE:
   • In Ultimate RVC upload area
   • Click "Browse" or drag-drop
   • Select the downloaded vocals_full.wav
   • Wait for upload (2-5 minutes for 41 MB)
   • Should show "Upload complete" or file preview

================================================================================
STEP 5: SET TRAINING PARAMETERS
================================================================================

YOU'LL SEE THESE OPTIONS:

EPOCHS:
  • What is it: Number of times model trains on data
  • Value to use: 300
  • Why 300: Good balance between quality and speed (2-3 hours)
  • Can increase to 500 for better quality (4-6 hours)
  • Minimum: 100 (will be quick but lower quality)

BATCH SIZE:
  • Default: Usually 16-32 (don't change)
  • If error about memory: Reduce to 8
  • What it means: How many audio chunks processed at once

LEARNING RATE:
  • Default: 0.0001 or similar (don't change)
  • Leave as default unless you have ML experience

SAVE INTERVAL:
  • Default: 10-20 (save progress every N epochs)
  • Leave as default

RECOMMENDED SETTINGS FOR YOUR PROJECT:
  Model Name: pamne-moi-ghurai
  Sample Rate: 40k
  Epochs: 300
  Batch Size: (leave default)
  All other settings: (leave default)

================================================================================
STEP 6: START TRAINING
================================================================================

1. CLICK "START TRAINING" BUTTON:
   • Button location: Bottom of Training panel (usually red/green)
   • Look for text: "Start", "Train", "Begin Training"

2. CONFIRM (if prompted):
   • You may see confirmation dialog
   • Click "Yes" or "Confirm"

3. TRAINING BEGINS:
   • You'll see console output or progress bar
   • Shows: Current epoch, loss value, ETA remaining
   • DON'T CLOSE BROWSER during training

================================================================================
STEP 7: MONITOR TRAINING PROGRESS
================================================================================

WHAT TO EXPECT:

Progress Display:
  • Epoch counter: "Epoch 50/300", "Epoch 100/300", etc.
  • Loss value: Should DECREASE over time (good sign)
  • ETA: Remaining time (usually updates every epoch)
  • GPU utilization: Shows GPU usage %

TRAINING TIMES:
  • 300 epochs: ~2-3 hours
  • 500 epochs: ~4-6 hours
  • May be faster/slower depending on HF GPU queue

WHAT TO WATCH:

✓ GOOD SIGNS:
  • Loss decreasing steadily (1.5 → 1.2 → 0.9)
  • Progress bar moving smoothly
  • No red error text
  • GPU usage 90%+ (means it's working)

✗ PROBLEMS TO WATCH:
  • Loss staying flat or increasing (not learning)
  • "CUDA out of memory" error
  • Training speed very slow (< 1 epoch/minute)
  • Browser disconnection/timeout

WHAT TO DO IF PROBLEM:
  • Wait 5 minutes (sometimes it recovers)
  • If error: Stop training, check file format
  • If speed very slow: May be GPU queue backlog, wait
  • If CUDA error: Reduce batch size and restart

================================================================================
STEP 8: TRAINING COMPLETE
================================================================================

WHEN FINISHED:

You'll see:
  • "Training Complete" or similar message
  • Progress bar at 100%
  • Console output stops

MODEL IS AUTO-SAVED:
  • Stored in HF Space
  • Available for inference immediately
  • Size: ~300-400 MB (stored on HF servers)

CHECK MODELS:
  • Go to "Models" tab
  • You should see "pamne-moi-ghurai"
  • Status: Ready for inference

================================================================================
STEP 9: GENERATE ENGLISH VOICE (INFERENCE)
================================================================================

Now use your trained model!

1. NAVIGATE TO INFERENCE TAB:
   • Click "Infer" or "Inference" tab
   • Wait for interface to load

2. SELECT YOUR MODEL:
   • Look for dropdown: "Select Model" or "Choose Model"
   • Select: "pamne-moi-ghurai" (your trained model)

3. UPLOAD AUDIO FOR CONVERSION:
   • Option A: Use original vocals (simplest)
     Upload: vocals_full.wav (original isolated vocals)
     Result: English version of original singing
   
   • Option B: Record new audio (advanced)
     Record yourself singing English lyrics to original melody
     Upload: your recording (WAV format)
     Result: Original singer's voice singing your English lyrics

4. ADJUST PARAMETERS:
   • Pitch: 0 (leave as default unless you want higher/lower)
   • Tone/Index: 0-1 (leave as default)
   • F0 Method: Leave as default
   • Output Format: WAV (for best quality)

5. CLICK "CONVERT" or "GENERATE":
   • Button labeled "Infer", "Convert", or "Generate"
   • Processing starts (30 seconds - 2 minutes)
   • Progress bar shows conversion

6. DOWNLOAD OUTPUT:
   • Output audio appears (play button visible)
   • Download button visible
   • File: Usually named "output.wav" or similar
   • Download to your computer

================================================================================
STEP 10: POST-PROCESS & CREATE FINAL AUDIO
================================================================================

YOU NOW HAVE:
  • Generated English voice (from RVC)
  • Original instrumental track
  • English lyrics (reference)

CREATE FINAL SONG:

1. DOWNLOAD YOUR GENERATED VOICE:
   • From HF Space inference output
   • Save as: "generated_english_voice.wav"

2. EXTRACT INSTRUMENTAL (in Codespace):
   ffmpeg -i audio/pamne-moi-ghurai.wav -vn separated/instrumental.wav

3. MIX VOICE + INSTRUMENTAL:
   ffmpeg -i generated_english_voice.wav -i separated/instrumental.wav \
          -filter_complex "amix=inputs=2:duration=first" final_mix.wav

4. ADD EFFECTS (optional, makes it sound professional):
   Use Audacity (free):
   • Open: final_mix.wav
   • Add reverb (Effect → Reverb, select light reverb)
   • Boost treble slightly (Effect → Equalization)
   • Export as MP3

5. FINAL EXPORT:
   ffmpeg -i final_mix.wav -q:a 0 final_song.mp3

RESULT:
  • File: final_song.mp3
  • Content: Your song in English, original singer's voice!

================================================================================
TROUBLESHOOTING - ULTIMATE RVC SPECIFIC
================================================================================

PROBLEM: Can't find Upload button
  SOLUTION:
  • Scroll down in Training tab
  • May be called "Browse Files" or have drag-drop area
  • Try right-click to open file browser

PROBLEM: Training won't start
  SOLUTION:
  • Ensure file is .wav format (not mp3, not flac)
  • File size between 10-500 MB
  • Try different sample rate (40k vs 48k)
  • Wait 1 minute and try again

PROBLEM: "File format not supported" error
  SOLUTION:
  • File must be .wav
  • Convert if needed:
    ffmpeg -i vocals_full.mp3 vocals_full.wav
  • Try re-uploading converted file

PROBLEM: Training is very slow (1 hour per epoch)
  SOLUTION:
  • HF GPU queue might be busy
  • Try again at different time
  • Or use local RVC installation (faster if you have GPU)

PROBLEM: Can't find trained model in Inference tab
  SOLUTION:
  • Wait 2 minutes for model to save
  • Refresh page
  • Check "Models" tab first to verify it saved
  • Try different RVC space if still missing

PROBLEM: Generated voice sounds robotic/unnatural
  SOLUTION:
  • Increase epochs (train again with 500 instead of 300)
  • Use more/better quality training data
  • Try lower Tone parameter (0.5 instead of 1)
  • Ensure original training audio was clean

PROBLEM: Connection timeout (stuck on "Loading...")
  SOLUTION:
  • Refresh browser (F5)
  • Try different browser
  • Check internet connection
  • HF servers might be overloaded, try in few minutes

================================================================================
QUICK REFERENCE - ULTIMATE RVC WORKFLOW
================================================================================

1. Go to: https://huggingface.co/spaces/JackismyShephard/ultimate-rvc
2. Click: "Use this Space"
3. Download: vocals_full.wav to your computer
4. Go to: Training tab
5. Fill: Model name "pamne-moi-ghurai", Sample rate "40k"
6. Upload: vocals_full.wav
7. Set: Epochs 300
8. Click: "Start Training"
9. Wait: 2-3 hours (monitor progress)
10. Go to: Inference tab
11. Select: "pamne-moi-ghurai" model
12. Upload: vocals_full.wav (or your recording)
13. Click: "Convert"
14. Download: output.wav
15. Mix: with instrumental in Codespace
16. Export: final MP3

TOTAL TIME: 2-3 hours (mostly training, passive)

================================================================================
YOUR ENGLISH LYRICS - SINGING GUIDE
================================================================================

If you want to record yourself singing English lyrics (advanced):

LYRICS TO SING:
Will I get it back?
Once again in life,
That image (of me), reflected in my father's eyes.
The treasure of my heart.
When (my mind) shatters from all the thinking,
Perhaps one needs a bosom (heart) to take rest.
The fragrance still lingers on my body,
The warm touch of those two hands.

HOW TO USE:
1. Listen to original song (your audio/pamne-moi-ghurai.wav)
2. Learn the melody
3. Sing the English lyrics to the same melody
4. Record yourself (use Voice Memos, Audacity, GarageBand)
5. Save as: english_vocals.wav
6. Upload to RVC Inference
7. RVC converts your voice to original singer's voice
8. Result: Professional sounding English version!

================================================================================
FINAL CHECKLIST
================================================================================

Before Starting:
  ☐ HuggingFace account (free, sign up if needed)
  ☐ Downloaded vocals_full.wav to your computer
  ☐ Internet connection stable
  ☐ Browser ready (Chrome or Firefox recommended)

During Training:
  ☐ Don't close browser
  ☐ Don't stop/refresh training
  ☐ Check every 30 min if desired
  ☐ Note the training time (useful for future reference)

After Training:
  ☐ Model appears in inference
  ☐ Download generated audio
  ☐ Download from Codespace: instrumental track
  ☐ Mix tracks using ffmpeg
  ☐ Export final MP3
  ☐ Save your final song!

================================================================================
HELP & RESOURCES
================================================================================

Questions about Ultimate RVC?
• Space page comments/discussions
• GitHub repo: JackismyShephard/ultimate-rvc

Questions about your song?
• Check: /workspaces/vibe-cast/HUGGINGFACE_SPACES_GUIDE.md
• Check: /workspaces/vibe-cast/output/pamne-moi-ghurai_20251116/README.txt

Technical help in Codespace?
• See: /workspaces/vibe-cast/TECHNICAL_IMPLEMENTATION_GUIDE.md

================================================================================
YOU'RE READY! GO TRAIN YOUR MODEL 🎵
================================================================================

Next steps:
1. Go to Ultimate RVC Space
2. Follow Step 1 (Click "Use this Space")
3. Come back here if you get stuck
4. Training will take 2-3 hours
5. Enjoy your English version!

Good luck! Questions? This guide has all the answers!

================================================================================
