# Music Video Noise Removal

Audio cleanup pipeline for live performance phone recordings. Targets the metallic hissing and background noise caused by hall reflections and phone microphone limitations. Uses FFmpeg.

## Problem

A live orchestra/singing performance recorded on a phone in a hall picks up:
- Metallic hissing/ringing from high-frequency reflections off hard hall surfaces
- Steady background hiss from the phone mic amplifying room ambience
- Hall reverb tails that blur the audio

## Prerequisites

- **ffmpeg** (with ffprobe) installed on your system
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: [ffmpeg.org/download](https://ffmpeg.org/download.html)

## Quick Start

```bash
# 1. Place your video in the input/ directory
cp /path/to/your/video.mp4 input/source.mp4

# 2. Run the pipeline
./process.sh

# 3. Find the cleaned video in output/
ls output/
```

To use a different filename:
```bash
./process.sh my-concert.mp4
```

## Processing Pipeline

The script applies 6 stages sequentially:

| Stage | Filter | What it does |
|-------|--------|-------------|
| 1 | High-pass / Low-pass | Removes low rumble and high-frequency hiss |
| 2 | FFT Denoise (`afftdn`) | Reduces steady background hiss (broadband noise) |
| 3 | Metallic Resonance EQ (`equalizer`) | Cuts the harsh metallic frequencies (2-5kHz) caused by hall reflections |
| 4 | Dereverberation (`anlmdn`) | Suppresses hall echo and reverb tails |
| 5 | Dynamic Compression | Gently evens out level jumps from processing |
| 6 | Loudness Normalization | Brings output to standard broadcast loudness |

The original video is copied without re-encoding (fast, lossless). Only the audio is processed.

## Tuning Guide

All parameters are in `config.env`. Edit values and re-run `./process.sh`.

### If metallic/tinny sound persists

Increase the EQ cut depth on the harshness bands:
```bash
# In config.env — make the cuts deeper
METAL_EQ_BAND1_GAIN=-8     # stronger cut at 2.5kHz
METAL_EQ_BAND2_GAIN=-6     # stronger cut at 4.5kHz
```

Or widen the cut to catch a broader range:
```bash
METAL_EQ_BAND1_Q=0.8       # wider Q = broader frequency cut
```

### If background hiss persists

Increase FFT denoise level:
```bash
DENOISE_LEVEL=25           # heavy (listen for artifacts)
DENOISE_LEVEL=30           # very heavy
```

### If you still hear echo/reverb

Increase dereverberation strength:
```bash
DEREVERB_STRENGTH=0.005    # moderate
DEREVERB_STRENGTH=0.01     # strong
DEREVERB_STRENGTH=0.05     # very aggressive (may affect music quality)
```

For a large hall, also increase the patch radius:
```bash
DEREVERB_PATCH=0.08        # catches longer reverb tails (max 0.1)
```

### If the audio sounds muffled or dull after processing

The EQ cuts or low-pass may be too aggressive:
```bash
LOWPASS_FREQ=14000         # let more treble back in
METAL_EQ_BAND1_GAIN=-3    # lighten the EQ cuts
METAL_EQ_BAND2_GAIN=-2
```

### If processing introduces new artifacts (warbling, pumping)

Reduce aggressiveness:
```bash
DENOISE_LEVEL=15
DEREVERB_STRENGTH=0.0005
METAL_EQ_BAND1_GAIN=-3
```

### General advice

- Change **one parameter at a time** and listen to the result
- Start with the defaults and adjust from there
- The **metallic resonance EQ** (stage 3) has the biggest impact on the tinny/hissing sound
- The **FFT denoise** (stage 2) targets the steady background hiss
- Heavy processing always trades off against audio naturalness

## File Structure

```
├── process.sh          # Main processing script
├── config.env          # Tunable parameters
├── input/              # Place source video here (git-ignored)
├── output/             # Cleaned video appears here (git-ignored)
└── README.md           # This file
```

## Notes

- The ~2GB source video is **not stored in git** — it stays local in `input/`
- Only scripts and configuration are version-controlled
- Video stream is copied without re-encoding (no quality loss, fast processing)
- Audio is re-encoded as AAC at 192kbps (configurable in config.env)
