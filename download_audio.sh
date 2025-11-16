#!/bin/bash
# YouTube Audio Extraction with Cookie Management

# Script to refresh YouTube cookies from browser and extract audio

set -e

VIDEO_URL="$1"
OUTPUT_DIR="./audio"

if [ -z "$VIDEO_URL" ]; then
    echo "Usage: $0 <YouTube_URL>"
    echo "Example: $0 'https://www.youtube.com/watch?v=BGXpfTGThrw'"
    exit 1
fi

echo "================================"
echo "YouTube Audio Extractor"
echo "================================"
echo ""

# Check if cookies file exists and is recent
if [ -f "cookies.txt" ]; then
    COOKIE_AGE=$(($(date +%s) - $(stat -f%m cookies.txt 2>/dev/null || stat -c%Y cookies.txt)))
    if [ $COOKIE_AGE -gt 86400 ]; then
        echo "⚠️  Cookies file is older than 24 hours (${COOKIE_AGE}s)"
        echo "Consider refreshing cookies from your browser"
        echo ""
    fi
fi

echo "Attempting to download audio from:"
echo "$VIDEO_URL"
echo ""

# Try with multiple methods in order of preference

echo "Method 1: Trying with stored cookies..."
if yt-dlp --cookies cookies.txt -f "worstvideo[ext=mp4]+bestaudio[ext=m4a]/best" \
    "$VIDEO_URL" -x --audio-format wav -o "$OUTPUT_DIR/%(title)s.%(ext)s" 2>&1 | grep -q "100%"; then
    echo "✓ Successfully downloaded with stored cookies!"
    exit 0
fi

echo ""
echo "Method 2: Trying without authentication (public videos only)..."
if yt-dlp -f "worstvideo[ext=mp4]+bestaudio[ext=m4a]/best" \
    "$VIDEO_URL" -x --audio-format wav -o "$OUTPUT_DIR/%(title)s.%(ext)s" 2>&1 | grep -q "100%"; then
    echo "✓ Successfully downloaded without authentication!"
    exit 0
fi

echo ""
echo "❌ Download failed. The video may require authentication."
echo ""
echo "SOLUTION:"
echo "=========="
echo "Your stored cookies may have expired. To refresh them:"
echo ""
echo "Option A: Export from local browser and upload here"
echo "  1. Install 'cookies.txt export' extension in your browser"
echo "  2. Go to YouTube.com and open the extension"
echo "  3. Export and save cookies.txt"
echo "  4. Upload to /workspaces/vibe-cast/cookies.txt"
echo ""
echo "Option B: If running locally (not codespace):"
echo "  yt-dlp --cookies-from-browser chrome <URL>"
echo ""
exit 1
