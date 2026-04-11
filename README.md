# Music Video Noise Removal

Audio cleanup pipeline for live performance phone recordings. Reduces hall echo/reverb, background noise, and phone microphone artifacts using FFmpeg.

## Problem

A live orchestra/singing performance recorded on a phone in a hall picks up:
- Hall reverb and echo (sound bouncing off walls/ceiling)
- Background crowd noise and ambient sounds
- Phone mic distortion (clipping, limited dynamic range)

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

The script applies 5 stages sequentially:

| Stage | Filter | What it does |
|-------|--------|-------------|
| 1 | High-pass / Low-pass | Removes low rumble and high-frequency hiss |
| 2 | FFT Denoise (`afftdn`) | Reduces steady background noise (hum, murmur) |
| 3 | Dereverberation (`anlmdn`) | Suppresses hall echo and reverb tails |
| 4 | Dynamic Compression | Evens out loud/quiet passages |
| 5 | Loudness Normalization | Brings output to standard broadcast loudness |

The original video is copied without re-encoding (fast, lossless). Only the audio is processed.

## Tuning Guide

All parameters are in `config.env`. Edit values and re-run `./process.sh`.

### If you still hear echo/reverb

Increase dereverberation strength:
```bash
# In config.env — try progressively stronger values
DEREVERB_STRENGTH=0.005    # moderate
DEREVERB_STRENGTH=0.01     # strong
DEREVERB_STRENGTH=0.05     # very aggressive (may affect music quality)
```

For a large hall, also increase the patch size:
```bash
DEREVERB_PATCH_MS=2000     # catches longer reverb tails
```

### If background noise persists

Increase FFT denoise level:
```bash
DENOISE_LEVEL=18           # moderate-heavy
DENOISE_LEVEL=25           # heavy (may introduce artifacts)
```

### If vocals are drowned out by orchestra

Lower the compression threshold to catch more of the dynamic range:
```bash
COMP_THRESHOLD=-25
COMP_RATIO=4
```

### If the audio sounds muffled or dull

Widen the frequency band:
```bash
HIGHPASS_FREQ=60           # let more bass through
LOWPASS_FREQ=18000         # let more treble through
```

### If there are processing artifacts (metallic sound, warbling)

Reduce the aggressiveness of each stage:
```bash
DENOISE_LEVEL=8
DEREVERB_STRENGTH=0.0005
```

### General advice

- Change **one parameter at a time** and listen to the result
- Start with the defaults and adjust from there
- The dereverberation stage has the biggest impact on hall echo
- Heavy noise reduction will always trade off against audio naturalness

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
