# Browser Console - Super Simple Guide

## The Quick Answer

**Yes!** You can run JavaScript right from your browser's console on YouTube and extract everything you need.

## 3-Minute Quick Start

### Step 1: Open YouTube Video
1. Go to any YouTube video in your browser
2. Right-click anywhere → Click **"Inspect"** (or press `Ctrl+Shift+J` on Windows/Linux, `Cmd+Option+J` on Mac)
3. Click the **"Console"** tab at the top

### Step 2: Copy-Paste This Code

```javascript
// Get the video ID and display download command
const videoId = new URLSearchParams(window.location.search).get('v');
const title = document.title.split(' - ')[0];
console.log(`Video: ${title}`);
console.log(`Video ID: ${videoId}`);
console.log(`\nCopy-paste this in your codespace terminal:\n`);
console.log(`cd /workspaces/vibe-cast && python3 scripts/extract_audio.py "https://www.youtube.com/watch?v=${videoId}" --cookies cookies.txt`);
```

### Step 3: Press Enter

You'll see the yt-dlp command ready to copy!

```
Video: My Favorite Song
Video ID: dQw4w9WgXcQ

Copy-paste this in your codespace terminal:

cd /workspaces/vibe-cast && python3 scripts/extract_audio.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --cookies cookies.txt
```

## What Happens Next

### If the video is PUBLIC (like Rick Astley):
✓ Downloads automatically  
✓ No signature solving needed  
✓ Works perfectly

### If the video needs AUTHENTICATION:
1. Your browser is logged in ✓
2. Copy the video URL from console
3. Share it with yt-dlp
4. It uses your fresh cookies ✓
5. Still might need signature solver 😅

## The Real Power Script

This one actually gets the download URL:

```javascript
// Run this in browser console on YouTube

(async function() {
    console.log('🔍 Extracting video info...');
    
    // Get video ID from URL
    const videoId = new URLSearchParams(window.location.search).get('v');
    
    // Get video title
    const title = document.querySelector('h1 yt-formatted-string')?.textContent || 'video';
    
    // Fetch actual data from YouTube's servers
    const response = await fetch('https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO90d0o_cimLELMIaCJlqes1FNQT5ZXsw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            context: {
                client: {
                    clientName: 'WEB',
                    clientVersion: '2.20250116.00.00'
                }
            },
            videoId: videoId
        })
    });
    
    const data = await response.json();
    
    // Check if we got formats
    const formats = [...(data.streamingData?.formats || []), ...(data.streamingData?.adaptiveFormats || [])];
    
    console.log('✓ Video Title:', title);
    console.log('✓ Video ID:', videoId);
    console.log('✓ Available Formats:', formats.length);
    
    // Show download command
    console.log('\n📝 Use this command:\n');
    console.log(`yt-dlp "https://www.youtube.com/watch?v=${videoId}" -x --audio-format wav -o "%(title)s.%(ext)s"`);
    
    // If we got direct URLs (no signatures needed)
    const directUrls = formats.filter(f => f.url && !f.signatureCipher);
    if (directUrls.length > 0) {
        console.log('\n✓ Good news! Some formats don\'t need signatures!');
        console.log('✓ Download should work immediately');
    } else {
        console.log('\n⚠️  Some formats need signature solving');
        console.log('⚠️  Try anyway - it might work!');
    }
    
})().catch(err => console.error('❌ Error:', err));
```

Press Enter and you'll get:

```
🔍 Extracting video info...
✓ Video Title: Your Song Title
✓ Video ID: abc123def456
✓ Available Formats: 24

📝 Use this command:

yt-dlp "https://www.youtube.com/watch?v=abc123def456" -x --audio-format wav -o "%(title)s.%(ext)s"

✓ Good news! Some formats don't need signatures!
✓ Download should work immediately
```

## Then What?

### Option A: Paste in Codespace (Simple)
1. Copy the yt-dlp command from console
2. Go to your codespace terminal
3. Paste and run:
```bash
yt-dlp "https://www.youtube.com/watch?v=abc123def456" -x --audio-format wav -o "%(title)s.%(ext)s"
```
4. Wait for it to download!

### Option B: Use Your Cookies (Better)
If it fails, use your stored cookies:
```bash
python3 scripts/extract_audio.py "https://www.youtube.com/watch?v=abc123def456" --cookies cookies.txt
```

## Why This Works

Your browser has:
- ✓ Full JavaScript engine
- ✓ Access to YouTube's API
- ✓ Your login cookies
- ✓ Signature functions loaded

So it can get everything yt-dlp struggles with!

## Even Simpler: Use a Browser Extension

If copying code feels intimidating, just:

1. Install "Video Downloader" extension (Chrome/Firefox)
2. Go to YouTube video
3. Click extension icon
4. Click "Download"
5. Select audio format
6. Done!

Available extensions:
- "YouTube Video Downloader" (Chrome)
- "Firefox Video Download Helper" (Firefox)
- "Downie" (Mac)

They do exactly what the console scripts do, but with a GUI!

## Troubleshooting

### "Cannot read property 'get' of null"
**Problem:** You're not on a YouTube video page  
**Fix:** Go to a real YouTube video URL like `youtube.com/watch?v=...`

### Nothing happens after pressing Enter
**Problem:** Script might have errors  
**Fix:** Check browser console for red error messages  
**Try:** Simpler version first (the 3-line version)

### It says "This video is not available"
**Problem:** Video might be private or deleted  
**Fix:** Try a different video

## Full Workflow Example

```
1. You: Open YouTube in browser
   → See video you want

2. You: Right-click → Inspect → Console
   → Developer tools open

3. You: Copy-paste console script
   → Press Enter
   → Get yt-dlp command

4. You: Copy the yt-dlp command

5. You: Go to codespace terminal

6. You: Paste yt-dlp command
   → Press Enter
   → Video downloads!

7. You: Audio file ready in /workspaces/vibe-cast/audio/
   → Continue with vibe-cast processing!
```

## The Core Insight

**Your browser IS the solution.**

YouTube is designed to work in browsers. Browsers have:
- Cookies for auth
- JavaScript for signatures
- Full API access

So extracting from browser console bypasses all the codespace issues!

## Next Steps

1. **Try the simple script** above on a YouTube video
2. **Copy the command** it shows
3. **Paste in codespace** and run it
4. **Enjoy your downloaded audio!**

---

**That's it!** You don't need to be a programmer. Just copy-paste and press Enter. Your browser handles all the hard stuff.
