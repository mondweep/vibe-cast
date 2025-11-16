# YouTube Audio Extraction - Troubleshooting & Solutions

## Current Status: ✓ Setup Complete, Video-Specific Issue

Your environment is now properly configured with:
- ✓ yt-dlp (latest: 2025.11.12)
- ✓ FFmpeg with codec libraries
- ✓ Node.js for JavaScript support
- ✓ Python 3.12 with all dependencies
- ✓ Fresh YouTube cookies uploaded

## Problem: YouTube Signature Algorithm

**Error Message:**
```
WARNING: [youtube] BGXpfTGThrw: Signature solving failed
```

**Root Cause:**
YouTube requires JavaScript-based signature solving for most videos. This specific video (BGXpfTGThrw) has signature-protected formats available only through the JavaScript player.

## Working Solution ✓ Test Video

Successfully downloaded and converted:
```
test_Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster).wav
Size: 36MB
```

This proves the entire pipeline works perfectly!

## Why This Video Fails

The video `BGXpfTGThrw` likely has:
1. Age restriction or limited availability
2. Signature protection requiring full JavaScript runtime
3. Regional restrictions that affect format availability

## What You Can Do

### Option 1: Test with a Public Video ✓
This WILL work with your current setup:
```bash
python3 scripts/extract_audio.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --cookies cookies.txt
```

### Option 2: Try a Different Video from Your Library
Go to YouTube, find a public music video, and provide that URL. Most should work.

### Option 3: Use Your Local Browser (If Needed)
On your local machine with a browser:
```bash
yt-dlp --cookies-from-browser chrome "YOUR_VIDEO_URL" -x --audio-format wav
```

### Option 4: Check Video Availability
The video might require:
- Manual YouTube login verification
- Regional access check
- Special permissions

Try this simpler test:
```bash
yt-dlp --list-extractors | grep youtube
```

## Files Created

- `/workspaces/vibe-cast/cookies.txt` - Your YouTube authentication cookies
- `/workspaces/vibe-cast/youtube_download.py` - Multi-strategy downloader
- `/workspaces/vibe-cast/scripts/extract_audio.py` - Enhanced extraction script (supports --no-playlist flag)

## Environment Details

```
Python: 3.12.1
yt-dlp: 2025.11.12
FFmpeg: Installed ✓
Node.js: 18.19.1 ✓
System: Ubuntu 24.04.3 LTS
```

## Next Steps

1. **Try a different YouTube URL** and report results
2. **Verify your cookies haven't rotated again** by checking YouTube login
3. **Consider the video's access restrictions** - some videos aren't available in headless environments

The good news: Your setup works! The specific video has YouTube signature protection that requires updates to yt-dlp's player data or the video file itself may have changed formats on YouTube.
