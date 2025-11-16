#!/bin/bash
# Quick YouTube audio downloader with cookie management

VIDEO_URL="${1:-}"
COOKIES_FILE="cookies.txt"
OUTPUT_DIR="./audio"

if [ -z "$VIDEO_URL" ]; then
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║         YouTube Audio Extractor - Quick Start                  ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  ./download_audio.sh <YouTube_URL>

EXAMPLES:
  # Download a video
  ./download_audio.sh "https://www.youtube.com/watch?v=..."

  # Download from playlist (first video only)
  ./download_audio.sh "https://www.youtube.com/watch?v=...&list=..."

COOKIE MANAGEMENT:
  1. Refresh cookies if download fails
  2. Go to YouTube.com in your local browser
  3. Install "Cookie-Editor" browser extension
  4. Export cookies to cookies.txt
  5. Upload cookies.txt to codespace

TROUBLESHOOTING:
  - If you get "Sign in to confirm you're not a bot"
    → Your cookies have expired
    → Refresh them from your browser
  
  - If download fails but cookies are fresh
    → The video might have signature protection
    → Try a different YouTube video
    → Check if video is region-restricted

SUPPORTED VIDEO TYPES:
  ✓ Public music videos
  ✓ Public lectures  
  ✓ Public tutorials
  ✓ Unlisted videos (with URL)
  ✗ Private videos (requires login)
  ✗ Age-restricted videos (may need special handling)

EOF
    exit 0
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         YouTube Audio Extractor                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📹 URL: $VIDEO_URL"
echo "🍪 Cookies: $COOKIES_FILE"
echo "📁 Output: $OUTPUT_DIR"
echo ""

# Check if cookies file exists
if [ ! -f "$COOKIES_FILE" ]; then
    echo "⚠️  WARNING: cookies.txt not found!"
    echo "   Try downloading without cookies (public videos only)"
    echo ""
    COOKIES_ARG=""
else
    COOKIES_ARG="--cookies $COOKIES_FILE"
    echo "✓ Cookies file found"
fi

echo ""
echo "⏳ Starting download..."
echo ""

# Execute download
python3 scripts/extract_audio.py "$VIDEO_URL" $COOKIES_ARG --no-playlist

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Download completed!"
    echo ""
    ls -lh "$OUTPUT_DIR" | tail -3
else
    echo "❌ Download failed (exit code: $EXIT_CODE)"
    echo ""
    echo "Next steps:"
    echo "1. Check your cookies are fresh (refresh from browser)"
    echo "2. Try with a different video URL"
    echo "3. Check the video isn't age-restricted or private"
fi

exit $EXIT_CODE
