#!/usr/bin/env bash
# =============================================================================
# Music Video Noise Removal Pipeline
# =============================================================================
# Multi-stage audio cleanup for live performance phone recordings
# Targets: metallic hiss from hall reflections, background hiss, reverb
#
# Usage:  ./process.sh              (uses config.env defaults)
#         ./process.sh my-video.mp4 (override input filename)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

# --- Load configuration -----------------------------------------------------
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: config.env not found at $CONFIG_FILE"
    echo "Copy config.env.example to config.env and adjust settings."
    exit 1
fi
source "$CONFIG_FILE"

# Allow overriding input filename via command-line argument
if [[ $# -ge 1 ]]; then
    INPUT_FILENAME="$1"
fi

INPUT_PATH="${SCRIPT_DIR}/input/${INPUT_FILENAME}"
OUTPUT_PATH="${SCRIPT_DIR}/output/${OUTPUT_FILENAME}"
TMP_DIR="${SCRIPT_DIR}/tmp"

# --- Preflight checks -------------------------------------------------------
echo "============================================="
echo " Music Video Noise Removal Pipeline"
echo "============================================="
echo ""

# Check ffmpeg is installed
if ! command -v ffmpeg &>/dev/null; then
    echo "ERROR: ffmpeg is not installed."
    echo ""
    echo "Install it:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: https://ffmpeg.org/download.html"
    exit 1
fi

# Check input file exists
if [[ ! -f "$INPUT_PATH" ]]; then
    echo "ERROR: Input file not found: $INPUT_PATH"
    echo ""
    echo "Place your video file in the input/ directory and set INPUT_FILENAME"
    echo "in config.env, or pass it as an argument:  ./process.sh filename.mp4"
    exit 1
fi

# Get input file size for display
INPUT_SIZE=$(du -h "$INPUT_PATH" | cut -f1)
echo "Input:   $INPUT_PATH ($INPUT_SIZE)"
echo "Output:  $OUTPUT_PATH"
echo ""

# Create working directories
mkdir -p "$TMP_DIR" "$(dirname "$OUTPUT_PATH")"

# --- Probe input file --------------------------------------------------------
echo "[0/7] Analyzing input file..."
AUDIO_INFO=$(ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$INPUT_PATH" 2>/dev/null || true)
VIDEO_INFO=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$INPUT_PATH" 2>/dev/null || true)
DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$INPUT_PATH" 2>/dev/null || echo "unknown")

echo "  Video:    $VIDEO_INFO"
echo "  Audio:    $AUDIO_INFO"
echo "  Duration: ${DURATION}s"
echo ""

# --- Stage 1: Extract audio --------------------------------------------------
echo "[1/7] Extracting audio track..."
EXTRACTED_AUDIO="${TMP_DIR}/extracted.wav"
ffmpeg -y -i "$INPUT_PATH" -vn -acodec pcm_s16le -ar 48000 -ac 2 "$EXTRACTED_AUDIO" \
    -loglevel warning -stats
echo "  Done. Extracted to WAV (48kHz, 16-bit, stereo)"
echo ""

# --- Stage 2: High-pass / Low-pass filter ------------------------------------
echo "[2/7] Applying frequency band filter (${HIGHPASS_FREQ}Hz - ${LOWPASS_FREQ}Hz)..."
FILTERED_AUDIO="${TMP_DIR}/filtered.wav"
ffmpeg -y -i "$EXTRACTED_AUDIO" \
    -af "highpass=f=${HIGHPASS_FREQ}:p=2,lowpass=f=${LOWPASS_FREQ}:p=2" \
    -acodec pcm_s16le "$FILTERED_AUDIO" \
    -loglevel warning -stats
echo "  Done. Removed sub-${HIGHPASS_FREQ}Hz rumble and above-${LOWPASS_FREQ}Hz hiss."
echo ""

# --- Stage 3: FFT Denoise ----------------------------------------------------
echo "[3/7] Applying FFT-based noise reduction (${DENOISE_LEVEL}dB, type=${NOISE_TYPE})..."
DENOISED_AUDIO="${TMP_DIR}/denoised.wav"
ffmpeg -y -i "$FILTERED_AUDIO" \
    -af "afftdn=nr=${DENOISE_LEVEL}:nt=${NOISE_TYPE}" \
    -acodec pcm_s16le "$DENOISED_AUDIO" \
    -loglevel warning -stats
echo "  Done. Steady-state noise reduced."
echo ""

# --- Stage 4: Metallic resonance EQ ------------------------------------------
echo "[4/7] Cutting metallic resonance frequencies..."
echo "       Band 1: ${METAL_EQ_BAND1_FREQ}Hz (${METAL_EQ_BAND1_GAIN}dB, Q=${METAL_EQ_BAND1_Q})"
echo "       Band 2: ${METAL_EQ_BAND2_FREQ}Hz (${METAL_EQ_BAND2_GAIN}dB, Q=${METAL_EQ_BAND2_Q})"
echo "       Band 3: ${METAL_EQ_BAND3_FREQ}Hz (${METAL_EQ_BAND3_GAIN}dB, Q=${METAL_EQ_BAND3_Q})"
EQ_AUDIO="${TMP_DIR}/eq.wav"
ffmpeg -y -i "$DENOISED_AUDIO" \
    -af "equalizer=f=${METAL_EQ_BAND1_FREQ}:width_type=q:w=${METAL_EQ_BAND1_Q}:g=${METAL_EQ_BAND1_GAIN},equalizer=f=${METAL_EQ_BAND2_FREQ}:width_type=q:w=${METAL_EQ_BAND2_Q}:g=${METAL_EQ_BAND2_GAIN},equalizer=f=${METAL_EQ_BAND3_FREQ}:width_type=q:w=${METAL_EQ_BAND3_Q}:g=${METAL_EQ_BAND3_GAIN}" \
    -acodec pcm_s16le "$EQ_AUDIO" \
    -loglevel warning -stats
echo "  Done. Metallic harshness reduced."
echo ""

# --- Stage 5: Dereverberation ------------------------------------------------
echo "[5/7] Reducing hall reverb/echo (strength=${DEREVERB_STRENGTH}, patch=${DEREVERB_PATCH})..."
DEREVERBED_AUDIO="${TMP_DIR}/dereverbed.wav"
ffmpeg -y -i "$EQ_AUDIO" \
    -af "anlmdn=s=${DEREVERB_STRENGTH}:p=${DEREVERB_PATCH}:m=15" \
    -acodec pcm_s16le "$DEREVERBED_AUDIO" \
    -loglevel warning -stats
echo "  Done. Reverb tails suppressed."
echo ""

# --- Stage 6: Dynamic compression --------------------------------------------
echo "[6/7] Applying dynamic compression (threshold=${COMP_THRESHOLD}dB, ratio=${COMP_RATIO}:1)..."
COMPRESSED_AUDIO="${TMP_DIR}/compressed.wav"
ffmpeg -y -i "$DEREVERBED_AUDIO" \
    -af "acompressor=threshold=${COMP_THRESHOLD}dB:ratio=${COMP_RATIO}:attack=${COMP_ATTACK}:release=${COMP_RELEASE}:makeup=2" \
    -acodec pcm_s16le "$COMPRESSED_AUDIO" \
    -loglevel warning -stats
echo "  Done. Dynamics evened out."
echo ""

# --- Stage 7: Recombine and normalize ----------------------------------------
echo "[7/7] Normalizing loudness and recombining with video..."
ffmpeg -y -i "$INPUT_PATH" -i "$COMPRESSED_AUDIO" \
    -c:v ${VIDEO_CODEC} \
    -c:a ${AUDIO_CODEC} -b:a ${AUDIO_BITRATE} \
    -map 0:v:0 -map 1:a:0 \
    -af "loudnorm=I=${TARGET_LOUDNESS}:TP=${TRUE_PEAK}:LRA=11" \
    -movflags +faststart \
    "$OUTPUT_PATH" \
    -loglevel warning -stats
echo "  Done."
echo ""

# --- Cleanup temporary files -------------------------------------------------
echo "Cleaning up temporary files..."
rm -rf "$TMP_DIR"

# --- Summary -----------------------------------------------------------------
OUTPUT_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
echo ""
echo "============================================="
echo " Processing complete!"
echo "============================================="
echo ""
echo "  Output: $OUTPUT_PATH ($OUTPUT_SIZE)"
echo ""
echo "  Stages applied:"
echo "    1. Frequency band filter (${HIGHPASS_FREQ}Hz - ${LOWPASS_FREQ}Hz)"
echo "    2. FFT denoise (${DENOISE_LEVEL}dB reduction)"
echo "    3. Metallic resonance EQ (${METAL_EQ_BAND1_FREQ}/${METAL_EQ_BAND2_FREQ}/${METAL_EQ_BAND3_FREQ}Hz)"
echo "    4. Dereverberation (strength ${DEREVERB_STRENGTH}, patch ${DEREVERB_PATCH})"
echo "    5. Dynamic compression (${COMP_RATIO}:1 ratio)"
echo "    6. Loudness normalization (${TARGET_LOUDNESS} LUFS)"
echo ""
echo "  Not happy with the result? Edit config.env and re-run."
echo "  See README.md for a tuning guide."
echo "============================================="
